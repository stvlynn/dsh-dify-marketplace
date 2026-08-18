import { defineConfig } from 'vitest/config'

/**
 * Integration suite. These tests talk to real systems:
 *
 * - `tests/integration/marketplace/*` calls the live Dify Marketplace API
 *   (`pnpm test:integration`).
 * - `tests/integration/daemon/*` calls a running dify-plugin-daemon
 *   (`pnpm daemon:up && pnpm test:integration:daemon`).
 *
 * Nothing here is mocked. A missing daemon fails the daemon suite loudly
 * instead of silently skipping, so a green daemon run always means a real
 * round trip.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 300_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
})
