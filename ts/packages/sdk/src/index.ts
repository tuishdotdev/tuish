import { exec } from 'node:child_process';
import { platform } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { TuishClient, TuishApiError } from './client';
import { LicenseManager } from './license';
import { LicenseStorage, getMachineFingerprintSync } from './storage';
import type {
	TuishConfig,
	LicenseCheckResult,
	CheckoutSessionResult,
	LoginResult,
	PurchaseInitResult,
	PurchaseConfirmResult,
	SavedCard,
	LicenseDetails,
} from './types';

export type {
	TuishConfig,
	LicenseCheckResult,
	CheckoutSessionResult,
	LoginResult,
	PurchaseInitResult,
	PurchaseConfirmResult,
	SavedCard,
	LicenseDetails,
};

export { TuishApiError };

/**
 * Main SDK class for tuish TUI monetization platform
 *
 * @example
 * ```typescript
 * import { Tuish } from '@tuish/sdk';
 *
 * const tuish = new Tuish({
 *   productId: 'prod_xxx',
 *   publicKey: 'MCowBQYDK2VwAyEA...'
 * });
 *
 * const license = await tuish.checkLicense();
 *
 * if (!license.valid) {
 *   await tuish.purchaseInBrowser();
 * }
 * ```
 */
export class Tuish {
	private readonly config: Required<
		Pick<TuishConfig, 'productId' | 'publicKey' | 'apiBaseUrl' | 'debug'>
	> &
		Omit<TuishConfig, 'productId' | 'publicKey' | 'apiBaseUrl' | 'debug'>;
	private readonly client: TuishClient;
	private readonly storage: LicenseStorage;
	private readonly licenseManager: LicenseManager;

	constructor(config: TuishConfig) {
		this.config = {
			...config,
			apiBaseUrl: config.apiBaseUrl ?? 'https://tuish-api-production.doug-lance.workers.dev',
			debug: config.debug ?? false,
		};

		this.client = new TuishClient({
			apiBaseUrl: this.config.apiBaseUrl,
			apiKey: this.config.apiKey,
			debug: this.config.debug,
		});

		this.storage = new LicenseStorage({
			storageDir: this.config.storageDir,
			debug: this.config.debug,
		});

		this.licenseManager = new LicenseManager({
			productId: this.config.productId,
			publicKey: this.config.publicKey,
			storage: this.storage,
			client: this.client,
			debug: this.config.debug,
		});
	}

	/**
	 * Check if the user has a valid license
	 * Performs offline verification first, then online validation if needed
	 */
	async checkLicense(): Promise<LicenseCheckResult> {
		return this.licenseManager.checkLicense();
	}

	/**
	 * Get the current machine fingerprint
	 */
	getMachineFingerprint(): string {
		return this.licenseManager.getMachineFingerprint();
	}

	// ============ Browser Purchase Flow ============

	/**
	 * Create a checkout session and open in browser for first-time purchase
	 * Returns the session ID for polling
	 */
	async purchaseInBrowser(options?: {
		email?: string;
		openBrowser?: boolean;
	}): Promise<CheckoutSessionResult> {
		const session = await this.client.createCheckoutSession({
			productId: this.config.productId,
			email: options?.email,
		});

		// Try to open browser
		const shouldOpen = options?.openBrowser !== false;
		if (shouldOpen) {
			await this.openUrl(session.checkoutUrl);
		}

		return session;
	}

	/**
	 * Poll for checkout completion
	 * Returns the license when checkout is complete
	 */
	async waitForCheckoutComplete(
		sessionId: string,
		options?: {
			pollIntervalMs?: number;
			timeoutMs?: number;
			onPoll?: (status: 'pending' | 'complete' | 'expired') => void;
		}
	): Promise<LicenseCheckResult> {
		const pollInterval = options?.pollIntervalMs ?? 2000;
		const timeout = options?.timeoutMs ?? 10 * 60 * 1000; // 10 minutes default
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const status = await this.client.getCheckoutStatus(sessionId);

			if (options?.onPoll) {
				options.onPoll(status.status);
			}

			if (status.status === 'complete' && status.licenseKey) {
				// Save the license key from the checkout response
				this.licenseManager.saveLicense(status.licenseKey);
				// Now verify the saved license
				return this.checkLicense();
			}

			if (status.status === 'expired') {
				return {
					valid: false,
					reason: 'expired',
					offlineVerified: false,
				};
			}

			// Wait before next poll
			await sleep(pollInterval);
		}

