import { GithubRepoInfo, Language } from '@components/github/types';

import { fetchWithProgress } from './fetch';

export class GithubApiClient {
  private apiToken?: string;
  readonly owner: string;
  readonly name: string;

  info?: GithubRepoInfo;
  languages?: Language[];

  constructor(owner: string, name: string, apiToken?: string) {
    this.apiToken = apiToken;
    this.owner = owner;
    this.name = name;
  }

  private sendRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const url = `https://api.github.com/repos/${this.owner}/${this.name}${path}`;

    const headers: HeadersInit = new Headers(init?.headers);
    if (this.apiToken) headers.set('Authorization', `Basic ${this.apiToken}`);

    const response = await fetch(url, { ...init, headers });

    if (response.status !== 200) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<T>;
  };

  fetchInfo = async () => {
    this.info = await this.sendRequest<GithubRepoInfo>('');
  };

  fetchLanguages = async () => {
    const data = await this.sendRequest<{ [key: string]: number }>('/languages');

    const totalBytes = Object.values(data).reduce((a, b) => a + b, 0);
    this.languages = Object.entries(data)
      .map(([key, value]) => ({
        name: key,
        percentage: value / totalBytes,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  };

  downloadZip = async (branch: string, onProgress?: (progress: number) => void) => {
    const url = `https://github.com/${this.owner}/${this.name}/archive/refs/heads/${branch}.zip`;
    return fetchWithProgress(url, onProgress);
  };
}
