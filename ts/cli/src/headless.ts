import { createConfig } from './lib/config.js';
import type { CliFlags } from './types.js';

const config = createConfig();

const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';
const DEV_API_URL = 'http://localhost:8787';

type ApiResponse<T> = T | { error: { code: string; message: string } };

function getApiUrl(): string {
	return process.env.TUISH_DEV ? DEV_API_URL : DEFAULT_API_URL;
}

function getApiKey(): string | undefined {
	return config.get('apiKey');
}

async function apiRequest<T>(
	method: string,
	path: string,
	body?: unknown,
): Promise<T> {
	const apiKey = getApiKey();
	const apiUrl = getApiUrl();
	const url = `${apiUrl}${path}`;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (apiKey) {
		headers['x-api-key'] = apiKey;
	}

	const response = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	const data = (await response.json()) as ApiResponse<T>;

	if (!response.ok) {
		const errorData = data as { error?: string; code?: string };
		throw new Error(
			errorData.error ?? `Request failed with status ${response.status}`,
		);
	}

	return data as T;
}

function requireAuth(): void {
	const apiKey = getApiKey();
	if (!apiKey) {
		throw new Error('No API key found; run tuish login');
	}
}

function requireFlag(
	flags: CliFlags,
	flagName: Exclude<keyof CliFlags, 'json'>,
	description: string,
): string {
	const value = flags[flagName];
	if (!value || typeof value !== 'string') {
		throw new Error(`Missing required flag: --${flagName} (${description})`);
	}
	return value;
}

// ============================================================================
// Products Handlers
// ============================================================================

