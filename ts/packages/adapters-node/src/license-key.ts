import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { LicenseKeyResolver, ResolvedLicenseKey } from '@tuish/cli-core';

/**
 * Convert a product ID to environment variable name format.
 * Example: "prod_my-cool-cli" -> "MY_COOL_CLI"
 */
function productIdToEnvSuffix(productId: string): string {
	return productId
		.replace(/^prod_/, '') // Remove prod_ prefix
		.toUpperCase() // Convert to uppercase
		.replace(/-/g, '_'); // Replace hyphens with underscores
}

/**
 * Check environment variables for license key.
 * Checks TUISH_LICENSE_KEY_{PRODUCT_ID} first (product-specific),
 * then TUISH_LICENSE_KEY (generic fallback).
 */
function resolveFromEnvironment(
	productId: string,
): ResolvedLicenseKey | undefined {
	// Check product-specific env var first
	const envSuffix = productIdToEnvSuffix(productId);
	const productEnvVar = `TUISH_LICENSE_KEY_${envSuffix}`;
	const productKey = process.env[productEnvVar];

	if (productKey?.trim()) {
		return {
			licenseKey: productKey.trim(),
			source: 'environment',
			sourcePath: productEnvVar,
		};
	}

	// Fall back to generic env var
	const genericKey = process.env.TUISH_LICENSE_KEY;

	if (genericKey?.trim()) {
		return {
			licenseKey: genericKey.trim(),
			source: 'environment',
			sourcePath: 'TUISH_LICENSE_KEY',
		};
	}

	return undefined;
}

/**
 * Parse a .tuish file (plain text, single license key).
 */
function parseTuishFile(content: string): string | undefined {
	const trimmed = content.trim();

	// Must start with lic_ prefix to be a valid license key
	if (trimmed.startsWith('lic_')) {
		return trimmed;
	}

	return undefined;
}

/**
 * Parse a .tuishrc file (JSON with licenses object).
 * Format: { "licenses": { "prod_xxx": "lic_xxx", ... } }
 */
function parseTuishrcFile(
	content: string,
	productId: string,
): string | undefined {
	try {
		const parsed = JSON.parse(content) as {
			licenses?: Record<string, string>;
		};

		const licenseKey = parsed.licenses?.[productId];

		if (licenseKey?.trim()?.startsWith('lic_')) {
			return licenseKey.trim();
		}

		return undefined;
	} catch {
		// Invalid JSON - silently ignore and fall through to next source
		return undefined;
	}
}

/**
 * Walk up directory tree looking for .tuish or .tuishrc files.
 * Starts from startDir and walks up to filesystem root.
 */
function resolveFromLocalFile(
	productId: string,
	startDir: string,
): ResolvedLicenseKey | undefined {
	let currentDir = startDir;

	// Walk up directory tree
	while (true) {
		// Check for .tuish file (simple format)
		const tuishPath = join(currentDir, '.tuish');
		if (existsSync(tuishPath)) {
			try {
				const content = readFileSync(tuishPath, 'utf-8');
				const licenseKey = parseTuishFile(content);

				if (licenseKey) {
					return {
						licenseKey,
						source: 'local_file',
						sourcePath: tuishPath,
					};
				}
			} catch {
				// Permission denied or read error - skip this file
			}
		}

		// Check for .tuishrc file (JSON format)
		const tuishrcPath = join(currentDir, '.tuishrc');
		if (existsSync(tuishrcPath)) {
			try {
				const content = readFileSync(tuishrcPath, 'utf-8');
				const licenseKey = parseTuishrcFile(content, productId);

				if (licenseKey) {
					return {
						licenseKey,
						source: 'local_file',
						sourcePath: tuishrcPath,
					};
				}
			} catch {
				// Permission denied or read error - skip this file
			}
		}

		// Move up to parent directory
		const parentDir = dirname(currentDir);

		// Stop if we've reached the root (dirname returns same path)
		if (parentDir === currentDir) {
			break;
		}

		currentDir = parentDir;
	}

	return undefined;
}

/**
 * Create a Node.js license key resolver.
 * Resolution order:
 * 1. Environment variable (TUISH_LICENSE_KEY_{PRODUCT_ID} or TUISH_LICENSE_KEY)
 * 2. Local file (.tuish or .tuishrc) walking up from startDir
 * 3. Returns undefined (global storage is handled by SDK LicenseStorage)
 *
 * Note: Global storage (~/.tuish/licenses/) is intentionally NOT checked here.
 * The SDK's LicenseStorage handles that, and this resolver is for explicit
 * user-provided keys that should take precedence over cached licenses.
 */
export function createNodeLicenseKeyResolver(): LicenseKeyResolver {
	return {
		resolve(
			productId: string,
			startDir?: string,
		): ResolvedLicenseKey | undefined {
			// 1. Check environment variables (highest priority)
			const envResult = resolveFromEnvironment(productId);
			if (envResult) {
				return envResult;
			}

			// 2. Check local files walking up directory tree
			const searchDir = startDir ?? process.cwd();
			const localResult = resolveFromLocalFile(productId, searchDir);
			if (localResult) {
				return localResult;
			}

			// 3. Not found - let SDK check its own global cache
			return undefined;
		},
	};
}
