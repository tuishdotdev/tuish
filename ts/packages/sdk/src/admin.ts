/**
 * Admin SDK exports
 *
 * For developers managing their Tuish products, licenses, and integrations.
 * Use this for CRUD operations on products, licenses, webhooks, and analytics.
 *
 * @example
 * ```typescript
 * import { TuishClient } from '@tuish/sdk/admin';
 *
 * const client = new TuishClient({ apiKey: 'tuish_dev_xxx' });
 *
 * // Manage products
 * const products = await client.listProducts();
 * const product = await client.createProduct({
 *   slug: 'my-cli',
 *   name: 'My CLI Pro',
 *   priceCents: 2999,
 *   billingType: 'one_time',
 * });
 *
 * // Manage licenses
 * const licenses = await client.listLicenses({ productId: product.id });
 * await client.revokeLicense(licenseId);
 * ```
 */

export { TuishClient, TuishApiError } from './client';

export type {
	ErrorCode,
	Product,
	License,
	UsageReport,
	SignupResult,
} from './client';