async function handleProducts(
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<object> {
	requireAuth();

	switch (subcommand) {
		case undefined:
		case 'list':
			return apiRequest('GET', '/v1/developers/products');

		case 'get': {
			const id = requireFlag(flags, 'id', 'Product ID');
			return apiRequest('GET', `/v1/developers/products/${id}`);
		}

		case 'create': {
			const name = requireFlag(flags, 'name', 'Product name');
			const slug = requireFlag(flags, 'slug', 'URL slug');
			const priceStr = requireFlag(flags, 'price', 'Price in dollars');
			const priceCents = Math.round(Number.parseFloat(priceStr) * 100);
			const billingType = (flags.billing ?? 'one_time') as 'one_time' | 'subscription';

			return apiRequest('POST', '/v1/developers/products', {
				name,
				slug,
				description: flags.desc,
				priceCents,
				currency: 'usd',
				billingType,
			});
		}

		case 'update': {
			const id = requireFlag(flags, 'id', 'Product ID');
			const updateData: Record<string, unknown> = {};
			if (flags.name) updateData.name = flags.name;
			if (flags.desc !== undefined) updateData.description = flags.desc;
			if (flags.price) updateData.priceCents = Math.round(Number.parseFloat(flags.price) * 100);
			return apiRequest('PATCH', `/v1/developers/products/${id}`, updateData);
		}

		case 'delete': {
			const id = requireFlag(flags, 'id', 'Product ID');
			return apiRequest('DELETE', `/v1/developers/products/${id}`);
		}

		default:
			throw new Error(`Unknown products subcommand: ${subcommand}`);
	}
}

// ============================================================================
// Licenses Handlers
// ============================================================================

async function handleLicenses(
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<object> {
	requireAuth();

	switch (subcommand) {
		case undefined:
		case 'list': {
			const params = new URLSearchParams();
			if (flags.product) params.set('productId', flags.product);
			if (flags.customer) params.set('customerId', flags.customer);
			const queryString = params.toString();
			const path = queryString ? `/v1/licenses?${queryString}` : '/v1/licenses';
			return apiRequest('GET', path);
		}

		case 'get': {
			const id = requireFlag(flags, 'id', 'License ID');
			return apiRequest('GET', `/v1/licenses/${id}`);
		}

		case 'issue': {
			const customerId = requireFlag(flags, 'customer', 'Customer ID');
			const productId = requireFlag(flags, 'product', 'Product ID');
			return apiRequest('POST', '/v1/licenses', {
				customerId,
				productId,
				features: flags.features?.split(','),
			});
		}

		case 'revoke': {
			const id = requireFlag(flags, 'id', 'License ID');
			return apiRequest('POST', `/v1/licenses/${id}/revoke`);
		}

		case 'reinstate': {
			const id = requireFlag(flags, 'id', 'License ID');
			return apiRequest('POST', `/v1/licenses/${id}/reinstate`);
		}

		case 'usage': {
			const id = requireFlag(flags, 'id', 'License ID');
			const amountStr = requireFlag(flags, 'amount', 'Usage amount');
			const amount = Number.parseInt(amountStr, 10);
			return apiRequest('POST', `/v1/licenses/${id}/usage`, { amount });
		}

		default:
			throw new Error(`Unknown licenses subcommand: ${subcommand}`);
	}
}

// ============================================================================
// Customers Handlers
// ============================================================================

async function handleCustomers(
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<object> {
	requireAuth();

	switch (subcommand) {
		case undefined:
		case 'list':
			return apiRequest('GET', '/v1/customers');

		case 'get': {
			const id = requireFlag(flags, 'id', 'Customer ID');
			return apiRequest('GET', `/v1/customers/${id}`);
		}

		case 'licenses': {
			const id = requireFlag(flags, 'id', 'Customer ID');
			return apiRequest('GET', `/v1/customers/${id}/licenses`);
		}

		default:
			throw new Error(`Unknown customers subcommand: ${subcommand}`);
	}
}

// ============================================================================
// Analytics Handlers
// ============================================================================

async function handleAnalytics(
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<object> {
	requireAuth();

	switch (subcommand) {
		case 'licenses': {
			const params = new URLSearchParams();
			if (flags.period) params.set('period', flags.period);
			const queryString = params.toString();
			const path = queryString ? `/v1/analytics/licenses?${queryString}` : '/v1/analytics/licenses';
			return apiRequest('GET', path);
		}

		case 'features':
			return apiRequest('GET', '/v1/analytics/features');

		case 'devices':
			return apiRequest('GET', '/v1/analytics/devices');

		default:
			throw new Error(`Unknown analytics subcommand: ${subcommand}. Available: licenses, features, devices`);
	}
}

// ============================================================================
// Webhooks Handlers
// ============================================================================

async function handleWebhooks(
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<object> {
	requireAuth();

	switch (subcommand) {
		case undefined:
		case 'list':
			return apiRequest('GET', '/v1/developer-webhooks');

		case 'create': {
			const url = requireFlag(flags, 'url', 'Webhook URL');
			const eventsStr = flags.events;
			const events = eventsStr?.split(',') ?? [];
			return apiRequest('POST', '/v1/developer-webhooks', { url, events });
		}

		case 'delete': {
			const id = requireFlag(flags, 'id', 'Webhook ID');
			return apiRequest('DELETE', `/v1/developer-webhooks/${id}`);
		}

		case 'test': {
			const id = requireFlag(flags, 'id', 'Webhook ID');
			return apiRequest('POST', `/v1/developer-webhooks/${id}/test`);
		}

		default:
			throw new Error(`Unknown webhooks subcommand: ${subcommand}`);
	}
}

// ============================================================================
// Connect Handlers
// ============================================================================

async function handleConnect(
	subcommand: string | undefined,
): Promise<object> {
	requireAuth();

	switch (subcommand) {
		case undefined:
		case 'status':
			return apiRequest('GET', '/v1/connect/status');

		case 'start':
			return apiRequest('POST', '/v1/connect/start');

		default:
			throw new Error(`Unknown connect subcommand: ${subcommand}`);
	}
}

// ============================================================================
// Auth Handlers
// ============================================================================

async function handleSignup(flags: CliFlags): Promise<object> {
	const email = requireFlag(flags, 'email', 'Developer email');
	const name = flags.name;

	return apiRequest('POST', '/v1/developers/signup', { email, name });
}

async function handleLogin(flags: CliFlags): Promise<object> {
	const key = flags.apiKey ?? flags.key;
	if (!key) {
		throw new Error('API key is required');
	}

	// Store the API key
	config.set('apiKey', key);

	return { success: true, message: 'API key stored successfully' };
}

function handleLogout(): object {
	config.delete('apiKey');
	return { success: true, message: 'Logged out successfully' };
}

function handleWhoami(): object {
	const apiKey = getApiKey();
	return {
		authenticated: !!apiKey,
		apiKey: apiKey ? `${apiKey.slice(0, 20)}...` : null,
	};
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function runHeadless(
	command: string | undefined,
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<void> {
	try {
		const result = await executeCommand(command, subcommand, flags);
		console.log(JSON.stringify(result, null, 2));
		process.exit(0);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(JSON.stringify({ error: message }, null, 2));
		process.exit(1);
	}
}

async function executeCommand(
	command: string | undefined,
	subcommand: string | undefined,
	flags: CliFlags,
): Promise<object> {
	switch (command) {
		case 'whoami':
			return handleWhoami();

		case 'signup':
			return handleSignup(flags);

		case 'login':
			return handleLogin(flags);

		case 'logout':
			return handleLogout();

		case 'connect':
			return handleConnect(subcommand);

		case 'products':
			return handleProducts(subcommand, flags);

		case 'licenses':
			return handleLicenses(subcommand, flags);

		case 'customers':
			return handleCustomers(subcommand, flags);

		case 'analytics':
			return handleAnalytics(subcommand, flags);

		case 'webhooks':
			return handleWebhooks(subcommand, flags);

		default:
			if (!command) {
				throw new Error('No command specified. Use --help for available commands.');
			}
			throw new Error(`Unknown command: ${command}. Use --help for available commands.`);
	}
}
