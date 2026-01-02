import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/__tests__/*.integration.test.ts'],
		testTimeout: 10000,
		hookTimeout: 10000,
		// Ensure tests run sequentially to avoid port conflicts with mock server
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
	},
});
