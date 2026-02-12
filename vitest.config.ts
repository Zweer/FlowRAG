import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/*.e2e.test.ts', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/**/src/**/*.ts'],
      exclude: [
        '**/src/index.ts', // Barrel re-exports only
        '**/src/types.ts', // Type/interface declarations only
        '**/src/interfaces/**', // Interface declarations only
      ],
    },
  },
});
