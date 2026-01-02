// API Request/Response types

export interface ApiError {
	code: string;
	message: string;
	details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: ApiError;
}

// Checkout
export interface CheckoutInitRequest {
	productId: string;
	email?: string;
	successUrl?: string;
	cancelUrl?: string;
}

export interface CheckoutInitResponse {
	sessionId: string;
	checkoutUrl: string;
}

export interface CheckoutStatusResponse {
	status: 'pending' | 'complete' | 'expired';
	identityToken?: string;
	license?: string;
}

// Auth
export interface LoginInitRequest {
	email: string;
}

export interface LoginInitResponse {
	otpId: string;
	phoneMasked: string;
	expiresIn: number;
}

export interface LoginVerifyRequest {
	email: string;
	otpId: string;
	otp: string;
	deviceFingerprint: string;
}

export interface LoginVerifyResponse {
	identityToken: string;
	licenses: LicenseInfo[];
}

// Purchase
export interface PurchaseInitRequest {
	productId: string;
}

export interface SavedCard {
	id: string;
	brand: string;
	last4: string;
	expiryMonth: number;
	expiryYear: number;
}

export interface PurchaseInitResponse {
	cards: SavedCard[];
	amount: number;
	currency: string;
	phoneMasked: string;
	productName: string;
}

export interface PurchaseConfirmRequest {
	productId: string;
	cardId: string;
	otpId: string;
	otp: string;
}

export interface PurchaseConfirmResponse {
	success: boolean;
	license: string;
	receiptUrl: string;
	requiresAction?: boolean;
	actionUrl?: string;
}

// License validation
export interface LicenseValidateRequest {
	licenseKey: string;
	machineFingerprint: string;
}

export interface LicenseInfo {
	id: string;
	productId: string;
	productName: string;
	features: string[];
	status: 'active' | 'expired' | 'revoked';
	issuedAt: number;
	expiresAt: number | null;
}

export interface LicenseValidateResponse {
	valid: boolean;
	license?: LicenseInfo;
	reason?: 'expired' | 'revoked' | 'invalid' | 'machine_mismatch';
}

// Usage
export interface UsageRecordRequest {
	eventType: string;
	quantity: number;
	idempotencyKey?: string;
}

export interface UsageRecordResponse {
	recorded: boolean;
	eventId: string;
}
