import { last } from 'lodash';
// @ts-ignore
import prettyTree from 'pretty-file-tree';
import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

import { LLMContext } from '@components/llm/LLMContext';
import { fetchWithProgress } from '@utils/fetch';
import { del, get, put } from '@utils/storage';
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';

import { GithubRepo, GithubRepoContent } from './types';

const SOURCE_SCHEMA_VERSION = 2;

export interface GithubRepoContextType {
  repo?: GithubRepo;
  setRepo: (source: string) => void;

  zipLoadedSize: number;
  sourceContent?: GithubRepoContent;
}

export const GithubRepoContext = createContext<GithubRepoContextType | null>(null);

export const GithubRepoContextProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const llmContext = useContext(LLMContext);

  const [repo, setRepo] = useState<GithubRepo | undefined>();

  const [zipLoadedSize, setZipLoadedSize] = useState(0);

  const [sourceContent, setSourceContent] = useState<GithubRepoContent | undefined>();

  const setRepoFromSource = (source: string) => {
    // for github.com url
    if (source.startsWith('https://github.com/')) {
      const url = new URL(source);
      const [_, owner, name] = url.pathname.split('/');
      setRepo({ owner, name, id: `${owner}/${name}` });
    }
    // for non-url
    else if (!source.startsWith('https://')) {
      const [owner, name] = source.split('/');
      setRepo({ owner, name, id: `${owner}/${name}` });
    }
    // others
    else setRepo(undefined);
  };

  const fetchRepoContent = async () => {
    setZipLoadedSize(0);
    setSourceContent(undefined);

    if (!repo || !llmContext?.model) return;

    // get repo info like default branch, etc.
    const { default_branch: branchName, pushed_at: lastPushTime } = await fetch(
      `https://api.github.com/repos/${repo.id}`,
    ).then((resp) => resp.json());

    // check if cached content is outdated
    const key = `repo-content-${repo.id}`;
    const cachedSourceContent = await get<GithubRepoContent>(key);
    if (
      cachedSourceContent?.schemaVersion === SOURCE_SCHEMA_VERSION &&
      cachedSourceContent.sourceVersion === lastPushTime
    ) {
      setSourceContent(cachedSourceContent);
    } else {
      // if cached content is outdated, delete it
      del(key);

      // construct the url to download the zip file
      const zipUrl = `https://github.com/${repo.id}/archive/refs/heads/${branchName}.zip`;
      const proxyUrl = `/api/proxy?dest=${encodeURIComponent(zipUrl)}`;
      const blob = await fetchWithProgress(proxyUrl, setZipLoadedSize);

      // unzip the file
      const reader = new BlobReader(blob);
      const zipReader = new ZipReader(reader);
      const entries = await zipReader.getEntries();

      // keep only source code files and markdowns
      const files = entries.filter((e) => {
        if (e.directory) return false;

        // include files with these extensions
        const ext = last(e.filename.split('.')) || '';
        if (!['md', 'js', 'mjs', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py'].includes(ext))
          return false;

        // ignore these files:
        // - package-lock.json
        // - .eslintrc.json
        // - .d.ts
        // - .github/
        // - tests/
        if (
          e.filename.match(/(package-lock\.json$|\.eslintrc\.json$|\.d\.ts$|\.github\/|\/tests\/)/)
        )
          return false;

        return true;
      });

      // read file content
      const rootFolderNamePattern = new RegExp(`^${repo.name}-${branchName}\/`);
      const filesMap: { [filename: string]: string } = {};
      const contents = await Promise.all(
        files.map(async (e) => {
          const blob = await e.getData!(new BlobWriter());
          const url = URL.createObjectURL(blob);
          const response = await fetch(url);
          const text = await response.text();
          URL.revokeObjectURL(url);

          const filename = e.filename.replace(rootFolderNamePattern, 'root/');
          filesMap[filename] = text;

          const ext = last(e.filename.split('.')) || '';
          const block = `${e.filename}:\n\n\`\`\`${ext}\n${text}\n\`\`\``;

          return { filename, content: text, block };
        }),
      );

      // calculate token length and cost based on all combined source code
      const sourceCode = contents.map(({ block }) => block).join('\n\n');

      const { totalTokens } = await llmContext.model.countTokens(sourceCode);
      const tokenLength = totalTokens;

      // create directory tree
      const filePaths = contents.map((e) => e.filename);
      const tree = prettyTree(filePaths);

      const concatted = [
        `Project: ${repo.id}`,
        `Source tree:\n\n\`\`\`\n${tree}\n\`\`\``,
        sourceCode,
      ]
        .filter(Boolean)
        .join('\n\n');

      const sourceContent: GithubRepoContent = {
        id: repo,
        tree,
        files: filesMap,
        content: concatted,
        tokenLength,
        sourceVersion: lastPushTime,
        schemaVersion: SOURCE_SCHEMA_VERSION,
      };

      // store result in cache
      put(key, sourceContent);

      setSourceContent(sourceContent);
    }
  };

  useEffect(() => {
    // get source from url search query
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    if (source) setRepoFromSource(source);
  }, []);

  useEffect(() => {
    if (repo && llmContext?.model) {
      fetchRepoContent();
    }
  }, [repo, llmContext?.model]);

  return (
    <GithubRepoContext.Provider
      value={{ repo, setRepo: setRepoFromSource, zipLoadedSize, sourceContent }}
    >
      {children}
    </GithubRepoContext.Provider>
  );
};
