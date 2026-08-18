import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { missingPrimitives, REQUIRED_PRIMITIVES } from '../../../src/client/shared/primitives.ts'
import { MARKETPLACE_TABS } from '../../../src/client/shared/tabs.ts'
import { en, zh } from '../../../src/client/shared/locales.ts'

describe('missingPrimitives', () => {
  it('lists every required primitive that the host module omitted', () => {
    expect(missingPrimitives({}, REQUIRED_PRIMITIVES)).toEqual([...REQUIRED_PRIMITIVES])
    expect(missingPrimitives({ Button: () => null, Input: () => null, Pill: () => null, StateDot: () => null }))
      .toEqual([])
  })
})

describe('marketplace tabs', () => {
  it('reproduce the captured homepage tab labels, then Installed', () => {
    const iaPath = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/marketplace/playwright-ia.json')
    const ia = JSON.parse(readFileSync(iaPath, 'utf8')) as {
      page: { tabs: { label: string }[] }
    }
    const captured = ia.page.tabs.map(tab => tab.label)
    const labels = MARKETPLACE_TABS
      .filter(tab => tab.id !== 'installed')
      .map(tab => en[tab.key])
    expect(labels).toEqual(captured)
    expect(MARKETPLACE_TABS.at(-1)?.id).toBe('installed')
  })

  it('has a Chinese string for every English key', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })
})
