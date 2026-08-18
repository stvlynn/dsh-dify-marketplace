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
import type { MarketplacePluginCategory, MarketplacePluginDetail } from '../../shared/contracts/marketplace.ts';
/** The DSH surface a Dify category is projected onto. */
export type HarnessSurface = 'tools' | 'model-provider' | 'http-endpoint' | 'unsupported';
/** How one Dify category maps onto DSH. */
export interface CategoryMapping {
    category: MarketplacePluginCategory;
    surface: HarnessSurface;
    /** Human-readable summary shown in the settings UI. */
    description: string;
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
export declare const CATEGORY_MAPPINGS: readonly CategoryMapping[];
/**
 * Resolve the mapping for one category.
 * @param category - the Dify plugin category.
 * @returns its mapping, or an `unsupported` mapping for unknown categories.
 */
export declare function categoryMapping(category: string): CategoryMapping;
/** Categories this build can register. */
export declare function supportedCategories(): MarketplacePluginCategory[];
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
export declare function projectedToolNames(detail: MarketplacePluginDetail): string[];
/** Inputs for {@link projectedToolNamesFromSnapshot}. */
export interface ToolNameProjection {
    tools: string[];
    strategies: string[];
    supportedModelTypes: string[];
}
/**
 * The model-facing tool names a plugin would register, derived from a snapshot.
 * @param org - plugin organization.
 * @param name - plugin name.
 * @param category - Dify category.
 * @param projection - declared operations.
 */
export declare function projectedToolNamesFromSnapshot(org: string, name: string, category: string, projection: ToolNameProjection): string[];
/** Operations the datasource adapter registers for every datasource plugin. */
export declare const DATASOURCE_OPERATIONS: readonly ["browse", "fetch"];
/** Operations the trigger adapter registers for every trigger plugin. */
export declare const TRIGGER_OPERATIONS: readonly ["subscribe", "unsubscribe"];
/**
 * Model operations for one model plugin, one per supported model type the
 * daemon can dispatch.
 * @param detail - the marketplace detail record.
 * @returns the operation names.
 */
export declare function modelOperations(detail: MarketplacePluginDetail): string[];
/** Dispatchable model types and the operation name each becomes. */
export declare const MODEL_TYPE_OPERATIONS: Record<string, string | undefined>;
//# sourceMappingURL=capability.d.ts.map