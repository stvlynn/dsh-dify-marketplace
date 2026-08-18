import { describe, expect, it } from 'vitest'
import { DifyIdentifierError, loaderEntryId, parsePluginId, parseUniqueIdentifier, stateFileName, toolName } from '../../../src/shared/identifier.ts'
import { loadCapture } from '../../helpers/marketplace-fixtures.ts'

const GOOGLE_ID = 'langgenius/google:0.1.6@f9bdc225b84abfaca4865e7d71b503410fb40b8bd7e23b9f7d2b49554f906260'

describe('parseUniqueIdentifier', () => {
  it('parses the identifier captured from langgenius/google', () => {
    const capture = loadCapture('plugin-detail.json')
    const body = capture.response.body as { data: { plugin: { latest_package_identifier: string } } }
    const parsed = parseUniqueIdentifier(body.data.plugin.latest_package_identifier)
    expect(parsed).toEqual({
      org: 'langgenius',
      name: 'google',
      version: '0.1.6',
      checksum: 'f9bdc225b84abfaca4865e7d71b503410fb40b8bd7e23b9f7d2b49554f906260',
      pluginId: 'langgenius/google',
      uniqueIdentifier: GOOGLE_ID,
    })
  })

  it('rejects a string that is not org/name:version@sha256', () => {
    expect(() => parseUniqueIdentifier('langgenius/google')).toThrow(DifyIdentifierError)
  })
})

describe('parsePluginId', () => {
  it('splits org and name', () => {
    expect(parsePluginId('langgenius/google')).toEqual({ org: 'langgenius', name: 'google' })
  })

  it('rejects extra path segments', () => {
    expect(() => parsePluginId('langgenius/google/extra')).toThrow(DifyIdentifierError)
  })
})

describe('loaderEntryId and stateFileName', () => {
  it('namespaces the Loader row with dify:', () => {
    expect(loaderEntryId('langgenius/google')).toBe('dify:langgenius/google')
  })

  it('uses a path-separator-free vault basename', () => {
    expect(stateFileName('langgenius/google')).toBe('langgenius__google.json')
  })
})

describe('toolName', () => {
  it('uses the server-qualified shape for short names', () => {
    expect(toolName('langgenius', 'google', 'google_search')).toBe('dify__langgenius__google__google_search')
  })

  it('stays at or under 64 characters and stays distinct after truncation', () => {
    const long = toolName('org', 'plugin', 'a'.repeat(80))
    expect(long.length).toBeLessThanOrEqual(64)
    expect(long.startsWith('dify__org__plugin__')).toBe(true)
    const other = toolName('org', 'plugin', `${'a'.repeat(79)}b`)
    expect(other).not.toBe(long)
  })
})
