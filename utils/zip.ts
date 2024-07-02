import { last } from 'lodash';

import { BlobReader, ZipReader } from '@zip.js/zip.js';

export const unzip = async (
  blob: Blob,
  options?: {
    // file extensions that you want to include in the unzipped files
    includeFilePattern?: RegExp;

    // file patterns that you want to exclude from the unzipped files
    excludeFilePattern?: RegExp;

    // include files with path starting with this string
    scope?: string;
  },
) => {
  const { includeFilePattern, excludeFilePattern, scope } = options || {};

  // unzip into entries
  const reader = new BlobReader(blob);
  const zipReader = new ZipReader(reader);
  const entries = await zipReader.getEntries();

  // filter entries
  const files = entries.filter((e) => {
    if (e.directory) return false;

    // ignore files NOT matching include pattern
    if (includeFilePattern && !e.filename.match(includeFilePattern)) return false;

    // ignore files matching exclude pattern
    if (excludeFilePattern && e.filename.match(excludeFilePattern)) return false;

    // ignore files that do not start with the scope
    if (scope && !e.filename.startsWith(scope)) return false;

    return true;
  });

  return files;
};
