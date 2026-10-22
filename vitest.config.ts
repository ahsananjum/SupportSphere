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
    include: [
      'tests/unit/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/upgrade/**/*.test.ts',
    ],
    environment: 'node',
    pool: 'threads',
    // The server-only alias resolves through a generated Vitest SSR module.
    // Running files in parallel can remove that temporary module while another
    // worker is still importing it on Windows. Keep the default test command
    // deterministic; individual tests still run concurrently within a file.
    fileParallelism: false,
  },
});
