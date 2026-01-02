import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters/index.ts',
    'src/commands/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
});
