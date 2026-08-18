/**
 * Runtime child configuration: one installed Dify plugin.
 *
 * @module dsh-dify-marketplace/runtime/config
 */
import type { MarketplacePluginCategory } from '../shared/contracts/marketplace.ts';
import type { PluginSnapshot } from '../host/domain/snapshot.ts';
/** Config passed to `ctx.plugin(runtimeChild, config)`. */
export interface RuntimeConfig {
    pluginId: string;
    org: string;
    name: string;
    uniqueIdentifier: string;
    category: MarketplacePluginCategory;
    installationId: string;
    snapshot: PluginSnapshot;
    endpointHookId?: string;
}
//# sourceMappingURL=config.d.ts.map