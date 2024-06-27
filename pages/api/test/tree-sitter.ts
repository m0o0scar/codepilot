import { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

import { processSourceCode } from '@utils/treeSitter';

const parser = new Parser();
parser.setLanguage(JavaScript);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sourceCode = `import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: NextRequest) {
  const url = new URL(request.url);
  const dest = decodeURIComponent(url.searchParams.get('dest') || '');

  if (!dest) return new Response('dest url is required', { status: 400 });

  return fetch(dest);
}
`;

  const processedSourceCode = processSourceCode(sourceCode, 'js');

  // output as table
  const lines1 = sourceCode.split('\n');
  const lines2 = processedSourceCode.split('\n');
  const tableRows = lines1.map(
    (l, i) => `<tr><td>${i}</td><td>${l}</td><td>${lines2[i]}</td></tr>`,
  );
  const table = `<table border style="border-collapse: collapse; font-family: monospace; white-space: pre-wrap">${tableRows.join('')}</table>`;

  res.status(200).send(table);
}
