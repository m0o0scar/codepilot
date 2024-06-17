const cacheInstances: { [name: string]: Cache } = {};

const DEFAULT_CACHE_NAME = 'v1';

const getCache = async (cacheName = DEFAULT_CACHE_NAME) => {
  if (!cacheInstances[cacheName]) {
    cacheInstances[cacheName] = await caches.open(cacheName);
  }
  return cacheInstances[cacheName];
};

export const put = async (key: string, value: any, cacheName?: string) => {
  const instance = await getCache(cacheName);
  const content = new Response(JSON.stringify(value));
  return instance.put(key, content);
};

export const get = async <T = any>(key: string, cacheName?: string) => {
  const instance = await getCache(cacheName);
  const content = await instance.match(key);
  if (!content) return null;
  return content.json() as Promise<T>;
};

export const del = async (key: string, cacheName?: string) => {
  const instance = await getCache(cacheName);
  return instance.delete(key);
};
