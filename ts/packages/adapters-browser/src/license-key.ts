import type { LicenseKeyResolver, ResolvedLicenseKey } from '@tuish/cli-core';

const STORAGE_KEY_PREFIX = 'tuish:license:';

/**
 * Create a browser license key resolver.
 * Only checks localStorage since browsers have no filesystem or env vars.
 *
 * localStorage key format: tuish:license:{productId}
 *
 * Note: Returns undefined if localStorage is unavailable (e.g., private browsing)
 */
export function createBrowserLicenseKeyResolver(): LicenseKeyResolver {
	return {
		resolve(productId: string): ResolvedLicenseKey | undefined {
			// Check if localStorage is available
			if (typeof localStorage === 'undefined') {
				return undefined;
			}

			try {
				const storageKey = `${STORAGE_KEY_PREFIX}${productId}`;
				const licenseKey = localStorage.getItem(storageKey);

				if (licenseKey?.trim()?.startsWith('lic_')) {
					return {
						licenseKey: licenseKey.trim(),
						source: 'localStorage',
						sourcePath: storageKey,
					};
				}

				return undefined;
			} catch {
				// localStorage access denied (private browsing, etc.)
				return undefined;
			}
		},
	};
}

/**
 * Store a license key in browser localStorage.
 * Utility function for browser-based purchase flows.
 */
export function storeBrowserLicenseKey(
	productId: string,
	licenseKey: string,
): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	try {
		const storageKey = `${STORAGE_KEY_PREFIX}${productId}`;
		localStorage.setItem(storageKey, licenseKey);
	} catch {
		// localStorage access denied - ignore
	}
}

/**
 * Remove a license key from browser localStorage.
 */
export function removeBrowserLicenseKey(productId: string): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	try {
		const storageKey = `${STORAGE_KEY_PREFIX}${productId}`;
		localStorage.removeItem(storageKey);
	} catch {
		// localStorage access denied - ignore
	}
}
