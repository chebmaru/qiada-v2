import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    env: {
      DOTENV_CONFIG_PATH: resolve(__dirname, '../.env'),
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
