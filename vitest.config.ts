import { defineConfig } from 'vitest/config'

/**
 * Unit suite: deterministic, no network, no daemon, no browser. Suites that
 * touch the live marketplace or a running plugin daemon live in
 * `vitest.integration.config.ts`; the browser suite lives in `playwright.config.ts`.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx'],
    exclude: ['e2e/**', '**/node_modules/**'],
    pool: 'forks',
    testTimeout: 20_000,
    projects: [
      {
        test: {
          name: 'host',
          include: ['tests/unit/{host,shared}/**/*.spec.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'client',
          include: ['tests/unit/client/**/*.spec.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
    ],
  },
})
