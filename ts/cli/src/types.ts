import type { Screen } from './app.js';

export type CliFlags = {
	// Common
	json?: boolean;
	email?: string;
	name?: string;
	key?: string;
	apiKey?: string;
	id?: string;
	// Products
	slug?: string;
	desc?: string;
	price?: string;
	billing?: string;
	// Licenses (developer admin)
	customer?: string;
	product?: string;
	features?: string;
	amount?: string;
	// License (end-user)
	licenseKey?: string;
	productId?: string;
	publicKey?: string;
	// Analytics
	period?: string;
	// Webhooks
	url?: string;
	events?: string;
};

export type ScreenProps = {
	isInteractiveMode: boolean;
	navigate: (screen: Screen) => void;
	goBack: () => void;
	onAuthSuccess: (apiKey: string) => void;
	onLogout: () => void;
	flags?: CliFlags;
};

export type Product = {
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
};

export type CreateProductInput = {
	slug: string;
	name: string;
	description?: string;
	priceCents: number;
	currency: 'usd' | 'eur' | 'gbp';
	billingType: 'one_time' | 'subscription';
	features?: string[];
};

export type UpdateProductInput = {
	name?: string;
	description?: string | null;
	priceCents?: number;
	features?: string[] | null;
};
