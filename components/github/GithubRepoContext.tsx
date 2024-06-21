import { last } from 'lodash';
// @ts-ignore
import prettyTree from 'pretty-file-tree';
import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

import { LLMContext } from '@components/llm/LLMContext';
import { SettingsContext } from '@components/settings/SettingsContext';
import { fetchWithProgress } from '@utils/fetch';
import { formatFileSize } from '@utils/number';
import { del, get, put } from '@utils/storage';
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';

import { GithubRepoContent, GithubRepoInfo } from './types';

const SOURCE_SCHEMA_VERSION = 4;

export interface GithubRepoContextType {
  repo?: GithubRepoInfo;
  sourceContent?: GithubRepoContent;

  url?: string;
  setUrl: (url?: string) => void;

  zipLoadedSize: number;
}

export const GithubRepoContext = createContext<GithubRepoContextType | null>(null);

export const GithubRepoContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const settingsContext = useContext(SettingsContext);
  const llmContext = useContext(LLMContext);

  const [url, _setUrl] = useState<string | undefined>();
  const setUrl = (url?: string) => {
    if (url && url.startsWith('https://github.com/')) {
      _setUrl(url);
      return true;
    }
    return false;
  };

  const [repo, setRepo] = useState<GithubRepoInfo | undefined>();

  const [zipLoadedSize, setZipLoadedSize] = useState(0);

  const [sourceContent, setSourceContent] = useState<GithubRepoContent | undefined>();

  const fetchRepoContent = async () => {
    setZipLoadedSize(0);
    setSourceContent(undefined);

    const { githubClientId, githubClientSecret } = settingsContext?.settings || {};
    if (!url || !llmContext?.model || !githubClientId || !githubClientSecret) return;

    const [_, owner, name] = new URL(url).pathname.split('/');

    // get repo info like default branch, etc.
    const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: {
        // send github client id and secret as basic auth to prevent rate limiting
        Authorization: `Basic ${btoa(`${githubClientId}:${githubClientSecret}`)}`,
      },
    });

    const info = (await repoInfoResponse.json()) as GithubRepoInfo;
    setRepo(info);

    const placeholder: GithubRepoContent = {
      id: info.full_name,
      tree: '',
      files: {},
      content: '',
      tokenLength: 0,
      numberOfLines: 0,
      schemaVersion: SOURCE_SCHEMA_VERSION,
      sourceVersion: info.pushed_at,
    };

    if (repoInfoResponse.status === 404) {
      setSourceContent({
        ...placeholder,
        error: 'Repo not found, is the url correct or is it a private repo?',
      });
      return;
    }

    // check if cached content is outdated
    const key = `repo-content-${info.full_name}`;
    const cachedSourceContent = await get<GithubRepoContent>(key);
    if (
      cachedSourceContent?.schemaVersion === SOURCE_SCHEMA_VERSION &&
      cachedSourceContent.sourceVersion === info.pushed_at
    ) {
      setSourceContent(cachedSourceContent);
      return;
    }
    // if cached content is outdated, delete it
    del(key);

    // construct the url to download the zip file
    const zipUrl = `https://github.com/${info.full_name}/archive/refs/heads/${info.default_branch}.zip`;
    const proxyUrl = `/api/proxy?dest=${encodeURIComponent(zipUrl)}`;
    const blob = await fetchWithProgress(proxyUrl, setZipLoadedSize);

    // check if the zip file is too large, max = 100MB
    if (blob.size > 100 * 1024 * 1024) {
      const content = {
        ...placeholder,
        error: `The zip file is too large (${formatFileSize(blob.size)}), maximum is 100MB.`,
      };
      put(key, content);
      setSourceContent(content);
      return;
    }

    // unzip the file
    const reader = new BlobReader(blob);
    const zipReader = new ZipReader(reader);
    const entries = await zipReader.getEntries();

    // keep only source code files and markdowns
    const files = entries.filter((e) => {
      if (e.directory) return false;

      // include files with these extensions
      const ext = last(e.filename.split('.')) || '';
      if (!['md', 'js', 'mjs', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rs'].includes(ext))
        return false;

      // ignore these files:
      // - package-lock.json
      // - .eslintrc.json
      // - .d.ts
      // - .github/
      // - tests/
      if (e.filename.match(/(package-lock\.json$|\.eslintrc\.json$|\.d\.ts$|\.github\/|\/tests\/)/))
        return false;

      return true;
    });

    // read file content
    let numberOfLines = 0;
    const rootFolderNamePattern = new RegExp(`^${info.name}-${info.default_branch}\/`);
    const filesMap: { [filename: string]: string } = {};
    const contents = await Promise.all(
      files.map(async (e) => {
        const blob = await e.getData!(new BlobWriter());
        const url = URL.createObjectURL(blob);
        const response = await fetch(url);
        const text = await response.text();
        URL.revokeObjectURL(url);

        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        numberOfLines += lines.length;

        const filename = e.filename.replace(rootFolderNamePattern, 'root/');
        filesMap[filename] = text;

        const ext = last(e.filename.split('.')) || '';
        const block = `${e.filename}:\n\n\`\`\`${ext}\n${text}\n\`\`\``;

        return { filename, content: text, block };
      }),
    );

    // calculate token length and cost based on all combined source code
    const sourceCode = contents.map(({ block }) => block).join('\n\n');

    let tokenLength = 0;
    try {
      const { totalTokens } = await llmContext.model.countTokens(sourceCode);
      tokenLength = totalTokens;
    } catch (error) {
      const content = { ...placeholder, error: String(error) };
      put(key, content);
      setSourceContent(content);
      return;
    }

    // create directory tree
    const filePaths = contents.map((e) => e.filename);
    const tree = prettyTree(filePaths);

    const concatted = [
      `Project: ${info.full_name}`,
      `Branch: ${info.default_branch}`,
      `Source tree:\n\n\`\`\`\n${tree}\n\`\`\``,
      sourceCode,
    ]
      .filter(Boolean)
      .join('\n\n');

    const sourceContent = {
      ...placeholder,
      tree,
      files: filesMap,
      content: concatted,
      tokenLength,
      numberOfLines,
    };

    put(key, sourceContent);
    setSourceContent(sourceContent);
  };

  useEffect(() => {
    // get source from url search query
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    if (source) setUrl(source);
  }, []);

  useEffect(() => {
    if (url && llmContext?.model) {
      setRepo(undefined);
      fetchRepoContent();
    }
  }, [url, llmContext?.model]);

  return (
    <GithubRepoContext.Provider
      value={{
        repo,
        sourceContent,
        url,
        setUrl,
        zipLoadedSize,
      }}
    >
      {children}
    </GithubRepoContext.Provider>
  );
};
