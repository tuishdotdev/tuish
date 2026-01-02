import { homedir } from 'node:os';
import { join } from 'node:path';
import Conf from 'conf';
import type { ConfigAdapter } from '@tuish/cli-core';

const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';
const DEV_API_URL = 'http://localhost:8787';

type ConfigSchema = {
  apiKey: string | undefined;
  apiBaseUrl: string;
};

const schema = {
  apiKey: {
    type: 'string' as const,
  },
  apiBaseUrl: {
    type: 'string' as const,
    default: DEFAULT_API_URL,
  },
} as const;

export function createNodeConfigAdapter(): ConfigAdapter {
  const conf = new Conf<ConfigSchema>({
    projectName: 'tuish',
    cwd: join(homedir(), '.tuish'),
    schema,
  });

  // Use DEV_API_URL if TUISH_DEV environment variable is set
  const defaultUrl = process.env.TUISH_DEV ? DEV_API_URL : DEFAULT_API_URL;

  return {
    getApiKey: () => conf.get('apiKey'),
    setApiKey: (key: string) => conf.set('apiKey', key),
    clearApiKey: () => conf.delete('apiKey'),
    getApiBaseUrl: () => conf.get('apiBaseUrl') ?? defaultUrl,
    setApiBaseUrl: (url: string) => conf.set('apiBaseUrl', url),
  };
}
