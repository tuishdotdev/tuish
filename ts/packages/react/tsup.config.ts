import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', '@tuish/sdk'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
