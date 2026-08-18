/**
 * Register each agent strategy as one model-facing DSH tool.
 *
 * @module dsh-dify-marketplace/runtime/adapters/agent-strategy
 */

import { toolName } from '../../shared/identifier.ts'
import { collectChunks, defineDifyTool } from '../define-dify-tool.ts'
import { mapToolParameters } from '../parameters.ts'
import type { CapabilityAdapter } from '../deps.ts'

/** Agent-strategy adapter. */
export const registerAgentStrategyAdapter: CapabilityAdapter = (ctx, config, deps) => {
  const names: string[] = []
  for (const strategy of config.snapshot.strategies) {
    const publicName = toolName(config.org, config.name, strategy.name)
    const definition = defineDifyTool({
      name: publicName,
      description: strategy.description || `Dify agent strategy ${strategy.name}`,
      parameters: mapToolParameters(strategy.parameters),
      async execute(args, signal) {
        return collectChunks(deps.daemon.dispatchStream('agentStrategyInvoke', config.pluginId, {
          agent_strategy_provider: config.snapshot.provider,
          agent_strategy: strategy.name,
          agent_strategy_params: args,
        }, signal))
      },
    })
    ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`)
    names.push(publicName)
  }
  return names
}
