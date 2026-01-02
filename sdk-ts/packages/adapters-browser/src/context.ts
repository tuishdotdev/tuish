import type { PlatformContext } from '@tuish/cli-core';
import { createBrowserConfigAdapter } from './config.js';
import { createBrowserStorageAdapter } from './storage.js';
import { createBrowserFingerprintAdapter } from './fingerprint.js';
import { createBrowserOutputAdapter, createConsoleOutputAdapter, type OutputCallback } from './output.js';

export interface CreateBrowserContextOptions {
  output?: OutputCallback;
  storageNamespace?: string;
}

export function createBrowserContext(options: CreateBrowserContextOptions = {}): PlatformContext {
  const { output, storageNamespace } = options;

  return {
    config: createBrowserConfigAdapter(),
    storage: createBrowserStorageAdapter(storageNamespace),
    fingerprint: createBrowserFingerprintAdapter(),
    output: output ? createBrowserOutputAdapter(output) : createConsoleOutputAdapter(),
    isInteractive: true,
    isBrowser: true,
  };
}
