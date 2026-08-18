/**
 * Capability model: what a Dify plugin category becomes inside DeepSeek Harness.
 *
 * Dify and DSH do not share a capability vocabulary, so this module is the
 * single place that decides how each Dify category projects onto a DSH surface.
 * Both the install flow and the settings UI read their answers from here, which
 * is why an unsupported category is a first-class value rather than a thrown
 * error at registration time.
 *
 * @module dsh-dify-marketplace/host/domain/capability
 */

import type { MarketplacePluginCategory, MarketplacePluginDetail } from '../../shared/contracts/marketplace.ts'
import { toolName } from '../../shared/identifier.ts'

/** The DSH surface a Dify category is projected onto. */
export type HarnessSurface
  = | 'tools'
    | 'model-provider'
    | 'http-endpoint'
    | 'unsupported'

/** How one Dify category maps onto DSH. */
export interface CategoryMapping {
  category: MarketplacePluginCategory
  surface: HarnessSurface
  /** Human-readable summary shown in the settings UI. */
  description: string
}

/**
 * The complete category mapping this build implements.
 *
 * `datasource` and `trigger` plugins are installed and invocable through the
 * daemon, and are projected as model-facing tools: a datasource becomes browse
 * and fetch tools, a trigger becomes subscription management tools. Nothing in
 * this table is aspirational — every non-`unsupported` row has an adapter under
 * `src/runtime/adapters`.
 */
export const CATEGORY_MAPPINGS: readonly CategoryMapping[] = [
  {
    category: 'tool',
    surface: 'tools',
    description: 'Each Dify tool is registered as a model-facing DSH tool.',
  },
  {
    category: 'agent-strategy',
    surface: 'tools',
    description: 'Each agent strategy is registered as one model-facing DSH tool.',
  },
  {
    category: 'datasource',
    surface: 'tools',
    description: 'Datasource browse and fetch operations are registered as model-facing DSH tools.',
  },
  {
    category: 'trigger',
    surface: 'tools',
    description: 'Trigger subscription management is registered as model-facing DSH tools.',
  },
  {
    category: 'model',
    surface: 'model-provider',
    description: 'Model providers are inspectable and their credentials are validated, '
      + 'and each supported model type is exposed as a model-facing invocation tool.',
  },
  {
    category: 'extension',
    surface: 'http-endpoint',
    description: 'Endpoint (extension) plugins are served through the Harness web server '
      + 'under the plugin\'s own route prefix.',
  },
]

/**
 * Resolve the mapping for one category.
 * @param category - the Dify plugin category.
 * @returns its mapping, or an `unsupported` mapping for unknown categories.
 */
export function categoryMapping(category: string): CategoryMapping {
  const found = CATEGORY_MAPPINGS.find(mapping => mapping.category === category)
  if (found !== undefined) return found
  return {
    category: category as MarketplacePluginCategory,
    surface: 'unsupported',
    description: `Dify category "${category}" has no DeepSeek Harness surface in this build.`,
  }
}

/** Categories this build can register. */
export function supportedCategories(): MarketplacePluginCategory[] {
  return CATEGORY_MAPPINGS.filter(mapping => mapping.surface !== 'unsupported').map(mapping => mapping.category)
}

/**
 * The model-facing tool names a plugin would register, derived from its
 * marketplace detail record.
 *
 * Tool and agent-strategy plugins declare their operations in the detail
 * payload, so their names are exact. Datasource, trigger, and model plugins
 * declare provider files rather than named operations, so their names come from
 * the fixed operation set each adapter registers.
 * @param detail - the marketplace detail record.
 * @returns the tool names, empty for categories that register no tools.
 */
export function projectedToolNames(detail: MarketplacePluginDetail): string[] {
  return projectedToolNamesFromSnapshot(detail.org, detail.name, detail.category, {
    tools: 'tools' in detail.tool && Array.isArray(detail.tool.tools)
      ? detail.tool.tools.map(tool => tool.identity.name)
      : [],
    strategies: 'strategies' in detail.agent_strategy && Array.isArray(detail.agent_strategy.strategies)
      ? detail.agent_strategy.strategies
        .map((strategy) => {
          const identity = (strategy as { identity?: { name?: unknown } }).identity
          return typeof identity?.name === 'string' ? identity.name : undefined
        })
        .filter((value): value is string => value !== undefined)
      : [],
    supportedModelTypes: 'supported_model_types' in detail.model && Array.isArray(detail.model.supported_model_types)
      ? detail.model.supported_model_types
      : [],
  })
}

/** Inputs for {@link projectedToolNamesFromSnapshot}. */
export interface ToolNameProjection {
  tools: string[]
  strategies: string[]
  supportedModelTypes: string[]
}

/**
 * The model-facing tool names a plugin would register, derived from a snapshot.
 * @param org - plugin organization.
 * @param name - plugin name.
 * @param category - Dify category.
 * @param projection - declared operations.
 */
export function projectedToolNamesFromSnapshot(
  org: string,
  name: string,
  category: string,
  projection: ToolNameProjection,
): string[] {
  switch (category) {
    case 'tool':
      return projection.tools.map(tool => toolName(org, name, tool))
    case 'agent-strategy':
      return projection.strategies.map(strategy => toolName(org, name, strategy))
    case 'datasource':
      return DATASOURCE_OPERATIONS.map(operation => toolName(org, name, operation))
    case 'trigger':
      return TRIGGER_OPERATIONS.map(operation => toolName(org, name, operation))
    case 'model':
      return projection.supportedModelTypes
        .map(type => MODEL_TYPE_OPERATIONS[type])
        .filter((value): value is string => value !== undefined)
        .map(operation => toolName(org, name, operation))
    default:
      return []
  }
}

/** Operations the datasource adapter registers for every datasource plugin. */
export const DATASOURCE_OPERATIONS = ['browse', 'fetch'] as const

/** Operations the trigger adapter registers for every trigger plugin. */
export const TRIGGER_OPERATIONS = ['subscribe', 'unsubscribe'] as const

/**
 * Model operations for one model plugin, one per supported model type the
 * daemon can dispatch.
 * @param detail - the marketplace detail record.
 * @returns the operation names.
 */
export function modelOperations(detail: MarketplacePluginDetail): string[] {
  const provider = detail.model
  const types = 'supported_model_types' in provider && Array.isArray(provider.supported_model_types)
    ? provider.supported_model_types
    : []
  return types
    .map(type => MODEL_TYPE_OPERATIONS[type])
    .filter((value): value is string => value !== undefined)
}

/** Dispatchable model types and the operation name each becomes. */
export const MODEL_TYPE_OPERATIONS: Record<string, string | undefined> = {
  'llm': 'llm',
  'text-embedding': 'embed',
  'text_embedding': 'embed',
  'rerank': 'rerank',
  'tts': 'tts',
  'speech2text': 'speech2text',
  'moderation': 'moderation',
}
