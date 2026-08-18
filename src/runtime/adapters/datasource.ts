/**
 * Datasource plugins become browse and fetch tools.
 *
 * @module dsh-dify-marketplace/runtime/adapters/datasource
 */

import { DATASOURCE_OPERATIONS } from '../../host/domain/capability.ts'
import { toolName } from '../../shared/identifier.ts'
import { collectChunks, defineDifyTool } from '../define-dify-tool.ts'
import type { CapabilityAdapter } from '../deps.ts'

/** Datasource adapter. */
export const registerDatasourceAdapter: CapabilityAdapter = (ctx, config, deps) => {
  const names: string[] = []
  for (const operation of DATASOURCE_OPERATIONS) {
    const publicName = toolName(config.org, config.name, operation)
    const route = operation === 'browse' ? 'datasourceOnlineDriveBrowseFiles' : 'datasourceOnlineDocumentPageContent'
    const definition = defineDifyTool({
      name: publicName,
      description: operation === 'browse'
        ? `Browse files exposed by Dify datasource ${config.pluginId}.`
        : `Fetch a page or file from Dify datasource ${config.pluginId}.`,
      parameters: {
        query: { type: 'json', description: 'Datasource operation payload.', required: true },
      },
      async execute(args, signal) {
        const stored = await deps.vault.read(config.pluginId)
        const payload = {
          provider: config.snapshot.provider,
          credentials: stored?.values ?? {},
          ...(typeof args.query === 'object' && args.query !== null ? args.query as Record<string, unknown> : {}),
        }
        return collectChunks(deps.daemon.dispatchStream(route, config.pluginId, payload, signal))
      },
    })
    ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`)
    names.push(publicName)
  }
  return names
}
