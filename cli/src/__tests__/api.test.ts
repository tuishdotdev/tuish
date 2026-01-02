import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TuishApiError, TuishDeveloperApi } from '../lib/api.js';

const API_BASE_URL =
	process.env.TUISH_TEST_API_URL ||
	'https://tuish-api-production.doug-lance.workers.dev';

describe('TuishDeveloperApi', () => {
	let api: TuishDeveloperApi;
	let testApiKey: string;
	let testProductId: string;
	const testEmail = `test-${Date.now()}@example.com`;

	beforeAll(() => {
		api = new TuishDeveloperApi({ apiBaseUrl: API_BASE_URL });
	});

	describe('signup', () => {
		it('should create a new developer account', async () => {
			const result = await api.signup({
				email: testEmail,
				name: 'Test Developer',
			});

			expect(result.developer).toBeDefined();
			expect(result.developer.id).toMatch(/^dev_/);
			expect(result.developer.email).toBe(testEmail);
			expect(result.developer.name).toBe('Test Developer');
			expect(result.apiKey).toMatch(/^tuish_sk_/);

			testApiKey = result.apiKey;
		});

		it('should reject duplicate email', async () => {
			await expect(
				api.signup({ email: testEmail, name: 'Duplicate' }),
			).rejects.toThrow(TuishApiError);
		});
	});

	describe('products (authenticated)', () => {
		let authenticatedApi: TuishDeveloperApi;
		let stripeConnected = false;

		beforeAll(() => {
			authenticatedApi = new TuishDeveloperApi({
				apiBaseUrl: API_BASE_URL,
				apiKey: testApiKey,
			});
		});

		it('should list products (initially empty)', async () => {
			const result = await authenticatedApi.listProducts();
			expect(result.products).toBeInstanceOf(Array);
		});

		it('should create a product (or fail if Stripe not connected)', async () => {
			try {
				const result = await authenticatedApi.createProduct({
					name: 'Test Product',
					slug: `test-product-${Date.now()}`,
					description: 'A test product',
					priceCents: 999,
					currency: 'usd',
					billingType: 'one_time',
				});

				expect(result.product).toBeDefined();
				expect(result.product.id).toMatch(/^prod_/);
				expect(result.product.name).toBe('Test Product');
				expect(result.product.priceCents).toBe(999);

				testProductId = result.product.id;
				stripeConnected = true;
			} catch (error) {
				// Expected when Stripe not connected - test passes
				expect(error).toBeInstanceOf(TuishApiError);
				expect((error as TuishApiError).message).toMatch(/Stripe/i);
			}
		});

		it('should list products (with created product)', async () => {
			if (!stripeConnected) {
				// Skip if product creation failed due to no Stripe
				return;
			}
			const result = await authenticatedApi.listProducts();
			expect(result.products.length).toBeGreaterThan(0);
			expect(result.products.some((p) => p.id === testProductId)).toBe(true);
		});

		it('should update a product', async () => {
			if (!stripeConnected || !testProductId) {
				// Skip if no product was created
				return;
			}
			const result = await authenticatedApi.updateProduct(testProductId, {
				name: 'Updated Product',
				priceCents: 1999,
			});

			expect(result.product.name).toBe('Updated Product');
			expect(result.product.priceCents).toBe(1999);
		});

		it('should reject update for non-existent product', async () => {
			await expect(
				authenticatedApi.updateProduct('prod_nonexistent', { name: 'Nope' }),
			).rejects.toThrow(TuishApiError);
		});
	});

	describe('authentication errors', () => {
		it('should reject requests without API key', async () => {
			const unauthApi = new TuishDeveloperApi({ apiBaseUrl: API_BASE_URL });
			await expect(unauthApi.listProducts()).rejects.toThrow(TuishApiError);
		});

		it('should reject requests with invalid API key', async () => {
			const badApi = new TuishDeveloperApi({
				apiBaseUrl: API_BASE_URL,
				apiKey: 'tuish_sk_invalid',
			});
			await expect(badApi.listProducts()).rejects.toThrow(TuishApiError);
		});
	});
});
