/**
 * Durable install state.
 *
 * Registration must survive a Harness restart: the daemon keeps its own
 * installation records, but it knows nothing about which DSH tools were
 * registered for them or which category adapter owns each plugin. This store is
 * that missing half, written under the Harness home so it shares the lifetime of
 * the profile that installed the plugins.
 *
 * Writes are atomic (temp file plus rename) and serialized through a promise
 * chain, because an install completing while the settings UI reads the list must
 * never observe a half-written file.
 *
 * @module dsh-dify-marketplace/host/infrastructure/state-store
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type { MarketplacePluginCategory } from '../../shared/contracts/marketplace.ts'
import type { PluginSnapshot } from '../domain/snapshot.ts'

/** Everything the Host must remember about one installed Dify plugin. */
export interface InstalledPluginState {
  pluginId: string
  org: string
  name: string
  uniqueIdentifier: string
  version: string
  category: MarketplacePluginCategory
  /** Daemon installation id, required to uninstall. */
  installationId: string
  label: Record<string, string>
  icon: string
  /** Tool names registered for this plugin at install time. */
  toolNames: string[]
  /** Provider name the daemon dispatches to (tool/model/agent-strategy provider). */
  provider: string
  /** Whether credentials are stored in the vault for this plugin. */
  credentialsStored: boolean
  /** ISO timestamp of the install that produced this record. */
  installedAt: string
  /** Declaration fields adapters need on boot, independent of the marketplace. */
  snapshot: PluginSnapshot
  /** Daemon endpoint hook id, when an extension plugin has one. */
  endpointHookId?: string
}

/** The complete persisted document. */
export interface StateDocument {
  /** Schema version, bumped when the shape changes incompatibly. */
  version: 1
  plugins: InstalledPluginState[]
}

const EMPTY: StateDocument = { version: 1, plugins: [] }

/** Atomic, serialized JSON state for installed Dify plugins. */
export class StateStore {
  private readonly filePath: string
  private queue: Promise<unknown> = Promise.resolve()
  private cache: StateDocument | undefined

  /**
   * @param filePath - absolute path of the state file.
   */
  constructor(filePath: string) {
    this.filePath = filePath
  }

  /**
   * Build a store at the conventional location inside the Harness home.
   * @param harnessHome - explicit harness home, otherwise resolved from the environment.
   * @returns the store.
   */
  static inHarnessHome(harnessHome?: string): StateStore {
    const home = resolveDshHome(harnessHome)
    return new StateStore(join(home, 'storages', 'dify-marketplace', 'installed.json'))
  }

  /** The absolute state file path. */
  get path(): string {
    return this.filePath
  }

  /**
   * Read the current document.
   *
   * A missing file is an empty document, not an error: that is the state of a
   * profile that has never installed a Dify plugin.
   * @returns the persisted document.
   */
  async read(): Promise<StateDocument> {
    if (this.cache !== undefined) return this.cache
    try {
      const text = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(text) as StateDocument
      const document: StateDocument = parsed.version === 1 && Array.isArray(parsed.plugins)
        ? parsed
        : { ...EMPTY }
      this.cache = document
      return document
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = { ...EMPTY }
        return this.cache
      }
      throw error
    }
  }

  /** Every recorded plugin. */
  async list(): Promise<InstalledPluginState[]> {
    return (await this.read()).plugins
  }

  /**
   * Look up one plugin.
   * @param pluginId - `<org>/<name>`.
   * @returns the record, or undefined when absent.
   */
  async get(pluginId: string): Promise<InstalledPluginState | undefined> {
    return (await this.read()).plugins.find(plugin => plugin.pluginId === pluginId)
  }

  /**
   * Insert or replace one record.
   * @param state - the record to persist.
   */
  async upsert(state: InstalledPluginState): Promise<void> {
    await this.mutate((document) => {
      const others = document.plugins.filter(plugin => plugin.pluginId !== state.pluginId)
      return { version: 1, plugins: [...others, state] }
    })
  }

  /**
   * Remove one record.
   * @param pluginId - `<org>/<name>`.
   * @returns true when a record was removed.
   */
  async remove(pluginId: string): Promise<boolean> {
    let removed = false
    await this.mutate((document) => {
      const remaining = document.plugins.filter(plugin => plugin.pluginId !== pluginId)
      removed = remaining.length !== document.plugins.length
      return { version: 1, plugins: remaining }
    })
    return removed
  }

  /**
   * Apply a patch to one record.
   * @param pluginId - `<org>/<name>`.
   * @param patch - fields to overwrite.
   * @returns the updated record, or undefined when absent.
   */
  async patch(
    pluginId: string,
    patch: Partial<InstalledPluginState>,
  ): Promise<InstalledPluginState | undefined> {
    let updated: InstalledPluginState | undefined
    await this.mutate((document) => {
      const plugins = document.plugins.map((plugin) => {
        if (plugin.pluginId !== pluginId) return plugin
        updated = { ...plugin, ...patch }
        return updated
      })
      return { version: 1, plugins }
    })
    return updated
  }

  /** Serialize one read-modify-write cycle and persist it atomically. */
  private async mutate(update: (document: StateDocument) => StateDocument): Promise<void> {
    const run = this.queue.then(async () => {
      const current = await this.read()
      const next = update(current)
      await mkdir(dirname(this.filePath), { recursive: true })
      const temp = `${this.filePath}.${process.pid}.tmp`
      await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
      await rename(temp, this.filePath)
      this.cache = next
    })
    this.queue = run.catch(() => undefined)
    await run
  }
}
