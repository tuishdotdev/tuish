import type { PlatformContext } from '@tuish/cli-core';
import { createNodeConfigAdapter } from './config.js';
import { createNodeStorageAdapter } from './storage.js';
import { createNodeFingerprintAdapter } from './fingerprint.js';
import { createNodeOutputAdapter } from './output.js';

export interface CreateNodeContextOptions {
  isInteractive?: boolean;
  storageNamespace?: string;
}

export function createNodeContext(options: CreateNodeContextOptions = {}): PlatformContext {
  const { isInteractive = process.stdout.isTTY ?? false, storageNamespace } = options;

  return {
    config: createNodeConfigAdapter(),
    storage: createNodeStorageAdapter(storageNamespace),
    fingerprint: createNodeFingerprintAdapter(),
    output: createNodeOutputAdapter(),
    isInteractive,
    isBrowser: false,
  };
}
