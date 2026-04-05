import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  test: {
    include: ['client/src/__tests__/**/*.test.ts', 'server/src/__tests__/**/*.test.ts'],
  },
});
