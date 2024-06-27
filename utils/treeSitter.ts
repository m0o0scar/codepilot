import Parser, { Point, SyntaxNode } from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';

const TypeScript = require('tree-sitter-typescript').typescript; // TypeScript grammar
const TSX = require('tree-sitter-typescript').tsx; // TSX grammar

export type SupportedLanguage = 'js' | 'ts' | 'tsx';

const languageParsers: Record<SupportedLanguage, any> = {
  js: JavaScript,
  ts: TypeScript,
  tsx: TSX,
};

const jsFunctionTypes = [
  'arrow_function',
  'function_expression',
  'function_declaration',
  'generator_function_expression',
  'generator_function_declaration',
];

const languageFunctionTypes: Record<SupportedLanguage, string[]> = {
  js: jsFunctionTypes,
  ts: jsFunctionTypes,
  tsx: jsFunctionTypes,
};

export const processSourceCode = (source: string, lang: SupportedLanguage = 'js') => {
  const language = languageParsers[lang];
  if (!language) throw new Error(`Unsupported language: ${lang}`);

  // parse source code into AST
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);

  const functionTypes = languageFunctionTypes[lang];
  const functionRanges: [number, number][] = [];
  const walk = (node: SyntaxNode) => {
    // if this is a function node
    if (functionTypes.includes(node.type)) {
      // get its body range
      const body = node.childForFieldName('body');
      if (body) functionRanges.push([body.startIndex, body.endIndex]);
    }

    // loop through child nodes
    for (const child of node.children) {
      if (child.children.length > 0) {
        walk(child);
      }
    }
  };
  walk(tree.rootNode);

  let result = source;

  // start removing function implementation from the back,
  // so that text content change won't affects the ranges index in the front.
  for (let i = functionRanges.length - 1; i >= 0; i--) {
    const [start, end] = functionRanges[i];
    const head = result.substring(0, start);
    const tail = result.substring(end);

    // get body part, replace all non-newline characters with space
    let body = result.substring(start, end).replaceAll(/[^\n]/g, ' ');

    // replace single line function with "..."
    // we need to preserve the number of lines here because we want to keep the correct line number
    const lines = body.split('\n');
    if (lines.length === 1) body = '...';
    else body = `...${'\n'.repeat(lines.length - 1)}`;

    result = `${head}${body}${tail}`;
  }

  return result;
};
