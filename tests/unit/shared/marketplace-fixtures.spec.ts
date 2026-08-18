import { describe, expect, it } from 'vitest'
import { parseUniqueIdentifier } from '../../../src/shared/identifier.ts'
import { loadCapture, type CapturedEnvelope } from '../../helpers/marketplace-fixtures.ts'

describe('marketplace fixture envelopes', () => {
  it('records success as HTTP 200 with envelope code 0', () => {
    const capture = loadCapture('plugins-search-advanced.json')
    expect(capture.response.status).toBe(200)
    const envelope = capture.response.body as CapturedEnvelope
    expect(envelope.code).toBe(0)
    expect(envelope.msg).toBeDefined()
  })

  it('records a missing plugin as HTTP 404 with envelope code -1', () => {
    const capture = loadCapture('plugin-detail-unknown.json')
    expect(capture.response.status).toBe(404)
    const envelope = capture.response.body as CapturedEnvelope
    expect(envelope.code).toBe(-1)
    expect(envelope.msg).toBe('plugin not found')
  })

  it('records an invalid install-count ping as HTTP 400 with envelope code -1', () => {
    const capture = loadCapture('stats-install-count-invalid.json')
    expect(capture.response.status).toBe(400)
    const envelope = capture.response.body as CapturedEnvelope
    expect(envelope.code).toBe(-1)
  })

  it('filters the Extensions tab with category extension, not endpoint', () => {
    const capture = loadCapture('plugins-search-category-extension.json')
    expect(capture.request.body).toMatchObject({ category: 'extension' })
    const envelope = capture.response.body as CapturedEnvelope & {
      data: { plugins: { category: string }[] }
    }
    expect(envelope.data.plugins.every(plugin => plugin.category === 'extension')).toBe(true)
  })

  it('hyphenates the agent-strategy category filter', () => {
    const capture = loadCapture('plugins-search-category-agent-strategy.json')
    expect(capture.request.body).toMatchObject({ category: 'agent-strategy' })
  })

  it('uses org/name:version@sha256 as the unique identifier', () => {
    const capture = loadCapture('plugin-detail.json')
    const envelope = capture.response.body as {
      data: { plugin: { latest_package_identifier: string } }
    }
    expect(parseUniqueIdentifier(envelope.data.plugin.latest_package_identifier).pluginId)
      .toBe('langgenius/google')
  })

  it('records download-url as HTTP 302', () => {
    const capture = loadCapture('plugin-download-url.json')
    expect(capture.response.status).toBe(302)
    expect(capture.response.location).toMatch(/\.difypkg/)
  })

  it('records an empty bundles search as total 0, not an error', () => {
    const capture = loadCapture('bundles-search-advanced.json')
    expect(capture.response.status).toBe(200)
    const envelope = capture.response.body as CapturedEnvelope & { data: { total: number, bundles: unknown[] } }
    expect(envelope.code).toBe(0)
    expect(envelope.data.total).toBe(0)
    expect(envelope.data.bundles).toEqual([])
  })
})
