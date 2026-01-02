/**
 * Consumer SDK exports
 *
 * For end-users of CLI/TUI apps that integrate with Tuish.
 * Use this for license checking, purchases, and license management.
 *
 * @example
 * ```typescript
 * import { Tuish } from '@tuish/sdk/consumer';
 *
 * const tuish = new Tuish({
 *   productId: 'prod_xxx',
 *   publicKey: 'MCowBQYDK2VwAyEA...'
 * });
 *
 * const license = await tuish.checkLicense();
 * if (!license.valid) {
 *   await tuish.purchaseInBrowser();
 * }
 * ```
 */

export { Tuish } from './index';
export { TuishApiError } from './client';

export type {
	TuishConfig,
	LicenseCheckResult,
	LicenseDetails,
	LicenseInvalidReason,
	CheckoutSessionResult,
	PurchaseInitResult,
	PurchaseConfirmResult,
	SavedCard,
	LoginResult,
	OtpRequestResult,
	CachedLicenseData,
} from './types';
