import type { StorageAdapter } from '@tuish/cli-core';

const STORAGE_KEY_PREFIX = 'tuish:storage:';

export function createBrowserStorageAdapter(namespace = 'default'): StorageAdapter {
  const prefix = `${STORAGE_KEY_PREFIX}${namespace}:`;

  return {
    get: (key: string) => {
      return localStorage.getItem(`${prefix}${key}`) ?? undefined;
    },
    set: (key: string, value: string) => {
      localStorage.setItem(`${prefix}${key}`, value);
    },
    delete: (key: string) => {
      localStorage.removeItem(`${prefix}${key}`);
    },
    clear: () => {
      // Only clear items with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    },
  };
}
