import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/consumer.ts', 'src/admin.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	sourcemap: true,
	target: 'node20',
	splitting: false,
});
