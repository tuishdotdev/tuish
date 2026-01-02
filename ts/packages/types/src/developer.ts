// Developer (our customer who builds TUIs) types

export interface Developer {
	id: string;
	email: string;
	name: string | null;
	stripeAccountId: string | null;
	apiKeyHash: string;
	createdAt: number;
	updatedAt: number;
}

export interface DeveloperPublic {
	id: string;
	email: string;
	name: string | null;
	hasStripeAccount: boolean;
	createdAt: number;
}

export interface CreateDeveloperInput {
	email: string;
	name?: string;
}

export interface UpdateDeveloperInput {
	name?: string;
}
