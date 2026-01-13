import type { PlatformContext } from '@tuish/cli-core';
import { createNodeConfigAdapter } from './config.js';
import { createNodeFingerprintAdapter } from './fingerprint.js';
import { createNodeLicenseKeyResolver } from './license-key.js';
import { createNodeOutputAdapter } from './output.js';
import { createNodeStorageAdapter } from './storage.js';

export interface CreateNodeContextOptions {
	isInteractive?: boolean;
	storageNamespace?: string;
	/** Include license key resolver in context (default: true) */
	includeLicenseKeyResolver?: boolean;
}

export function createNodeContext(
	options: CreateNodeContextOptions = {},
): PlatformContext {
	const {
		isInteractive = process.stdout.isTTY ?? false,
		storageNamespace,
		includeLicenseKeyResolver = true,
	} = options;

	return {
		config: createNodeConfigAdapter(),
		storage: createNodeStorageAdapter(storageNamespace),
		fingerprint: createNodeFingerprintAdapter(),
		output: createNodeOutputAdapter(),
		isInteractive,
		isBrowser: false,
		licenseKeyResolver: includeLicenseKeyResolver
			? createNodeLicenseKeyResolver()
			: undefined,
	};
}
