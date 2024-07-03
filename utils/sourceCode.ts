import { last } from 'lodash';
// @ts-ignore
import prettyTree from 'pretty-file-tree';

import { BlobWriter, Entry } from '@zip.js/zip.js';

export const includeFilePattern = new RegExp(
  [
    /\.md$/,

    // web
    /\.(js|mjs|jsx|ts|tsx|html|json)$/,

    // python
    /\.py$/,
  ]
    .map((regex) => regex.source)
    .join('|'),
  'i',
);

export const excludeFilePattern = new RegExp(
  [
    // any file or folder that starts with .
    /\/\./,

    // common non-source files / folders
    /\.bak$/,
    /\/.*?test\//,
    /\/.*?tests\//,
    /\/__test__\//,
    /\/__tests__\//,
    /\/jest\//,
    /\/examples\//,
    /\/benchmark\//,
    /\/node_modules\//,
    /\/build\//,
    /\/dist\//,
    /\/bin\//,

    // web
    /package-lock\.json$/,
    /\.eslintrc\.json$/,
    /\.min\.js$/,
    /\.test\.js$/,
    /\.test\.ts$/,

    // python
    /\.lock$/,
  ]
    .map((regex) => regex.source)
    .join('|'),
  'i',
);

const removeBase64Images = (content: string) => {
  return content.replaceAll(/(["'`])data:image\/.*;base64,.*(["'`])/g, '$1data:image...$2');
};

const removeSvgs = (content: string) => {
  return content.replaceAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gim, '<svg>...</svg>');
};

const seq = (input: string, processors: ((input: string) => string)[]) => {
  let output = input;
  for (const processor of processors) {
    output = processor(output);
  }
  return output;
};

const processSourceCodeContent = (content: string, ext: string) => {
  if (['js', 'mjs', 'jsx', 'ts', 'tsx', 'html'].includes(ext)) {
    return seq(content, [removeBase64Images, removeSvgs]);
  }
  return content;
};

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
      // get file ext name and full file path
      const ext = last(e.filename.split('.')) || '';
      const filename = processFileName ? await processFileName(e.filename) : e.filename;

      // read file content
      const blob = await e.getData!(new BlobWriter());
      let text = new TextDecoder().decode(await blob.arrayBuffer());

      // process file content based on their type
      text = processSourceCodeContent(text, ext);

      // calculate the number of lines
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      totalNumberOfLines += lines.length;

      return { ext, filename, text };
    }),
  );

  // create directory tree
  const filePaths = contents.map((e) => e.filename);
  const tree = prettyTree(filePaths);

  // combine all source code
  const combinedSourceCode = contents
    .map(({ ext, filename, text }) => `${filename}:\n\n\`\`\`${ext}\n${text}\n\`\`\``)
    .join('\n\n');

  return {
    tree,
    contents,
    combinedSourceCode,
    totalNumberOfLines,
  };
};
