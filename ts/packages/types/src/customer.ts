// Customer (end user who buys TUIs) types

export interface Customer {
	id: string;
	email: string;
	phone: string | null;
	phoneVerified: boolean;
	stripeCustomerId: string | null;
	createdAt: number;
	updatedAt: number;
}

export interface CustomerPublic {
	id: string;
	email: string;
	phoneMasked: string | null;
	hasPaymentMethod: boolean;
	createdAt: number;
}

export interface Device {
	id: string;
	customerId: string;
	fingerprint: string;
	name: string | null;
	lastUsedAt: number | null;
	createdAt: number;
	revokedAt: number | null;
}

export interface Identity {
	customerId: string;
	email: string;
	phoneMasked: string | null;
	deviceId: string;
	deviceName: string | null;
}
