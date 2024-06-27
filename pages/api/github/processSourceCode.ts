import { NextApiRequest, NextApiResponse } from 'next';

import { processSourceCode, SupportedLanguage } from '@utils/treeSitter';

export interface ProcessSourceCodeRequestBody {
  files: {
    ext: string;
    filename: string;
    text: string;
  }[];
}

export interface ProcessSourceCodeResponse {
  result: { filename: string; processed: string }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // get json from request body
  const { files } = JSON.parse(req.body) as ProcessSourceCodeRequestBody;

  const result = files.map(({ ext, text, filename }) => {
    let language = ext;
    switch (ext) {
      case 'mjs':
        language = 'js';
    }

    try {
      const processed = processSourceCode(text, language as SupportedLanguage);
      return { filename, processed };
    } catch (error) {
      return { filename, processed: text };
    }
  });

  res.status(200).json({ result } as ProcessSourceCodeResponse);
}
