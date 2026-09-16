import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './apps/api/src'),
    },
  },
  test: {
    fileParallelism: false,
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-1234567890',
      MONGO_URI: 'mongodb://localhost:27017/lms_test',
      STORAGE_DRIVER: 'local',
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**'],
  },
});
