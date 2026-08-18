/**
 * Credential vault.
 *
 * Dify providers need API keys, and the daemon expects them on every dispatch
 * call rather than storing them itself. That makes this plugin the credential
 * holder, so credentials are kept out of the state document, written with
 * owner-only permissions, and never returned to the browser: the settings UI
 * learns only whether a credential set exists.
 *
 * @module dsh-dify-marketplace/host/infrastructure/credential-vault
 */

import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { stateFileName } from '../../shared/identifier.ts'

/** One plugin's stored credential set. */
export interface StoredCredentials {
  pluginId: string
  /** Credential type the daemon should apply, when the provider declares one. */
  credentialType?: string
  values: Record<string, string>
  updatedAt: string
}

/** File-backed credential storage, one file per plugin. */
export class CredentialVault {
  /**
   * @param directory - absolute directory holding one file per plugin.
   */
  constructor(private readonly directory: string) {}

  /**
   * Build a vault at the conventional location inside the Harness home.
   * @param harnessHome - explicit harness home, otherwise resolved from the environment.
   * @returns the vault.
   */
  static inHarnessHome(harnessHome?: string): CredentialVault {
    const home = resolveDshHome(harnessHome)
    return new CredentialVault(join(home, 'storages', 'dify-marketplace', 'credentials'))
  }

  /** The absolute vault directory. */
  get path(): string {
    return this.directory
  }

  /**
   * Read one plugin's credentials.
   * @param pluginId - `<org>/<name>`.
   * @returns the stored set, or undefined when none is stored.
   */
  async read(pluginId: string): Promise<StoredCredentials | undefined> {
    try {
      const text = await readFile(this.fileFor(pluginId), 'utf8')
      return JSON.parse(text) as StoredCredentials
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
  }

  /**
   * Whether credentials exist for one plugin.
   * @param pluginId - `<org>/<name>`.
   * @returns true when a credential set is stored.
   */
  async has(pluginId: string): Promise<boolean> {
    return (await this.read(pluginId)) !== undefined
  }

  /**
   * Store one plugin's credentials, replacing any previous set.
   * @param pluginId - `<org>/<name>`.
   * @param values - credential field values.
   * @param credentialType - credential type declared by the provider, when any.
   */
  async write(
    pluginId: string,
    values: Record<string, string>,
    credentialType?: string,
  ): Promise<void> {
    const record: StoredCredentials = {
      pluginId,
      ...(credentialType === undefined ? {} : { credentialType }),
      values,
      updatedAt: new Date().toISOString(),
    }
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
    await chmod(this.directory, 0o700).catch(() => undefined)
    const target = this.fileFor(pluginId)
    const temp = `${target}.${process.pid}.tmp`
    await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 })
    await rename(temp, target)
  }

  /**
   * Delete one plugin's credentials.
   * @param pluginId - `<org>/<name>`.
   */
  async delete(pluginId: string): Promise<void> {
    await rm(this.fileFor(pluginId), { force: true })
  }

  /** Path of one plugin's credential file. */
  private fileFor(pluginId: string): string {
    return join(this.directory, stateFileName(pluginId))
  }
}
