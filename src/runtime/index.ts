/**
 * Per-installed-plugin Cordis child.
 *
 * The Host mounts one of these via `ctx.plugin(runtimeChild, config)` after a
 * successful daemon install (and again on boot from durable state). Unload of
 * the child disposes every tool and HTTP route it registered.
 *
 * @module dsh-dify-marketplace/runtime
 */

import type { Context } from '@deepseek-ai/cordis'
import '@deepseek-ai/dsh-host-webserver'
import '@deepseek-ai/dsh-tools'
import { categoryMapping } from '../host/domain/capability.ts'
import { DifyMarketplaceError } from '../host/domain/errors.ts'
import { registerAgentStrategyAdapter } from './adapters/agent-strategy.ts'
import { registerDatasourceAdapter } from './adapters/datasource.ts'
import { registerEndpointAdapter } from './adapters/endpoint.ts'
import { registerModelAdapter } from './adapters/model.ts'
import { registerToolAdapter } from './adapters/tool.ts'
import { registerTriggerAdapter } from './adapters/trigger.ts'
import type { RuntimeConfig } from './config.ts'
import type { CapabilityAdapter, RuntimeDeps } from './deps.ts'

export type { RuntimeConfig } from './config.ts'

/** Cordis plugin name. The Loader row id is `dify:<org>/<name>`, set by the registry. */
export const name = 'dify-plugin-runtime'

/** Tools always. webServer is required so extension plugins can register routes. */
export const inject = ['tools', 'webServer']

const ADAPTERS: Record<string, CapabilityAdapter> = {
  tool: registerToolAdapter,
  'agent-strategy': registerAgentStrategyAdapter,
  datasource: registerDatasourceAdapter,
  trigger: registerTriggerAdapter,
  model: registerModelAdapter,
  extension: registerEndpointAdapter,
}

let sharedDeps: RuntimeDeps | undefined

/**
 * Bind Host-owned daemon/vault handles the child fibers read during `apply`.
 * Called once from the Host plugin before any child is mounted.
 * @param deps - daemon client and credential vault.
 */
export function bindRuntimeDeps(deps: RuntimeDeps): void {
  sharedDeps = deps
}

/**
 * Register the adapter for this plugin's category.
 * @param ctx - child fiber context.
 * @param config - identity, snapshot, and daemon ids.
 */
export async function apply(ctx: Context, config: RuntimeConfig): Promise<void> {
  const mapping = categoryMapping(config.category)
  const adapter = ADAPTERS[config.category]
  if (adapter === undefined || mapping.surface === 'unsupported') {
    throw new DifyMarketplaceError(
      'capability_unsupported',
      `no adapter for Dify category "${config.category}"`,
    )
  }
  const deps = sharedDeps
  if (deps === undefined) {
    throw new DifyMarketplaceError(
      'registration_failed',
      `runtime child for ${config.pluginId} mounted before Host runtime dependencies were bound`,
    )
  }
  await adapter(ctx, config, deps)
}
