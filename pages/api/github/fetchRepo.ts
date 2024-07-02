import { GithubRepoInfo, Language } from '@components/github/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GithubApiClient } from '@utils/githubAPI';
import { excludeFilePattern, includeFilePattern, readSourceFileContents } from '@utils/sourceCode';
import { unzip } from '@utils/zip';

import type { NextRequest } from 'next/server';
export const config = {
  runtime: 'edge',
};

export const SOURCE_SCHEMA_VERSION = 16;

export type ResponseChunk =
  | { error: string }
  | { info: GithubRepoInfo }
  | { zipLoaded: number }
  | { tree: string; content: string; lines: number; tokens: number; languages: Language[] };

export default async function handler(request: NextRequest) {
  // get github token from header
  const githubToken = request.headers.get('x-github-token') || undefined;
  const geminiToken = request.headers.get('x-gemini-token');
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

      // get repo info like default branch, laguages, etc.
      const githubClient = new GithubApiClient(owner, name, githubToken);
      try {
        await githubClient.fetchInfo();
        sendChunk({ info: githubClient.info! });

        await githubClient.fetchLanguages();
      } catch (error) {
        sendError(String(error));
        return;
      }

      // use the branch name if provided from url,
      // otherwise use the default branch from fetched repo info.
      const branch = _branch || githubClient.info!.default_branch;

      // if path is given in url, then later after zip file is unzipped, keep only those files that start with the path
      const scope = _path.length ? `${name}-${branch}/${path}` : undefined;

      // download the zip file
      const blob = await githubClient.downloadZip(branch, (zipLoaded) => sendChunk({ zipLoaded }));

      // unzip the file
      const files = await unzip(blob, { includeFilePattern, excludeFilePattern, scope });

      // read source code content
      const rootFolderNamePattern = new RegExp(`^${name}-${branch}\/`);
      const { tree, contents, totalNumberOfLines, combinedSourceCode } =
        await readSourceFileContents(files, {
          processFileName: async (filename) =>
            filename.replace(rootFolderNamePattern, `${owner}/${name}/blob/${branch}/`),
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
        `Project: ${owner}/${name}`,
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
        languages: githubClient.languages!,
      });
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
