import { expect, test } from '@playwright/test'

test.describe('live marketplace.dify.ai information architecture', () => {
  test('homepage loads and exposes category filters', async ({ page }) => {
    const response = await page.goto('https://marketplace.dify.ai/', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBe(true)
    await expect(page).toHaveTitle('Dify Marketplace')
    await expect(page.getByRole('heading', { name: 'Discover. Extend. Build.' })).toBeVisible()
    for (const label of ['Models', 'Tools', 'Extensions', 'Bundles']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
  })

  test('search API returns plugins with unique identifiers', async ({ request }) => {
    const response = await request.post('https://marketplace.dify.ai/api/v1/plugins/search/advanced', {
      headers: {
        'content-type': 'application/json',
        'X-Dify-Version': '1.10.0',
      },
      data: { page: 1, page_size: 3, query: 'google' },
    })
    expect(response.ok()).toBe(true)
    const body = await response.json() as {
      code: number
      data: { plugins: { latest_package_identifier: string }[], total: number }
    }
    expect(body.code).toBe(0)
    expect(body.data.total).toBeGreaterThan(0)
    expect(body.data.plugins[0]?.latest_package_identifier).toMatch(/@/)
  })
})
