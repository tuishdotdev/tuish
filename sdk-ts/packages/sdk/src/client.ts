import type {
	CheckoutSessionResult,
	LicenseDetails,
	LoginResult,
	OtpRequestResult,
	PurchaseConfirmResult,
	PurchaseInitResult,
} from './types';

const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';

/**
 * Standard error codes from the Tuish API
 */
export type ErrorCode =
	| 'not_found'
	| 'invalid_request'
	| 'unauthorized'
	| 'forbidden'
	| 'conflict'
	| 'internal_error';

/**
 * API error with structured information
 */
export class TuishApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly code?: ErrorCode,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'TuishApiError';
	}
}

/**
 * Standard error response from API
 */
interface ApiErrorResponse {
	error: {
		code: ErrorCode;
		message: string;
	};
}

/**
 * Standard list response from API
 */
interface ApiListResponse<T> {
	data: T[];
	meta: {
		cursor?: string;
		hasMore?: boolean;
		total?: number;
	};
}

/**
 * Product resource
 */
export interface Product {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	priceCents: number;
	currency: string;
	billingType: 'one_time' | 'subscription';
	features: string[];
	createdAt: number;
	updatedAt: number;
}

/**
 * License resource
 */
export interface License {
	id: string;
	customerId: string;
	productId: string;
	status: 'active' | 'expired' | 'revoked';
	features: string[];
	quota: number | null;
	quotaUsed: number | null;
	issuedAt: number;
	expiresAt: number | null;
	revokedAt: number | null;
	licenseKey?: string;
	createdAt: number;
}

/**
 * Usage report response
 */
export interface UsageReport {
	quota: number | null;
	quotaUsed: number;
	quotaRemaining: number | null;
}

/**
 * Developer signup result (flat response with apiKey)
 */
export interface SignupResult {
	id: string;
	email: string;
	name: string | null;
	createdAt: number;
	apiKey: string;
}

/**
 * HTTP client for tuish API
 */
export class TuishClient {
	private readonly baseUrl: string;
	private readonly debug: boolean;
	private apiKey?: string;
	private identityToken?: string;

	constructor(options: {
		apiBaseUrl?: string;
		apiKey?: string;
		debug?: boolean;
	}) {
		this.baseUrl = options.apiBaseUrl ?? DEFAULT_API_URL;
		this.apiKey = options.apiKey;
		this.debug = options.debug ?? false;
	}

	/**
	 * Set the identity token for authenticated requests
	 */
	setIdentityToken(token: string): void {
		this.identityToken = token;
	}

	/**
	 * Clear the identity token
	 */
	clearIdentityToken(): void {
		this.identityToken = undefined;
	}

