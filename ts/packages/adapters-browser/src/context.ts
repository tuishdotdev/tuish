import type { PlatformContext } from '@tuish/cli-core';
import { createBrowserConfigAdapter } from './config.js';
import { createBrowserFingerprintAdapter } from './fingerprint.js';
import { createBrowserLicenseKeyResolver } from './license-key.js';
import {
	type OutputCallback,
	createBrowserOutputAdapter,
	createConsoleOutputAdapter,
} from './output.js';
import { createBrowserStorageAdapter } from './storage.js';

export interface CreateBrowserContextOptions {
	output?: OutputCallback;
	storageNamespace?: string;
	/** Include license key resolver in context (default: true) */
	includeLicenseKeyResolver?: boolean;
}

export function createBrowserContext(
	options: CreateBrowserContextOptions = {},
): PlatformContext {
	const {
		output,
		storageNamespace,
		includeLicenseKeyResolver = true,
	} = options;

	return {
		config: createBrowserConfigAdapter(),
		storage: createBrowserStorageAdapter(storageNamespace),
		fingerprint: createBrowserFingerprintAdapter(),
		output: output
			? createBrowserOutputAdapter(output)
			: createConsoleOutputAdapter(),
		isInteractive: true,
		isBrowser: true,
		licenseKeyResolver: includeLicenseKeyResolver
			? createBrowserLicenseKeyResolver()
			: undefined,
	};
}
