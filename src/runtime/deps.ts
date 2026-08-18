/**
 * Dependencies the runtime adapters share with the Host.
 *
 * @module dsh-dify-marketplace/runtime/deps
 */

import type { Context } from '@deepseek-ai/cordis'
import type { DaemonClient } from '../host/infrastructure/daemon-client.ts'
import type { CredentialVault } from '../host/infrastructure/credential-vault.ts'
import type { RuntimeConfig } from './config.ts'

/** Host-owned services a child fiber may use. */
export interface RuntimeDeps {
  daemon: DaemonClient
  vault: CredentialVault
}

/** Cordis context after `tools` (and optionally `webServer` / `llm`) is injected. */
export type RuntimeContext = Context

/** One adapter: register DSH surfaces for one plugin, return public tool names. */
export type CapabilityAdapter = (
  ctx: RuntimeContext,
  config: RuntimeConfig,
  deps: RuntimeDeps,
) => Promise<string[]> | string[]
