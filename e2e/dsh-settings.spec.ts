import { expect, test } from '@playwright/test'

/**
 * Settings journey against a running DeepSeek Harness web profile that has
 * this plugin installed. Export DSH_WEB_URL (the web origin) before running
 * `pnpm test:e2e --project=dsh`.
 */
const origin = process.env.DSH_WEB_URL

test.describe('DSH Settings Dify Marketplace', () => {
  test.beforeAll(() => {
    if (origin === undefined || origin === '') {
      throw new Error(
        'DSH_WEB_URL is required for the Settings e2e journey. Start `dsh --profile web` and export the web origin.',
      )
    }
  })

  test('lists live marketplace plugins and searches', async ({ page }) => {
    await page.goto(origin as string, { waitUntil: 'domcontentloaded' })
    await page.getByText('Dify Marketplace', { exact: true }).first().click()
    await expect(page.getByText('Marketplace reachable')).toBeVisible({ timeout: 30_000 })
    await page.getByPlaceholder('Search plugins').fill('google')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText(/langgenius\//).first()).toBeVisible({ timeout: 30_000 })
  })
})
