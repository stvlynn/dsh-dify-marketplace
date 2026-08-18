import { describe, expect, it } from 'vitest'
import {
  categoryMapping,
  DATASOURCE_OPERATIONS,
  projectedToolNames,
  projectedToolNamesFromSnapshot,
  supportedCategories,
  TRIGGER_OPERATIONS,
} from '../../../src/host/domain/capability.ts'
import { snapshotFromDetail } from '../../../src/host/domain/snapshot.ts'
import { toolName } from '../../../src/shared/identifier.ts'
import type { MarketplacePluginDetail } from '../../../src/shared/contracts/marketplace.ts'
import { loadCapture } from '../../helpers/marketplace-fixtures.ts'

describe('categoryMapping', () => {
  it('maps every marketplace category this build registers', () => {
    expect(categoryMapping('tool').surface).toBe('tools')
    expect(categoryMapping('agent-strategy').surface).toBe('tools')
    expect(categoryMapping('datasource').surface).toBe('tools')
    expect(categoryMapping('trigger').surface).toBe('tools')
    expect(categoryMapping('model').surface).toBe('model-provider')
    expect(categoryMapping('extension').surface).toBe('http-endpoint')
  })

  it('treats unknown categories as unsupported rather than throwing', () => {
    expect(categoryMapping('unknown').surface).toBe('unsupported')
  })

  it('lists only supported categories for the status payload', () => {
    expect(supportedCategories()).toEqual([
      'tool',
      'agent-strategy',
      'datasource',
      'trigger',
      'model',
      'extension',
    ])
  })
})

describe('projectedToolNames', () => {
  it('projects the captured Google tool names', () => {
    const capture = loadCapture('plugin-detail.json')
    const body = capture.response.body as { data: { plugin: MarketplacePluginDetail } }
    expect(projectedToolNames(body.data.plugin)).toEqual([
      toolName('langgenius', 'google', 'google_search'),
      toolName('langgenius', 'google', 'google_image_search'),
    ])
  })

  it('projects fixed operations for datasource and trigger plugins', () => {
    expect(projectedToolNamesFromSnapshot('org', 'files', 'datasource', {
      tools: [],
      strategies: [],
      supportedModelTypes: [],
    })).toEqual(DATASOURCE_OPERATIONS.map(operation => toolName('org', 'files', operation)))
    expect(projectedToolNamesFromSnapshot('org', 'hook', 'trigger', {
      tools: [],
      strategies: [],
      supportedModelTypes: [],
    })).toEqual(TRIGGER_OPERATIONS.map(operation => toolName('org', 'hook', operation)))
  })
})

describe('snapshotFromDetail', () => {
  it('keeps provider, tools, and credentials from the captured Google detail', () => {
    const capture = loadCapture('plugin-detail.json')
    const body = capture.response.body as { data: { plugin: MarketplacePluginDetail } }
    const snapshot = snapshotFromDetail(body.data.plugin)
    expect(snapshot.provider).toBe('google')
    expect(snapshot.tools.map(tool => tool.name)).toEqual(['google_search', 'google_image_search'])
    expect(snapshot.endpoint).toBe(false)
  })
})
