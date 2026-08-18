/**
 * Per-installed-plugin Cordis child.
 *
 * The Host mounts one of these via `ctx.plugin(runtimeChild, config)` after a
 * successful daemon install (and again on boot from durable state). Unload of
 * the child disposes every tool and HTTP route it registered.
 *
 * @module dsh-dify-marketplace/runtime
 */
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-tools';
import { categoryMapping } from "../host/domain/capability.js";
import { DifyMarketplaceError } from "../host/domain/errors.js";
import { registerAgentStrategyAdapter } from "./adapters/agent-strategy.js";
import { registerDatasourceAdapter } from "./adapters/datasource.js";
import { registerEndpointAdapter } from "./adapters/endpoint.js";
import { registerModelAdapter } from "./adapters/model.js";
import { registerToolAdapter } from "./adapters/tool.js";
import { registerTriggerAdapter } from "./adapters/trigger.js";
/** Cordis plugin name. The Loader row id is `dify:<org>/<name>`, set by the registry. */
export const name = 'dify-plugin-runtime';
/** Tools always. webServer is required so extension plugins can register routes. */
export const inject = ['tools', 'webServer'];
const ADAPTERS = {
    tool: registerToolAdapter,
    'agent-strategy': registerAgentStrategyAdapter,
    datasource: registerDatasourceAdapter,
    trigger: registerTriggerAdapter,
    model: registerModelAdapter,
    extension: registerEndpointAdapter,
};
let sharedDeps;
/**
 * Bind Host-owned daemon/vault handles the child fibers read during `apply`.
 * Called once from the Host plugin before any child is mounted.
 * @param deps - daemon client and credential vault.
 */
export function bindRuntimeDeps(deps) {
    sharedDeps = deps;
}
/**
 * Register the adapter for this plugin's category.
 * @param ctx - child fiber context.
 * @param config - identity, snapshot, and daemon ids.
 */
export async function apply(ctx, config) {
    const mapping = categoryMapping(config.category);
    const adapter = ADAPTERS[config.category];
    if (adapter === undefined || mapping.surface === 'unsupported') {
        throw new DifyMarketplaceError('capability_unsupported', `no adapter for Dify category "${config.category}"`);
    }
    const deps = sharedDeps;
    if (deps === undefined) {
        throw new DifyMarketplaceError('registration_failed', `runtime child for ${config.pluginId} mounted before Host runtime dependencies were bound`);
    }
    await adapter(ctx, config, deps);
}
//# sourceMappingURL=index.js.map