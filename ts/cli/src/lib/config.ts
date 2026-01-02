import { homedir } from 'node:os';
import { join } from 'node:path';
import Conf from 'conf';

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
		default: 'https://tuish-api-production.doug-lance.workers.dev',
	},
} as const;

export function createConfig(): Conf<ConfigSchema> {
	return new Conf<ConfigSchema>({
		projectName: 'tuish',
		cwd: join(homedir(), '.tuish'),
		schema,
	});
}

export type Config = ReturnType<typeof createConfig>;