		return {
			valid: false,
			reason: 'network_error',
			offlineVerified: false,
		};
	}

	// ============ Terminal Purchase Flow ============

	/**
	 * Login with email (for returning customers)
	 * Sends OTP to verified phone number
	 */
	async requestLoginOtp(email: string): Promise<{
		otpId: string;
		phoneMasked: string;
		expiresIn: number;
	}> {
		return this.client.requestLoginOtp(email);
	}

	/**
	 * Verify login OTP and get identity token
	 */
	async verifyLogin(options: {
		email: string;
		otpId: string;
		otp: string;
	}): Promise<LoginResult> {
		const deviceFingerprint = this.getMachineFingerprint();
		const result = await this.client.verifyLogin({
			...options,
			deviceFingerprint,
		});

		// Store any active licenses
		for (const license of result.licenses) {
			if (license.status === 'active') {
				// TODO: Need to get the actual license key from the response
				// For now, the login flow returns license info but not the key
			}
		}

		return result;
	}

	/**
	 * Initialize terminal purchase (get saved cards)
	 * Must be logged in first
	 */
	async initTerminalPurchase(): Promise<PurchaseInitResult> {
		return this.client.initPurchase(this.config.productId);
	}

	/**
	 * Request OTP for purchase confirmation
	 * Must be logged in first
	 */
	async requestPurchaseOtp(): Promise<{ otpId: string; expiresIn: number }> {
		return this.client.requestPurchaseOtp();
	}

	/**
	 * Complete terminal purchase with saved card and OTP
	 * Must be logged in first
	 */
	async confirmTerminalPurchase(options: {
		cardId: string;
		otpId: string;
		otp: string;
	}): Promise<PurchaseConfirmResult> {
		const result = await this.client.confirmPurchase({
			productId: this.config.productId,
			...options,
		});

		if (result.success && result.license) {
			this.licenseManager.saveLicense(result.license);
		}

		return result;
	}

	/**
	 * Full terminal purchase flow for returning customers
	 * Handles login, OTP, and payment in one call
	 */
	async purchaseInTerminal(options: {
		email: string;
		getLoginOtp: (phoneMasked: string) => Promise<string>;
		selectCard: (cards: SavedCard[], amount: number, currency: string) => Promise<string>;
		getPurchaseOtp: (phoneMasked: string) => Promise<string>;
	}): Promise<PurchaseConfirmResult> {
		// Step 1: Request login OTP
		const loginOtp = await this.requestLoginOtp(options.email);

		// Step 2: Get OTP from user
		const loginCode = await options.getLoginOtp(loginOtp.phoneMasked);

		// Step 3: Verify login
		await this.verifyLogin({
			email: options.email,
			otpId: loginOtp.otpId,
			otp: loginCode,
		});

		// Step 4: Init purchase
		const purchase = await this.initTerminalPurchase();

		// Step 5: User selects card
		const cardId = await options.selectCard(purchase.cards, purchase.amount, purchase.currency);

		// Step 6: Request purchase OTP
		const purchaseOtp = await this.requestPurchaseOtp();

		// Step 7: Get purchase OTP from user
		const purchaseCode = await options.getPurchaseOtp(purchase.phoneMasked);

		// Step 8: Confirm purchase
		return this.confirmTerminalPurchase({
			cardId,
			otpId: purchaseOtp.otpId,
			otp: purchaseCode,
		});
	}

	// ============ License Management ============

	/**
	 * Store a license key manually (e.g., from a license file)
	 */
	storeLicense(licenseKey: string): void {
		this.licenseManager.saveLicense(licenseKey);
	}

	/**
	 * Get the cached license key
	 */
	getCachedLicenseKey(): string | null {
		return this.licenseManager.getCachedLicenseKey();
	}

	/**
	 * Clear the cached license
	 */
	clearLicense(): void {
		this.licenseManager.clearLicense();
	}

	/**
	 * Extract license info without verification (for display only)
	 */
	extractLicenseInfo(licenseKey: string): LicenseDetails | null {
		return this.licenseManager.extractLicenseInfo(licenseKey);
	}

	// ============ Utilities ============

	/**
	 * Open a URL in the default browser
	 */
	private async openUrl(url: string): Promise<void> {
		try {
			// Try to import 'open' package (peer dependency)
			const open = await import('open').then((m) => m.default);
			await open(url);
		} catch {
			// Fallback to platform-specific commands
			const currentPlatform = platform();
			const command =
				currentPlatform === 'darwin'
					? `open "${url}"`
					: currentPlatform === 'win32'
						? `start "${url}"`
						: `xdg-open "${url}"`;

			await new Promise<void>((resolve, reject) => {
				exec(command, (error: Error | null) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});
		}
	}

	/**
	 * Get the underlying API client for advanced usage
	 */
	getClient(): TuishClient {
		return this.client;
	}

	/**
	 * Get the license storage for advanced usage
	 */
	getStorage(): LicenseStorage {
		return this.storage;
	}
}
