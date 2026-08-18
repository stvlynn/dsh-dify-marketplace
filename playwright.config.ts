import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config.
 *
 * - `marketplace` always hits live marketplace.dify.ai (information architecture).
 * - `dsh` is a gated project: it needs DSH_WEB_URL pointing at a web profile
 *   with this plugin installed. It is not skipped when selected.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'X-Dify-Version': '999.0.0',
    },
  },
  projects: [
    {
      name: 'marketplace',
      testMatch: /marketplace-ia\.spec\.ts/,
    },
    {
      name: 'dsh',
      testMatch: /dsh-settings\.spec\.ts/,
    },
  ],
})
