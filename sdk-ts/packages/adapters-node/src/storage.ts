import { homedir } from 'node:os';
import { join } from 'node:path';
import Conf from 'conf';
import type { StorageAdapter } from '@tuish/cli-core';

export function createNodeStorageAdapter(namespace = 'default'): StorageAdapter {
  const conf = new Conf<Record<string, string>>({
    projectName: `tuish-storage-${namespace}`,
    cwd: join(homedir(), '.tuish', 'storage'),
  });

  return {
    get: (key: string) => conf.get(key),
    set: (key: string, value: string) => conf.set(key, value),
    delete: (key: string) => conf.delete(key),
    clear: () => conf.clear(),
  };
}
