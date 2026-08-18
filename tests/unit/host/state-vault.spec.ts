import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CredentialVault } from '../../../src/host/infrastructure/credential-vault.ts'
import { StateStore, type InstalledPluginState } from '../../../src/host/infrastructure/state-store.ts'
import { stateFileName } from '../../../src/shared/identifier.ts'

function sample(pluginId = 'langgenius/google'): InstalledPluginState {
  return {
    pluginId,
    org: 'langgenius',
    name: 'google',
    uniqueIdentifier: 'langgenius/google:0.1.6@f9bdc225b84abfaca4865e7d71b503410fb40b8bd7e23b9f7d2b49554f906260',
    version: '0.1.6',
    category: 'tool',
    installationId: 'install-1',
    label: { en_US: 'Google' },
    icon: 'icon.svg',
    toolNames: ['dify__langgenius__google__google_search'],
    provider: 'google',
    credentialsStored: false,
    installedAt: '2024-01-01T00:00:00.000Z',
    snapshot: {
      provider: 'google',
      credentialFields: [],
      tools: [],
      strategies: [],
      supportedModelTypes: [],
      endpoint: false,
    },
  }
}

describe('StateStore', () => {
  let dir = ''

  afterEach(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
  })

  it('writes atomically and round-trips a record', async () => {
    dir = await mkdtemp(join(tmpdir(), 'dify-state-'))
    const store = new StateStore(join(dir, 'installed.json'))
    await store.upsert(sample())
    expect((await store.list()).map(record => record.pluginId)).toEqual(['langgenius/google'])
    const text = await readFile(join(dir, 'installed.json'), 'utf8')
    expect(JSON.parse(text).version).toBe(1)
  })
})

describe('CredentialVault', () => {
  let dir = ''

  afterEach(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
  })

  it('stores credentials in an owner-only file named after the plugin id', async () => {
    dir = await mkdtemp(join(tmpdir(), 'dify-vault-'))
    const vault = new CredentialVault(dir)
    await vault.write('langgenius/google', { serpapi_api_key: 'secret' })
    const stored = await vault.read('langgenius/google')
    expect(stored?.values).toEqual({ serpapi_api_key: 'secret' })
    expect(stateFileName('langgenius/google')).toBe('langgenius__google.json')
  })
})
