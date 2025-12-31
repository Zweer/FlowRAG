import { defineConfig } from 'tsdown';

export default defineConfig({
  workspace: { include: 'packages/*' },
  entry: ['lib/index.ts'],
  format: 'esm',
  dts: true,
  sourcemap: true,
  clean: false,
  outDir: 'lib',
});
