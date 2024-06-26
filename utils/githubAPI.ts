export const sendRequest = (
  owner: string,
  name: string,
  path: string,
  token: string,
  init?: RequestInit,
) => {
  return fetch(`https://api.github.com/repos/${owner}/${name}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Basic ${token}`,
    },
  });
};
