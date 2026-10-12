import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Next's webpack dev compiler serializes CSS endpoint writes on Windows;
  // concurrent workers can abort an otherwise valid navigation mid-rebuild.
  workers: 1,
  timeout: 90_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command:
      'node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
