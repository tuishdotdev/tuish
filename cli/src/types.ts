import type { Screen } from './app.js';

export type CliFlags = {
	email?: string;
	name?: string;
	key?: string;
	slug?: string;
	desc?: string;
	price?: string;
	billing?: string;
	id?: string;
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
