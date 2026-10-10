import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('./tests/unit/server-only-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/security/**/*.test.ts'],
    environment: 'node',
  },
});
