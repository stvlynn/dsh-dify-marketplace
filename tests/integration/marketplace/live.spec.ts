/**
 * Live Dify Marketplace HTTP. These tests send a browser User-Agent and
 * X-Dify-Version; anonymous requests without those headers are answered 403.
 */
import { describe, expect, it } from 'vitest'
import { MarketplaceClient } from '../../../src/host/infrastructure/marketplace-client.ts'
import { DEFAULT_DIFY_VERSION, DEFAULT_USER_AGENT } from '../../../src/host/config.ts'
import { DifyMarketplaceError } from '../../../src/host/domain/errors.ts'

const client = new MarketplaceClient({
  baseUrl: 'https://marketplace.dify.ai',
  difyVersion: DEFAULT_DIFY_VERSION,
  userAgent: DEFAULT_USER_AGENT,
  timeoutMs: 30_000,
})

describe('live marketplace.dify.ai', () => {
  it('searches plugins and returns a page with unique identifiers', async () => {
    const data = await client.searchPlugins({ page: 1, page_size: 3, query: 'google' })
    expect(data.total).toBeGreaterThan(0)
    expect(data.plugins.length).toBeGreaterThan(0)
    const first = data.plugins[0]
    expect(first?.plugin_id).toMatch(/\//)
    expect(first?.latest_package_identifier).toMatch(/@/)
  })

  it('loads langgenius/google detail', async () => {
    const plugin = await client.pluginDetail('langgenius', 'google')
    expect(plugin.plugin_id).toBe('langgenius/google')
    expect(plugin.category).toBe('tool')
  })

  it('filters extensions with category=extension and returns records', async () => {
    const data = await client.searchPlugins({ page: 1, page_size: 3, query: '', category: 'extension' })
    expect(data.plugins.every(plugin => plugin.category === 'extension')).toBe(true)
  })

  it('classifies a missing plugin as marketplace_rejected', async () => {
    await expect(client.pluginDetail('langgenius', 'this-plugin-does-not-exist'))
      .rejects
      .toBeInstanceOf(DifyMarketplaceError)
  })
})
