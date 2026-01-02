// Product types

export type BillingType = 'one_time' | 'subscription';

export interface Product {
	id: string;
	developerId: string;
	slug: string;
	name: string;
	description: string | null;
	priceCents: number;
	currency: string;
	billingType: BillingType;
	features: string[];
	stripePriceId: string | null;
	createdAt: number;
	updatedAt: number;
}

export interface ProductPublic {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	priceCents: number;
	currency: string;
	billingType: BillingType;
	features: string[];
}

export interface CreateProductInput {
	slug: string;
	name: string;
	description?: string;
	priceCents: number;
	currency?: string;
	billingType: BillingType;
	features?: string[];
}

export interface UpdateProductInput {
	name?: string;
	description?: string;
	priceCents?: number;
	features?: string[];
}