	/**
	 * Make an HTTP request
	 * Single resources are returned flat, lists have { data: [...], meta: {...} }
	 */
	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
		options?: { useApiKey?: boolean; useIdentityToken?: boolean },
	): Promise<T> {
		const url = `${this.baseUrl}${path}`;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (options?.useApiKey && this.apiKey) {
			headers['X-API-Key'] = this.apiKey;
		}

		if (options?.useIdentityToken && this.identityToken) {
			headers.Authorization = `Bearer ${this.identityToken}`;
		}

		if (this.debug) {
			console.log(`[tuish] ${method} ${url}`);
		}

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		const responseText = await response.text();
		let data: T | ApiErrorResponse;

		try {
			data = JSON.parse(responseText) as T | ApiErrorResponse;
		} catch {
			throw new TuishApiError(
				`Invalid JSON response: ${responseText.slice(0, 100)}`,
				response.status,
			);
		}

		if (!response.ok) {
			const errorResponse = data as ApiErrorResponse;
			throw new TuishApiError(
				errorResponse.error?.message ??
					`Request failed with status ${response.status}`,
				response.status,
				errorResponse.error?.code,
			);
		}

		// Responses are now flat - no unwrapping needed
		return data as T;
	}

	// ============ Developer API ============

	/**
	 * Sign up as a developer
	 * Returns flat response with id, email, name, createdAt, and apiKey
	 */
	async signup(options: {
		email: string;
		name?: string;
	}): Promise<SignupResult> {
		return this.request<SignupResult>('POST', '/v1/developers/signup', options);
	}

	// ============ Products API ============

	/**
	 * Create a product
	 */
	async createProduct(options: {
		slug: string;
		name: string;
		description?: string;
		priceCents: number;
		currency?: 'usd' | 'eur' | 'gbp';
		billingType: 'one_time' | 'subscription';
		features?: string[];
	}): Promise<Product> {
		return this.request<Product>('POST', '/v1/products', options, {
			useApiKey: true,
		});
	}

	/**
	 * List products
	 * Returns { data: Product[], meta: {...} }
	 */
	async listProducts(): Promise<ApiListResponse<Product>> {
		return this.request<ApiListResponse<Product>>(
			'GET',
			'/v1/products',
			undefined,
			{
				useApiKey: true,
			},
		);
	}

	/**
	 * Update a product
	 */
	async updateProduct(
		productId: string,
		options: {
			name?: string;
			description?: string | null;
			priceCents?: number;
			features?: string[] | null;
		},
	): Promise<Product> {
		return this.request<Product>(
			'PATCH',
			`/v1/products/${productId}`,
			options,
			{
				useApiKey: true,
			},
		);
	}

	// ============ Checkout API ============

	/**
	 * Create a browser checkout session
	 */
	async createCheckoutSession(options: {
		productId: string;
		email?: string;
		successUrl?: string;
		cancelUrl?: string;
	}): Promise<CheckoutSessionResult> {
		return this.request<CheckoutSessionResult>(
			'POST',
			'/v1/checkout/init',
			options,
			{
				useApiKey: true,
			},
		);
	}

	/**
	 * Check checkout session status
	 */
	async getCheckoutStatus(sessionId: string): Promise<{
		status: 'pending' | 'complete' | 'expired';
		licenseKey?: string;
		license?: LicenseDetails;
	}> {
		return this.request<{
			status: 'pending' | 'complete' | 'expired';
			licenseKey?: string;
			license?: LicenseDetails;
		}>('GET', `/v1/checkout/status/${sessionId}`);
	}

	// ============ Auth API ============

	/**
	 * Request OTP for login
	 */
	async requestLoginOtp(email: string): Promise<OtpRequestResult> {
		return this.request<OtpRequestResult>('POST', '/v1/auth/login/init', {
			email,
		});
	}

	/**
	 * Verify OTP and login
	 */
	async verifyLogin(options: {
		email: string;
		otpId: string;
		otp: string;
		deviceFingerprint: string;
	}): Promise<LoginResult> {
		const result = await this.request<LoginResult>(
			'POST',
			'/v1/auth/login/verify',
			options,
		);
		this.identityToken = result.identityToken;
		return result;
	}

	// ============ Purchase API ============

	/**
	 * Initialize terminal purchase (get saved cards)
	 */
	async initPurchase(productId: string): Promise<PurchaseInitResult> {
		return this.request<PurchaseInitResult>(
			'POST',
			'/v1/purchase/init',
			{ productId },
			{ useIdentityToken: true },
		);
	}

	/**
	 * Request OTP for purchase confirmation
	 */
	async requestPurchaseOtp(): Promise<{ otpId: string; expiresIn: number }> {
		return this.request<{ otpId: string; expiresIn: number }>(
			'POST',
			'/v1/purchase/otp',
			undefined,
			{ useIdentityToken: true },
		);
	}

	/**
	 * Confirm purchase with OTP
	 */
	async confirmPurchase(options: {
		productId: string;
		cardId: string;
		otpId: string;
		otp: string;
	}): Promise<PurchaseConfirmResult> {
		return this.request<PurchaseConfirmResult>(
			'POST',
			'/v1/purchase/confirm',
			options,
			{
				useIdentityToken: true,
			},
		);
	}

	// ============ License API ============

	/**
	 * Validate license online
	 */
	async validateLicense(options: {
		licenseKey: string;
		machineFingerprint: string;
	}): Promise<{
		valid: boolean;
		license?: LicenseDetails;
		reason?: string;
	}> {
		return this.request<{
			valid: boolean;
			license?: LicenseDetails;
			reason?: string;
		}>('POST', '/v1/licenses/validate', options, { useApiKey: true });
	}

	/**
	 * Issue a new license
	 */
	async issueLicense(options: {
		customerId: string;
		productId: string;
		features?: string[];
		quota?: number;
		expiresAt?: string;
	}): Promise<License> {
		return this.request<License>('POST', '/v1/licenses', options, {
			useApiKey: true,
		});
	}

	/**
	 * List licenses with optional filters
	 * Returns { data: License[], meta: {...} }
	 */
	async listLicenses(filters?: {
		customerId?: string;
		productId?: string;
		status?: 'active' | 'expired' | 'revoked';
		cursor?: string;
		limit?: number;
	}): Promise<ApiListResponse<License>> {
		const params = new URLSearchParams();
		if (filters?.customerId) params.set('customerId', filters.customerId);
		if (filters?.productId) params.set('productId', filters.productId);
		if (filters?.status) params.set('status', filters.status);
		if (filters?.cursor) params.set('cursor', filters.cursor);
		if (filters?.limit) params.set('limit', filters.limit.toString());

		const queryString = params.toString();
		const path = queryString ? `/v1/licenses?${queryString}` : '/v1/licenses';

		return this.request<ApiListResponse<License>>('GET', path, undefined, {
			useApiKey: true,
		});
	}

	/**
	 * Get a single license by ID
	 */
	async getLicense(licenseId: string): Promise<License> {
		return this.request<License>(
			'GET',
			`/v1/licenses/${licenseId}`,
			undefined,
			{
				useApiKey: true,
			},
		);
	}

	/**
	 * Update a license
	 */
	async updateLicense(
		licenseId: string,
		options: {
			features?: string[];
			quota?: number | null;
		},
	): Promise<License> {
		return this.request<License>(
			'PATCH',
			`/v1/licenses/${licenseId}`,
			options,
			{
				useApiKey: true,
			},
		);
	}

	/**
	 * Revoke a license
	 */
	async revokeLicense(licenseId: string): Promise<License> {
		return this.request<License>(
			'POST',
			`/v1/licenses/${licenseId}/revoke`,
			undefined,
			{
				useApiKey: true,
			},
		);
	}

	/**
	 * Reinstate a revoked license
	 */
	async reinstateLicense(licenseId: string): Promise<License> {
		return this.request<License>(
			'POST',
			`/v1/licenses/${licenseId}/reinstate`,
			undefined,
			{
				useApiKey: true,
			},
		);
	}

	/**
	 * Report usage for a license
	 */
	async reportUsage(
		licenseId: string,
		amount: number,
		description?: string,
	): Promise<UsageReport> {
		return this.request<UsageReport>(
			'POST',
			`/v1/licenses/${licenseId}/usage`,
			{ amount, description },
			{
				useApiKey: true,
			},
		);
	}

	// ============ Connect API ============

	/**
	 * Get Stripe Connect status
	 */
	async getConnectStatus(): Promise<{
		connected: boolean;
		accountId: string | null;
	}> {
		return this.request<{ connected: boolean; accountId: string | null }>(
			'GET',
			'/v1/connect/status',
			undefined,
			{ useApiKey: true },
		);
	}

	/**
	 * Start Stripe Connect OAuth flow
	 */
	async startConnect(): Promise<{ authUrl: string }> {
		return this.request<{ authUrl: string }>(
			'POST',
			'/v1/connect/start',
			undefined,
			{
				useApiKey: true,
			},
		);
	}
}
