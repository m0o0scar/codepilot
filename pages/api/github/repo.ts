import { GithubRepoInfo, Language } from '@components/github/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GithubApiClient } from '@utils/githubAPI';
import { excludeFilePattern, includeFileExts, readSourceFileContents } from '@utils/sourceCode';
import { unzip } from '@utils/zip';

import type { NextRequest } from 'next/server';
export const config = {
  runtime: 'edge',
};

export const SOURCE_SCHEMA_VERSION = 15;

export type ResponseChunk =
  | { error: string }
  | { info: GithubRepoInfo }
  | { zipLoaded: number }
  | { tree: string; content: string; lines: number; tokens: number; languages: Language[] };

export default async function handler(request: NextRequest) {
  // get github token from header
  const githubToken = request.headers.get('x-github-token');
  const geminiToken = request.headers.get('x-gemini-token');
  if (!githubToken) return new Response('github credential is required', { status: 400 });
  if (!geminiToken) return new Response('gemini credential is required', { status: 400 });

  // get url from query
  const { searchParams } = new URL(request.url);
  const url = decodeURIComponent(searchParams.get('url') || '');
  if (!url) return new Response('url is required', { status: 400 });
  if (!url.startsWith('https://github.com/'))
    return new Response('non-github url is not supported', { status: 400 });

  // parse url
  const [_, owner, name, _tree, _branch, ..._path] = new URL(url).pathname.split('/');
  const path = _path.join('/');

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendChunk = (data: ResponseChunk) => {
        const chunk = encoder.encode(JSON.stringify(data) + '\n\n');
        controller.enqueue(chunk);
      };

      const sendError = (error: any) => {
        sendChunk({ error: String(error) });
        controller.close();
      };

      const githubClient = new GithubApiClient(githubToken, owner, name);

      // get repo info like default branch, etc.
      const infoResponse = await githubClient.fetchInfo();
      if ('errorStatus' in infoResponse) {
        sendError(`Failed to fetch repo info: ${infoResponse.errorMessage}`);
        return;
      }
      const info = infoResponse.data;
      sendChunk({ info });

      // get repo languages
      const languagesResponse = await githubClient.fetchLanguages();
      if ('errorStatus' in languagesResponse) {
        sendError(`Failed to fetch languages: ${languagesResponse.errorMessage}`);
        return;
      }
      // calculate the percentage of each language
      const totalBytes = Object.values(languagesResponse.data).reduce((a, b) => a + b, 0);
      const languages: Language[] = Object.entries(languagesResponse.data)
        .map(([key, value]) => ({
          name: key,
          percentage: value / totalBytes,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // use the branch name if provided from url,
      // otherwise use the default branch from fetched repo info.
      const branch = _branch || info.default_branch;

      // if path is given in url, then later after zip file is unzipped, keep only those files that start with the path
      const scope = _path.length ? `${info?.name}-${branch}/${path}` : undefined;

      // download the zip file
      const blob = await githubClient.downloadZip(branch, (zipLoaded) => sendChunk({ zipLoaded }));

      // unzip the file
      const files = await unzip(blob, { includeFileExts, excludeFilePattern, scope });

      // read source code content
      const rootFolderNamePattern = new RegExp(`^${info.name}-${branch}\/`);
      const { tree, contents, totalNumberOfLines, combinedSourceCode } =
        await readSourceFileContents(files, {
          processFileName: async (name) =>
            name.replace(rootFolderNamePattern, `${info.full_name}/blob/${branch}/`),
        });

      // prepare gemini model
      const genAI = new GoogleGenerativeAI(geminiToken);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // calculate token length and cost based on all combined source code
      let tokenLength = 0;
      try {
        const { totalTokens } = await model.countTokens(combinedSourceCode);
        tokenLength = totalTokens;
      } catch (error) {
        sendError(`Failed to count tokens: ${String(error)}`);
        return;
      }

      // combine all source code
      const concatted = [
        `Project: ${info.full_name}`,
        `URL: ${url}`,
        `Source tree:\n\n\`\`\`\n${tree}\n\`\`\``,
        combinedSourceCode,
      ]
        .filter(Boolean)
        .join('\n\n');

      sendChunk({
        tree,
        content: concatted,
        lines: totalNumberOfLines,
        tokens: tokenLength,
        languages,
      });
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
