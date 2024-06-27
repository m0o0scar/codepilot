import { last } from 'lodash';
// @ts-ignore
import prettyTree from 'pretty-file-tree';

import { ProcessSourceCodeResponse } from '@pages/api/github/processSourceCode';
import { BlobWriter, Entry } from '@zip.js/zip.js';

export const includeFileExts = [
  // common files like documents or configs etc
  // 'md',
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

export const excludeFilePattern = new RegExp(
  [
    // any file or folder that starts with .
    /\/\./,

    // common non-source files / folders
    /\.bak$/,
    /\/.*?test\//,
    /\/.*?tests\//,
    /\/examples\//,
    /\/benchmark\//,
    /\/node_modules\//,

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

export const readSourceFileContents = async (
  files: Entry[],
  options?: {
    // give caller an opportunity to change the file name
    processFileName?: (name: string) => Promise<string>;
  },
) => {
  const { processFileName } = options || {};

  let totalNumberOfLines = 0;

  const contents = await Promise.all(
    files.map(async (e) => {
      // read file content
      const blob = await e.getData!(new BlobWriter());
      const text = new TextDecoder().decode(await blob.arrayBuffer());

      // calculate the number of lines
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      totalNumberOfLines += lines.length;

      // get file ext name and full file path
      const ext = last(e.filename.split('.')) || '';
      const filename = processFileName ? await processFileName(e.filename) : e.filename;

      return { ext, filename, text };
    }),
  );

  const processed: ProcessSourceCodeResponse = await fetch(
    'http://localhost:3000/api/github/processSourceCode',
    {
      method: 'POST',
      body: JSON.stringify({
        files: contents,
      }),
    },
  ).then((res) => res.json());

  // create directory tree
  const filePaths = contents.map((e) => e.filename);
  const tree = prettyTree(filePaths);

  // combine all source code
  const combinedSourceCode = contents
    .map(
      ({ ext, filename }, i) =>
        `${filename}:\n\n\`\`\`${ext}\n${processed.result[i].processed}\n\`\`\``,
    )
    .join('\n\n');

  return {
    tree,
    contents,
    combinedSourceCode,
    totalNumberOfLines,
  };
};
