/**
 * Model plugins become one invocation tool per supported model type.
 *
 * There is no `settings.models` slot to occupy on rc.7. Credentials live in
 * this plugin's own vault; invocation goes through daemon dispatch.
 *
 * @module dsh-dify-marketplace/runtime/adapters/model
 */

import { MODEL_TYPE_OPERATIONS } from '../../host/domain/capability.ts'
import { toolName } from '../../shared/identifier.ts'
import { collectChunks, defineDifyTool } from '../define-dify-tool.ts'
import type { CapabilityAdapter } from '../deps.ts'
import type { DispatchRoute } from '../../host/infrastructure/daemon-client.ts'

const ROUTE_BY_OPERATION: Record<string, DispatchRoute> = {
  llm: 'llmInvoke',
  embed: 'textEmbeddingInvoke',
  rerank: 'rerankInvoke',
  tts: 'ttsInvoke',
  speech2text: 'speech2textInvoke',
  moderation: 'moderationInvoke',
}

/** Model-provider adapter. */
export const registerModelAdapter: CapabilityAdapter = (ctx, config, deps) => {
  const names: string[] = []
  for (const type of config.snapshot.supportedModelTypes) {
    const operation = MODEL_TYPE_OPERATIONS[type]
    if (operation === undefined) continue
    const route = ROUTE_BY_OPERATION[operation]
    if (route === undefined) continue
    const publicName = toolName(config.org, config.name, operation)
    const definition = defineDifyTool({
      name: publicName,
      description: `Invoke Dify ${type} model from ${config.pluginId}.`,
      parameters: {
        model: { type: 'string', description: 'Model name declared by the provider.', required: true },
        input: { type: 'json', description: 'Provider-specific invocation payload.', required: true },
      },
      async execute(args, signal) {
        const stored = await deps.vault.read(config.pluginId)
        const payload = {
          provider: config.snapshot.provider,
          model: args.model,
          model_type: type,
          credentials: stored?.values ?? {},
          ...(typeof args.input === 'object' && args.input !== null ? args.input as Record<string, unknown> : {}),
        }
        if (operation === 'llm' || operation === 'tts') {
          return collectChunks(deps.daemon.dispatchStream(route, config.pluginId, payload, signal))
        }
        return deps.daemon.dispatch(route, config.pluginId, payload, signal) as Promise<Record<string, unknown>>
      },
    })
    ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`)
    names.push(publicName)
  }
  return names
}
