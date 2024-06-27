import { last } from 'lodash';
// @ts-ignore
import prettyTree from 'pretty-file-tree';

import { BlobWriter, Entry } from '@zip.js/zip.js';

export const includeFileExts = [
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
      const raw = new TextDecoder().decode(await blob.arrayBuffer());

      // calculate the number of lines
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      totalNumberOfLines += lines.length;

      // TODO remove function implementation
      // TODO add line numbers to the source code
      const text = raw;

      // get file ext name and full file path
      const ext = last(e.filename.split('.')) || '';
      const filename = processFileName ? await processFileName(e.filename) : e.filename;

      // create a code block
      const block = `${filename}:\n\n\`\`\`${ext}\n${text}\n\`\`\``;

      return { filename, block, text };
    }),
  );

  // create directory tree
  const filePaths = contents.map((e) => e.filename);
  const tree = prettyTree(filePaths);

  // combine all source code
  const combinedSourceCode = contents.map(({ block }) => block).join('\n\n');

  return {
    tree,
    contents,
    combinedSourceCode,
    totalNumberOfLines,
  };
};
