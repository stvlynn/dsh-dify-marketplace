/**
 * Host entry for dsh-dify-marketplace.
 *
 * Inspected DeepSeek Harness dsh-v0.1.0-rc.7
 * (99f6f02fecdb7dff40c3fbc9470f5907c29f74ca):
 * - `inject: ['tools', 'webServer']` matches the Host surfaces this plugin uses.
 * - `ctx.llm` is optional and is not in the module-level inject list, so a
 *   headless profile without llm still mounts this plugin.
 */
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-tools';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { daemonConfigured, resolveConfig } from "./host/config.js";
import { CatalogService } from "./host/application/catalog.js";
import { InstallService } from "./host/application/install.js";
import { PluginRegistry } from "./host/application/registry.js";
import { CredentialVault } from "./host/infrastructure/credential-vault.js";
import { DaemonClient } from "./host/infrastructure/daemon-client.js";
import { MarketplaceClient } from "./host/infrastructure/marketplace-client.js";
import { StateStore } from "./host/infrastructure/state-store.js";
import { registerBackwardsInvocation } from "./host/interfaces/backwards-invocation.js";
import { registerBridgeRoutes } from "./host/interfaces/web-routes.js";
export { Config, name } from "./host/config.js";
export const inject = ['tools', 'webServer'];
const VERSION = readPackageVersion();
/**
 * Apply the Host plugin: bind clients, register HTTP, rehydrate child fibers.
 * @param ctx - Host context.
 * @param config - plugin config.
 */
export function apply(ctx, config = {}) {
    const resolved = resolveConfig(config);
    const marketplace = new MarketplaceClient({
        baseUrl: resolved.marketplaceBaseUrl.replace(/\/$/, ''),
        difyVersion: resolved.difyVersion,
        userAgent: resolved.userAgent,
        timeoutMs: 30_000,
    });
    const state = StateStore.inHarnessHome(resolved.harnessHome);
    const vault = CredentialVault.inHarnessHome(resolved.harnessHome);
    const catalog = new CatalogService({ marketplace, state, vault });
    const daemon = daemonConfigured(resolved)
        ? new DaemonClient({
            baseUrl: resolved.daemonBaseUrl.replace(/\/$/, ''),
            serverKey: resolved.daemonServerKey,
            tenantId: resolved.daemonTenantId,
            userId: resolved.daemonUserId,
            timeoutMs: 120_000,
        })
        : undefined;
    const registry = daemon === undefined
        ? undefined
        : new PluginRegistry(ctx, { daemon, vault });
    const install = daemon === undefined || registry === undefined
        ? undefined
        : new InstallService({
            marketplace,
            daemon,
            state,
            vault,
            registry,
            config: resolved,
        });
    registerBridgeRoutes(ctx, {
        config: resolved,
        marketplace,
        daemon,
        catalog,
        install,
        version: VERSION,
    });
    registerBackwardsInvocation(ctx, resolved.innerApiKey);
    if (registry !== undefined) {
        ctx.effect(() => {
            void state.list().then(records => registry.rehydrate(records));
            return () => {
                void registry.disposeAll();
            };
        }, 'dify-marketplace:rehydrate');
    }
}
function readPackageVersion() {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const candidate of [join(here, '..', 'package.json'), join(here, '..', '..', 'package.json')]) {
        try {
            const parsed = JSON.parse(readFileSync(candidate, 'utf8'));
            if (parsed.name === 'dsh-dify-marketplace')
                return parsed.version ?? '0.1.0';
        }
        catch {
            // The Host bundle lives at lib/index.js; tsc emit lives at lib/types/index.js.
        }
    }
    return '0.1.0';
}
//# sourceMappingURL=index.js.map