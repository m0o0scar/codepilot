import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

import { SettingsContext } from '@components/settings/SettingsContext';
import { ResponseChunk, SOURCE_SCHEMA_VERSION } from '@pages/api/github/fetchRepo';
import { del, get, put } from '@utils/storage';

import { GithubRepoContent, GithubRepoInfo } from './types';

export interface GithubRepoContextType {
  repo?: GithubRepoInfo;
  sourceContent?: GithubRepoContent;

  url?: string;
  scopePath?: string;
  setUrl: (url?: string) => void;

  zipLoadedSize: number;
}

export const GithubRepoContext = createContext<GithubRepoContextType | null>(null);

export const GithubRepoContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const settingsContext = useContext(SettingsContext);

  const [url, _setUrl] = useState<string | undefined>();
  const setUrl = (url?: string) => {
    if (url && url.startsWith('https://github.com/')) {
      _setUrl(url);
      return true;
    }
    _setUrl(undefined);
    return false;
  };

  const [scopePath, setScopePath] = useState('');

  const [repo, setRepo] = useState<GithubRepoInfo | undefined>();

  const [zipLoadedSize, setZipLoadedSize] = useState(0);

  const [sourceContent, setSourceContent] = useState<GithubRepoContent | undefined>();

  const reset = () => {
    setScopePath('');
    setRepo(undefined);
    setZipLoadedSize(0);
    setSourceContent(undefined);
  };

  const fetchRepoContent = async () => {
    setZipLoadedSize(0);
    setSourceContent(undefined);

    const { githubClientId, githubClientSecret, googleVertexApiKey } =
      settingsContext?.settings || {};
    if (!url || !googleVertexApiKey || !githubClientId || !githubClientSecret) return;

    /**
     * https://github.com
     *    /run-llama <owner>
     *    /llama_index <name>
     *    /tree
     *    /main <branch>
     *    /llama-index-packs/llama-index-packs-raptor <scope path>
     */
    const [_, owner, name, _tree, _branch, ..._path] = new URL(url).pathname.split('/');
    const id = `${owner}/${name}`;
    const path = _path.join('/');
    setScopePath(path);

    // storage key
    let key = `repo-content-${id}`;
    if (path) key += `-${path}`;

    // send request to server
    const abortController = new AbortController();
    const response = await fetch(`/api/github/fetchRepo?url=${encodeURIComponent(url)}`, {
      method: 'POST',
      headers: {
        'x-gemini-token': googleVertexApiKey,
        'x-github-token': btoa(`${githubClientId}:${githubClientSecret}`),
      },
      signal: abortController.signal,
    });

    // handle streaming response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let info: GithubRepoInfo | undefined;
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      acc += decoder.decode(value);
      const lines = acc.split('\n\n');

      for (const line of lines) {
        try {
          const data = JSON.parse(line) as ResponseChunk;

          if ('error' in data) {
            setSourceContent({
              id,
              tree: '',
              content: '',
              tokenLength: 0,
              numberOfLines: 0,
              languages: [],
              sourceVersion: '',
              schemaVersion: SOURCE_SCHEMA_VERSION,
              error: data.error,
            });
            return;
          }

          if ('info' in data) {
            info = data.info as GithubRepoInfo;
            setRepo(data.info);

            // check if cached content is outdated
            const cachedSourceContent = await get<GithubRepoContent>(key);
            if (
              cachedSourceContent?.schemaVersion === SOURCE_SCHEMA_VERSION &&
              cachedSourceContent.sourceVersion === info.pushed_at
            ) {
              setSourceContent(cachedSourceContent);
              abortController.abort();
              return;
            }
            // if cached content is outdated, delete it
            del(key);
          }

          if ('zipLoaded' in data) setZipLoadedSize(data.zipLoaded);

          if ('content' in data) {
            const sourceContent: GithubRepoContent = {
              id,
              tree: data.tree,
              content: data.content,
              tokenLength: data.tokens,
              numberOfLines: data.lines,
              languages: data.languages,
              sourceVersion: info!.pushed_at,
              schemaVersion: SOURCE_SCHEMA_VERSION,
            };
            console.log(sourceContent.tree);
            put(key, sourceContent);
            setSourceContent(sourceContent);
          }
        } catch (error) {
          acc = line;
          break;
        }
      }

      if (done) break;
    }
  };

  useEffect(() => {
    // get source from url search query
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    if (source) setUrl(source);
  }, []);

  useEffect(() => {
    if (!settingsContext?.pendingForApiKeys && url) {
      setRepo(undefined);
      fetchRepoContent();
    } else {
      reset();
    }
  }, [url, settingsContext?.pendingForApiKeys]);

  return (
    <GithubRepoContext.Provider
      value={{
        repo,
        sourceContent,
        url,
        scopePath,
        setUrl,
        zipLoadedSize,
      }}
    >
      {children}
    </GithubRepoContext.Provider>
  );
};
