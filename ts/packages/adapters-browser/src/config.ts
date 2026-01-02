import type { ConfigAdapter } from '@tuish/cli-core';

const STORAGE_KEY_PREFIX = 'tuish:';
const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';

export function createBrowserConfigAdapter(): ConfigAdapter {
  return {
    getApiKey: () => {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}apiKey`) ?? undefined;
    },
    setApiKey: (key: string) => {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}apiKey`, key);
    },
    clearApiKey: () => {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}apiKey`);
    },
    getApiBaseUrl: () => {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}apiBaseUrl`) ?? DEFAULT_API_URL;
    },
    setApiBaseUrl: (url: string) => {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}apiBaseUrl`, url);
    },
  };
}
