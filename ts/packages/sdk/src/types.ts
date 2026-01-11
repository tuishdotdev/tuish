import type { LicenseKeyResolver } from '@tuish/cli-core';

/**
 * SDK Configuration Options
 */
export interface TuishConfig {
	/** Product ID for this application */
	productId: string;

	/** Ed25519 public key for offline license verification (SPKI base64 or hex format) */
	publicKey: string;

	/** API base URL (defaults to production) */
	apiBaseUrl?: string;

	/** API key for authenticated requests (optional, used for license validation) */
	apiKey?: string;

	/** Custom storage directory (defaults to ~/.tuish/licenses/) */
	storageDir?: string;

	/** Enable debug logging */
	debug?: boolean;

	/**
	 * Custom license key resolver for discovering license keys from
	 * environment variables, local files, or other sources.
	 *
	 * If provided, resolver is checked BEFORE the global license cache.
	 * Use createNodeLicenseKeyResolver() from @tuish/adapters-node
	 * or createBrowserLicenseKeyResolver() from @tuish/adapters-browser.
	 *
	 * @example
	 * ```typescript
	 * import { createNodeLicenseKeyResolver } from '@tuish/adapters-node';
	 *
	 * const tuish = new Tuish({
	 *   productId: 'prod_xxx',
	 *   publicKey: 'MCow...',
	 *   licenseKeyResolver: createNodeLicenseKeyResolver(),
	 * });
	 * ```
	 */
	licenseKeyResolver?: LicenseKeyResolver;
}

/**
 * License check result
 */
export interface LicenseCheckResult {
	/** Whether the license is valid */
	valid: boolean;

	/** License payload if valid */
	license?: LicenseDetails;

	/** Reason for invalid license */
	reason?: LicenseInvalidReason;

	/** Whether the license was verified offline */
	offlineVerified: boolean;
}

/**
 * License details
 */
export interface LicenseDetails {
	/** License ID */
	id: string;

	/** Product ID */
	productId: string;

	/** Product name (if available from API) */
	productName?: string;

	/** Feature flags */
	features: string[];

	/** License status */
	status: 'active' | 'expired' | 'revoked';

	/** Issued at (Unix timestamp ms) */
	issuedAt: number;

	/** Expires at (Unix timestamp ms, null for perpetual) */
	expiresAt: number | null;
}

/**
 * Reasons why a license may be invalid
 */
export type LicenseInvalidReason =
	| 'not_found'
	| 'expired'
	| 'revoked'
	| 'invalid_format'
	| 'invalid_signature'
	| 'machine_mismatch'
	| 'network_error';

/**
 * Checkout session result
 */
export interface CheckoutSessionResult {
	/** Session ID for polling */
	sessionId: string;

	/** URL to open in browser */
	checkoutUrl: string;
}

/**
 * Purchase initiation result
 */
export interface PurchaseInitResult {
	/** Available saved cards */
	cards: SavedCard[];

	/** Amount in cents */
	amount: number;

	/** Currency code */
	currency: string;

	/** Masked phone number for OTP */
	phoneMasked: string;

	/** Product name */
	productName: string;
}

/**
 * Saved payment card
 */
export interface SavedCard {
	/** Card ID (for use in purchase confirmation) */
	id: string;

	/** Card brand (visa, mastercard, etc.) */
	brand: string;

	/** Last 4 digits */
	last4: string;

	/** Expiry month */
	expiryMonth: number;

	/** Expiry year */
	expiryYear: number;
}

/**
 * Purchase confirmation result
 */
export interface PurchaseConfirmResult {
	/** Whether purchase succeeded */
	success: boolean;

	/** License key if successful */
	license?: string;

	/** Receipt URL if successful */
	receiptUrl?: string;

	/** Whether 3DS action is required */
	requiresAction?: boolean;

	/** URL for 3DS action */
	actionUrl?: string;

	/** Error message if failed */
	error?: string;
}

/**
 * OTP request result
 */
export interface OtpRequestResult {
	/** OTP ID for verification */
	otpId: string;

	/** Masked phone number */
	phoneMasked: string;

	/** Time until OTP expires (seconds) */
	expiresIn: number;
}

/**
 * License details returned from login (includes license key for storage)
 */
export interface LoginLicenseDetails extends LicenseDetails {
	/** License key for offline verification (only provided on login) */
	licenseKey: string;
}

/**
 * Login result
 */
export interface LoginResult {
	/** Identity token (JWT) for authenticated requests */
	identityToken: string;

	/** Customer's licenses (includes license keys for storage) */
	licenses: LoginLicenseDetails[];
}

/**
 * Cached license data stored on disk
 */
export interface CachedLicenseData {
	/** Raw license key string */
	licenseKey: string;

	/** When the license was cached */
	cachedAt: number;

	/** When the cache should be refreshed (for online validation) */
	refreshAt: number;

	/** Product ID */
	productId: string;

	/** Machine fingerprint used */
	machineFingerprint: string;
}
