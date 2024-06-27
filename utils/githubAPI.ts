import { GithubRepoInfo } from '@components/github/types';

import { fetchWithProgress } from './fetch';

export type GithubApiCallResponse<T> =
  | {
      errorStatus: number;
      errorMessage: string;
    }
  | {
      data: T;
    };

export class GithubApiClient {
  private apiToken: string;
  private owner: string;
  private name: string;

  constructor(apiToken: string, owner: string, name: string) {
    this.apiToken = apiToken;
    this.owner = owner;
    this.name = name;
  }

  private sendRequest = async <T>(
    path: string,
    init?: RequestInit,
  ): Promise<GithubApiCallResponse<T>> => {
    const url = `https://api.github.com/repos/${this.owner}/${this.name}${path}`;
    console.log(url, this.apiToken);
    const response = await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Basic ${this.apiToken}`,
      },
    });

    if (response.status !== 200) {
      return { errorStatus: response.status, errorMessage: await response.text() };
    }

    const data = (await response.json()) as T;
    return { data };
  };

  fetchInfo = () => this.sendRequest<GithubRepoInfo>('');

  fetchLanguages = () => this.sendRequest<{ [key: string]: number }>('/languages');

  downloadZip = async (branch: string, onProgress?: (progress: number) => void) => {
    const url = `https://github.com/${this.owner}/${this.name}/archive/refs/heads/${branch}.zip`;
    return fetchWithProgress(url, onProgress);
  };
}
