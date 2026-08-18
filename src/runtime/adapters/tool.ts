/**
 * Register each Dify tool as a model-facing DSH tool.
 *
 * @module dsh-dify-marketplace/runtime/adapters/tool
 */

import { toolName } from '../../shared/identifier.ts'
import { collectChunks, defineDifyTool } from '../define-dify-tool.ts'
import { mapToolParameters } from '../parameters.ts'
import type { CapabilityAdapter } from '../deps.ts'

/** Tool-category adapter. */
export const registerToolAdapter: CapabilityAdapter = (ctx, config, deps) => {
  const names: string[] = []
  for (const tool of config.snapshot.tools) {
    const publicName = toolName(config.org, config.name, tool.name)
    const definition = defineDifyTool({
      name: publicName,
      description: tool.description,
      parameters: mapToolParameters(tool.parameters),
      async execute(args, signal) {
        const stored = await deps.vault.read(config.pluginId)
        return collectChunks(deps.daemon.dispatchStream('toolInvoke', config.pluginId, {
          provider: config.snapshot.provider,
          tool: tool.name,
          tool_parameters: args,
          credentials: stored?.values ?? {},
          ...(stored?.credentialType === undefined ? {} : { credential_type: stored.credentialType }),
        }, signal))
      },
    })
    ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`)
    names.push(publicName)
  }
  return names
}
