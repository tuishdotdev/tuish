import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

type MockHandler = (request: IncomingMessage) => object | Promise<object>;

interface MockServerConfig {
	port?: number;
}

interface MockServer {
	/**
	 * Start the mock server on the configured port.
	 */
	start: () => Promise<void>;

	/**
	 * Stop the mock server.
	 */
	stop: () => Promise<void>;

	/**
	 * Register a mock handler for a specific HTTP method and path.
	 *
	 * @param method - HTTP method (GET, POST, PATCH, DELETE)
	 * @param path - URL path to match
	 * @param response - Static response object or handler function
	 *
	 * @example
	 * ```ts
	 * server.mock('GET', '/v1/developers/products', { products: [] });
	 * server.mock('POST', '/v1/developers/products', (req) => ({ product: { id: 'prod_123' } }));
	 * ```
	 */
	mock: (method: string, path: string, response: object | MockHandler) => void;

	/**
	 * Register a mock handler that matches based on URL prefix.
	 * Useful for parameterized routes.
	 *
	 * @example
	 * ```ts
	 * server.mockPrefix('GET', '/v1/developers/products/', (req) => {
	 *   const id = req.url?.split('/').pop();
	 *   return { product: { id } };
	 * });
	 * ```
	 */
	mockPrefix: (
		method: string,
		pathPrefix: string,
		response: object | MockHandler,
	) => void;

	/**
	 * Clear all registered mock handlers.
	 */
	reset: () => void;

	/**
	 * Get the base URL for the mock server.
	 */
	baseUrl: string;

	/**
	 * Get the port the server is running on.
	 */
	port: number;
}

/**
 * Create a mock API server for isolated CLI integration tests.
 * This allows testing CLI behavior without hitting the real API.
 *
 * @example
 * ```ts
 * const server = createMockApiServer({ port: 8788 });
 *
 * beforeAll(async () => {
 *   await server.start();
 *   server.mock('GET', '/v1/developers/products', { products: [] });
 * });
 *
 * afterAll(async () => {
 *   await server.stop();
 * });
 *
 * it('lists products', async () => {
 *   const result = await runCli(['products'], {
 *     TUISH_API_URL: server.baseUrl,
 *   });
 *   // assertions...
 * });
 * ```
 */
export function createMockApiServer(config: MockServerConfig = {}): MockServer {
	const serverPort = config.port ?? 8788;
	const handlers: Map<string, MockHandler> = new Map();
	const prefixHandlers: Map<string, MockHandler> = new Map();
	let server: Server | null = null;

	const handleRequest = async (
		request: IncomingMessage,
		response: ServerResponse,
	): Promise<void> => {
		const method = request.method ?? 'GET';
		const url = request.url ?? '/';

		// Strip query string for matching
		const path = url.split('?')[0];
		const key = `${method} ${path}`;

		response.setHeader('Content-Type', 'application/json');
		response.setHeader('Access-Control-Allow-Origin', '*');
		response.setHeader(
			'Access-Control-Allow-Methods',
			'GET, POST, PATCH, DELETE, OPTIONS',
		);
		response.setHeader(
			'Access-Control-Allow-Headers',
			'Content-Type, x-api-key',
		);

		// Handle CORS preflight
		if (method === 'OPTIONS') {
			response.statusCode = 204;
			response.end();
			return;
		}

		// Try exact match first
		let handler = handlers.get(key);

		// Try prefix match if no exact match
		if (!handler) {
			for (const [prefixKey, prefixHandler] of prefixHandlers) {
				if (key.startsWith(prefixKey)) {
					handler = prefixHandler;
					break;
				}
			}
		}

		if (handler) {
			try {
				const result = await handler(request);
				response.statusCode = 200;
				response.end(JSON.stringify(result));
			} catch (error) {
				response.statusCode = 500;
				response.end(
					JSON.stringify({
						error: {
							code: 'internal_error',
							message:
								error instanceof Error ? error.message : 'Unknown error',
						},
					}),
				);
			}
		} else {
			response.statusCode = 404;
			response.end(
				JSON.stringify({
					error: {
						code: 'not_found',
						message: `No handler for ${method} ${path}`,
					},
				}),
			);
		}
	};

	return {
		start: () =>
			new Promise<void>((resolve, reject) => {
				server = createServer((request, response) => {
					handleRequest(request, response).catch((error: unknown) => {
						console.error('Mock server error:', error);
						response.statusCode = 500;
						response.end(JSON.stringify({ error: 'Internal server error' }));
					});
				});

				server.on('error', reject);
				server.listen(serverPort, () => resolve());
			}),

		stop: () =>
			new Promise<void>((resolve, reject) => {
				if (server) {
					server.close((error) => {
						if (error) {
							reject(error);
						} else {
							server = null;
							resolve();
						}
					});
				} else {
					resolve();
				}
			}),

		mock: (method: string, path: string, response: object | MockHandler) => {
			const handler: MockHandler =
				typeof response === 'function'
					? (response as MockHandler)
					: () => response;
			handlers.set(`${method} ${path}`, handler);
		},

		mockPrefix: (
			method: string,
			pathPrefix: string,
			response: object | MockHandler,
		) => {
			const handler: MockHandler =
				typeof response === 'function'
					? (response as MockHandler)
					: () => response;
			prefixHandlers.set(`${method} ${pathPrefix}`, handler);
		},

		reset: () => {
			handlers.clear();
			prefixHandlers.clear();
		},

		get baseUrl() {
			return `http://localhost:${serverPort}`;
		},

		get port() {
			return serverPort;
		},
	};
}

/**
 * Pre-configured mock responses for common API endpoints.
 * Use these as starting points for tests.
 */
export const mockResponses = {
	emptyProducts: { products: [] },

	singleProduct: {
		product: {
			id: 'prod_test123',
			name: 'Test Product',
			slug: 'test-product',
			description: 'A test product',
			priceCents: 999,
			currency: 'usd',
			billingType: 'one_time',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
		},
	},

	productsList: {
		products: [
			{
				id: 'prod_test123',
				name: 'Test Product',
				slug: 'test-product',
				priceCents: 999,
				currency: 'usd',
				billingType: 'one_time',
			},
		],
	},

	emptyLicenses: { licenses: [] },

	emptyCustomers: { customers: [] },

	connectStatus: {
		connected: false,
		stripeAccountId: null,
	},

	connectStatusConnected: {
		connected: true,
		stripeAccountId: 'acct_test123',
	},

	authError: {
		error: {
			code: 'unauthorized',
			message: 'Invalid or missing API key',
		},
	},

	notFoundError: {
		error: {
			code: 'not_found',
			message: 'Resource not found',
		},
	},
};
