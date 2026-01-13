import { useCallback, useEffect, useState } from 'react';
import { Tuish } from '@tuish/sdk/consumer';
import type { LicenseCheckResult, CheckoutSessionResult } from '@tuish/sdk/consumer';
import {
	getUserLicense,
	saveUserLicense,
	clearUserLicense,
	updateLastChecked,
} from '../lib/userConfig.js';

export interface UseUserLicenseOptions {
	productId: string;
	publicKey: string;
}

export interface UseUserLicenseReturn {
	isLoading: boolean;
	checkResult: LicenseCheckResult | null;
	error: Error | null;
	activate: (key: string) => Promise<boolean>;
	deactivate: () => void;
	refresh: () => Promise<void>;
	startPurchase: (email?: string) => Promise<CheckoutSessionResult>;
	waitForPurchase: (
		sessionId: string,
		onPoll?: (status: 'pending' | 'complete' | 'expired') => void,
	) => Promise<LicenseCheckResult>;
}

export function useUserLicense(options: UseUserLicenseOptions): UseUserLicenseReturn {
	const { productId, publicKey } = options;

	// Create SDK instance - stable across renders
	const [sdk] = useState(
		() =>
			new Tuish({
				productId,
				publicKey,
			}),
	);

	const [isLoading, setIsLoading] = useState(true);
	const [checkResult, setCheckResult] = useState<LicenseCheckResult | null>(null);
	const [error, setError] = useState<Error | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Check for stored license and set it in SDK
			const stored = getUserLicense(productId);
			if (stored) {
				sdk.storeLicense(stored.licenseKey);
			}

			// Run license check
			const result = await sdk.checkLicense();
			setCheckResult(result);

			// Update last checked timestamp
			if (stored) {
				updateLastChecked(productId);
			}
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
		} finally {
			setIsLoading(false);
		}
	}, [sdk, productId]);

	// Initial check on mount
	useEffect(() => {
		refresh();
	}, [refresh]);

	const activate = useCallback(
		async (key: string): Promise<boolean> => {
			setIsLoading(true);
			setError(null);

			try {
				// Store in SDK and verify
				sdk.storeLicense(key);
				const result = await sdk.checkLicense();

				if (result.valid) {
					// Persist to user config
					saveUserLicense(productId, key);
					setCheckResult(result);
					return true;
				}

				// Invalid license - clear from SDK
				setError(new Error(result.reason ?? 'Invalid license'));
				sdk.clearLicense();
				return false;
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[sdk, productId],
	);

	const deactivate = useCallback(() => {
		clearUserLicense(productId);
		sdk.clearLicense();
		setCheckResult({ valid: false, reason: 'not_found', offlineVerified: false });
	}, [sdk, productId]);

	const startPurchase = useCallback(
		async (email?: string): Promise<CheckoutSessionResult> => {
			const session = await sdk.purchaseInBrowser({
				email,
				openBrowser: true,
			});
			return session;
		},
		[sdk],
	);

	const waitForPurchase = useCallback(
		async (
			sessionId: string,
			onPoll?: (status: 'pending' | 'complete' | 'expired') => void,
		): Promise<LicenseCheckResult> => {
			const result = await sdk.waitForCheckoutComplete(sessionId, {
				onPoll: (status) => {
					// Map 'complete' to 'pending' until we have full result
					// SDK returns 'pending' | 'complete' | 'expired'
					onPoll?.(status);
				},
			});

			if (result.valid) {
				// Get the license key and save to user config
				const licenseKey = sdk.getCachedLicenseKey();
				if (licenseKey) {
					saveUserLicense(productId, licenseKey);
				}
				setCheckResult(result);
			}

			return result;
		},
		[sdk, productId],
	);

	return {
		isLoading,
		checkResult,
		error,
		activate,
		deactivate,
		refresh,
		startPurchase,
		waitForPurchase,
	};
}
