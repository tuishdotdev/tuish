import { homedir } from 'node:os';
import { join } from 'node:path';
import Conf from 'conf';

/**
 * User license storage - separate from developer config
 * Stores licenses per product for end-users of tuish-powered apps
 */

export interface StoredLicense {
	licenseKey: string;
	activatedAt: number;
	lastChecked: number;
}

interface UserConfigStore {
	licenses: Record<string, StoredLicense>;
}

const schema = {
	licenses: {
		type: 'object' as const,
		default: {},
	},
} as const;

export function createUserConfig(): Conf<UserConfigStore> {
	return new Conf<UserConfigStore>({
		projectName: 'tuish',
		configName: 'user',
		cwd: join(homedir(), '.tuish'),
		schema,
	});
}

export function getUserLicense(productId: string): StoredLicense | null {
	const config = createUserConfig();
	const licenses = config.get('licenses') ?? {};
	return licenses[productId] ?? null;
}

export function saveUserLicense(productId: string, licenseKey: string): void {
	const config = createUserConfig();
	const licenses = config.get('licenses') ?? {};
	licenses[productId] = {
		licenseKey,
		activatedAt: Date.now(),
		lastChecked: Date.now(),
	};
	config.set('licenses', licenses);
}

export function clearUserLicense(productId: string): void {
	const config = createUserConfig();
	const licenses = config.get('licenses') ?? {};
	delete licenses[productId];
	config.set('licenses', licenses);
}

export function updateLastChecked(productId: string): void {
	const config = createUserConfig();
	const licenses = config.get('licenses') ?? {};
	if (licenses[productId]) {
		licenses[productId].lastChecked = Date.now();
		config.set('licenses', licenses);
	}
}

export type UserConfig = ReturnType<typeof createUserConfig>;
