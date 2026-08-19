import { expect, test } from '@playwright/test'

/**
 * Settings journey against a running DeepSeek Harness web profile that has
 * this plugin installed. Export DSH_WEB_URL (the web origin) before running
 * `pnpm test:e2e:dsh`.
 */
const origin = process.env.DSH_WEB_URL

test.describe('DSH Settings Dify Marketplace', () => {
  test.use({ locale: 'en-US' })

  test.beforeAll(() => {
    if (origin === undefined || origin === '') {
      throw new Error(
        'DSH_WEB_URL is required for the Settings e2e journey. Start `dsh --profile web` and export the web origin.',
      )
    }
  })

  test('lists live marketplace plugins and searches', async ({ page }) => {
    await page.goto(origin as string, { waitUntil: 'domcontentloaded' })
    const configureLater = page.getByRole('button', { name: 'Configure later' })
    await configureLater.waitFor({ timeout: 15_000 }).catch(() => undefined)
    if (await configureLater.isVisible()) await configureLater.click()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await dialog.waitFor({ timeout: 15_000 })
    await dialog.getByRole('button', { name: 'Dify Marketplace' }).click()
    await expect(dialog.getByPlaceholder('Search plugins')).toBeVisible({ timeout: 30_000 })
    await dialog.getByPlaceholder('Search plugins').fill('google')
    await dialog.getByRole('button', { name: 'Search' }).click()
    await expect(dialog.getByText(/langgenius\//).first()).toBeVisible({ timeout: 30_000 })
  })
})
