import { describe, expect, it } from 'vitest';
import { expectJson, isErrorResponse, runCli, runCliRaw } from './helpers.js';

describe('CLI Integration Tests', () => {
	describe('whoami', () => {
		it('returns authentication status as JSON', async () => {
			const result = await runCli(['whoami']);

			expectJson(result).toSucceed().toHaveProperty('authenticated');
		});

		it('returns apiKey property (null or truncated)', async () => {
			const result = await runCli(['whoami']);

			expectJson(result).toSucceed().toHaveProperty('apiKey');
		});
	});

	describe('no command', () => {
		it('returns error when no command specified', async () => {
			const result = await runCli([]);

			expectJson(result).toFail().toHaveError('No command specified');
		});
	});

	describe('unknown command', () => {
		it('returns JSON error for unknown command', async () => {
			const result = await runCli(['unknown-command']);

			expectJson(result).toFail().toHaveError('Unknown command');
		});
	});

	describe('products', () => {
		it('returns JSON response for products command', async () => {
			const result = await runCli(['products']);

			// Will either succeed with products list or fail with auth error
			expect(result.json).not.toBeNull();
			expect(result.exitCode).toBeDefined();
		});

		it('handles unknown subcommand', async () => {
			const result = await runCli(['products', 'unknown-subcommand']);

			// Will fail with either auth error or unknown subcommand error
			expect(result.exitCode).not.toBe(0);
			expect(isErrorResponse(result.json)).toBe(true);
		});
	});

	describe('products get', () => {
		it('requires --id flag when authenticated', async () => {
			const result = await runCli(['products', 'get']);

			// Will fail - either missing auth or missing --id
			expectJson(result).toFail();
		});
	});

	describe('products create', () => {
		it('requires flags when authenticated', async () => {
			const result = await runCli(['products', 'create']);

			// Will fail - missing required flags or auth
			expectJson(result).toFail();
		});
	});

	describe('licenses', () => {
		it('returns JSON response for licenses command', async () => {
			const result = await runCli(['licenses']);

			// Will either succeed with licenses list or fail with auth error
			expect(result.json).not.toBeNull();
		});
	});

	describe('customers', () => {
		it('returns JSON response for customers command', async () => {
			const result = await runCli(['customers']);

			// Will either succeed with customers list or fail with auth error
			expect(result.json).not.toBeNull();
		});
	});

	describe('analytics', () => {
		it('returns JSON response for analytics licenses', async () => {
			const result = await runCli(['analytics', 'licenses']);

			// Will either succeed or fail with auth error
			expect(result.json).not.toBeNull();
		});

		it('fails for analytics without subcommand', async () => {
			const result = await runCli(['analytics']);

			// Either fails auth or unknown subcommand
			expectJson(result).toFail();
		});
	});

	describe('webhooks', () => {
		it('returns JSON response for webhooks command', async () => {
			const result = await runCli(['webhooks']);

			// Will either succeed with webhooks list or fail with auth error
			expect(result.json).not.toBeNull();
		});
	});

	describe('connect', () => {
		it('returns JSON response for connect command', async () => {
			const result = await runCli(['connect']);

			// Will either succeed with connect status or fail with auth error
			expect(result.json).not.toBeNull();
		});

		it('returns JSON response for connect status subcommand', async () => {
			const result = await runCli(['connect', 'status']);

			// Will either succeed or fail with auth error
			expect(result.json).not.toBeNull();
		});
	});

	describe('login', () => {
		it('returns error when --key flag is missing', async () => {
			const result = await runCli(['login']);

			expectJson(result).toFail().toHaveError('Missing required flag: --key');
		});

		it('accepts --key flag and stores API key', async () => {
			// Note: This actually modifies the real config at ~/.tuish
			// In a real test suite, you'd want to mock or isolate this
			const result = await runCli([
				'login',
				'--key',
				'tuish_sk_integration_test',
			]);

			expectJson(result).toSucceed().toMatchObject({
				success: true,
				message: 'API key stored successfully',
			});
		});
	});

	describe('logout', () => {
		it('logs out successfully', async () => {
			const result = await runCli(['logout']);

			expectJson(result).toSucceed().toMatchObject({
				success: true,
				message: 'Logged out successfully',
			});
		});
	});

	describe('signup', () => {
		it('returns error when --email flag is missing', async () => {
			const result = await runCli(['signup']);

			expectJson(result).toFail().toHaveError('Missing required flag: --email');
		});
	});

	describe('--json flag behavior', () => {
		it('outputs valid JSON on success', async () => {
			const result = await runCli(['whoami']);

			expect(result.stdout).toBeTruthy();
			expect(() => JSON.parse(result.stdout)).not.toThrow();
		});

		it('outputs valid JSON on error', async () => {
			const result = await runCli(['unknown-command']);

			expect(result.stdout || result.stderr).toBeTruthy();
			// The CLI outputs errors to stderr as JSON
			const output = result.stderr || result.stdout;
			expect(() => JSON.parse(output)).not.toThrow();
		});
	});
});

describe('CLI Raw Output Tests', () => {
	describe('without --json flag', () => {
		it('can run without --json flag', async () => {
			const result = await runCliRaw(['whoami']);

			// Should still output something (may be JSON by default or formatted)
			expect(result.exitCode).toBeDefined();
		});
	});
});
