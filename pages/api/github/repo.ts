import { last } from 'lodash';
// @ts-ignore
import prettyTree from 'pretty-file-tree';

import { GithubRepoInfo } from '@components/github/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchWithProgress } from '@utils/fetch';
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';

import type { NextRequest } from 'next/server';
export const config = {
  runtime: 'edge',
};

export type ResponseChunk =
  | { info?: GithubRepoInfo; error?: string }
  | { zipLoaded: number }
  | { tree: string; content: string; lines: number; tokens: number };

const includeFileExts = [
  // common files like documents or configs etc
  'md',
  'json',
  'yaml',
  'toml',

  // web
  'js',
  'mjs',
  'jsx',
  'ts',
  'tsx',
  'html',

  // python
  'py',

  // Rust
  'rs',

  // Flutter
  'dart',
];

const excludeFilePattern = new RegExp(
  [
    // any file or folder that starts with .
    /\/\./,

    // common files / folders
    /\.bak$/,

    // test folder
    /\/tests\//,

    // web
    /package-lock\.json$/,
    /\.eslintrc\.json$/,
    /\.min\.js$/,
    /\/build\//,
    /\/dist\//,

    // python
    /\.lock$/,
  ]
    .map((regex) => regex.source)
    .join('|'),
);

export default async function handler(request: NextRequest) {
  // get github token from header
  const githubClientID = request.headers.get('x-github-client-id');
  const githubClientSecret = request.headers.get('x-github-client-secret');
  const geminiToken = request.headers.get('x-gemini-token');
  if (!githubClientID || !githubClientSecret)
    return new Response('github credential is required', { status: 400 });
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

      // get repo info like default branch, etc.
      const infoResponse = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: {
          Authorization: `Basic ${btoa(`${githubClientID}:${githubClientSecret}`)}`,
        },
      });
      if (infoResponse.status !== 200) {
        sendError(`Failed to fetch repo info: ${await infoResponse.text()}`);
        return;
      }
      const info = (await infoResponse.json()) as GithubRepoInfo;
      sendChunk({ info });

      // use the branch name if provided from url,
      // otherwise use the default branch from fetched repo info.
      const branch = _branch || info.default_branch;

      // if path is given in url, then later after zip file is unzipped, keep only those files that start with the path
      const scope = _path.length ? `${info?.name}-${branch}/${path}` : null;

      // construct the url to download the zip file
      const zipUrl = `https://github.com/${info.full_name}/archive/refs/heads/${branch}.zip`;
      const blob = await fetchWithProgress(zipUrl, (zipLoaded) => sendChunk({ zipLoaded }));

      // unzip the file
      const reader = new BlobReader(blob);
      const zipReader = new ZipReader(reader);
      const entries = await zipReader.getEntries();

      // keep only source code files and markdowns
      const files = entries.filter((e) => {
        if (e.directory) return false;

        // include files with these extensions
        const ext = last(e.filename.split('.')) || '';
        if (!includeFileExts.includes(ext)) return false;

        // ignore these files:
        if (e.filename.match(excludeFilePattern)) return false;

        // ignore files that do not start with the scope
        if (scope && !e.filename.startsWith(scope)) return false;

        return true;
      });

      // read file contents
      let numberOfLines = 0;
      const contents = await Promise.all(
        files.map(async (e) => {
          // read file content
          const blob = await e.getData!(new BlobWriter());
          const text = new TextDecoder().decode(await blob.arrayBuffer());
          const rows = text.split('\n');

          // calculate the number of lines
          const lines = rows.map((l) => l.trim()).filter(Boolean);
          numberOfLines += lines.length;

          const lineNumberWidth = String(rows.length).length;
          const textWithLineNumbers = rows
            .map((line, i) => `${String(i + 1).padStart(lineNumberWidth)} ${line}`)
            .join('\n');

          // create a code block
          const ext = last(e.filename.split('.')) || '';
          const block = `${e.filename}:\n\n\`\`\`${ext}\n${textWithLineNumbers}\n\`\`\``;

          return { filename: e.filename, block };
        }),
      );

      // combine all source code
      const sourceCode = contents.map(({ block }) => block).join('\n\n');

      // prepare gemini model
      const genAI = new GoogleGenerativeAI(geminiToken);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // calculate token length and cost based on all combined source code
      let tokenLength = 0;
      try {
        const { totalTokens } = await model.countTokens(sourceCode);
        tokenLength = totalTokens;
      } catch (error) {
        sendError(`Failed to count tokens: ${String(error)}`);
        return;
      }

      // create directory tree
      const filePaths = contents.map((e) => e.filename);
      const tree = prettyTree(filePaths);

      // combine all source code
      const concatted = [
        `Project: ${info.full_name}`,
        `URL: ${url}`,
        `Source tree:\n\n\`\`\`\n${tree}\n\`\`\``,
        sourceCode,
      ]
        .filter(Boolean)
        .join('\n\n');

      sendChunk({ tree, content: concatted, lines: numberOfLines, tokens: tokenLength });
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
