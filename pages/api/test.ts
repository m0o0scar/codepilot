import { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

const parser = new Parser();
parser.setLanguage(JavaScript);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sourceCode = 'let x = 1; console.log(x);';
  const tree = parser.parse(sourceCode);
  res.status(200).send(tree.rootNode.toString());
}
