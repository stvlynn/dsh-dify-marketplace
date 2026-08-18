/**
 * Per-installed-plugin Cordis child.
 *
 * The Host mounts one of these via `ctx.plugin(runtimeChild, config)` after a
 * successful daemon install (and again on boot from durable state). Unload of
 * the child disposes every tool and HTTP route it registered.
 *
 * @module dsh-dify-marketplace/runtime
 */
import type { Context } from '@deepseek-ai/cordis';
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-tools';
import type { RuntimeConfig } from './config.ts';
import type { RuntimeDeps } from './deps.ts';
export type { RuntimeConfig } from './config.ts';
/** Cordis plugin name. The Loader row id is `dify:<org>/<name>`, set by the registry. */
export declare const name = "dify-plugin-runtime";
/** Tools always. webServer is required so extension plugins can register routes. */
export declare const inject: string[];
/**
 * Bind Host-owned daemon/vault handles the child fibers read during `apply`.
 * Called once from the Host plugin before any child is mounted.
 * @param deps - daemon client and credential vault.
 */
export declare function bindRuntimeDeps(deps: RuntimeDeps): void;
/**
 * Register the adapter for this plugin's category.
 * @param ctx - child fiber context.
 * @param config - identity, snapshot, and daemon ids.
 */
export declare function apply(ctx: Context, config: RuntimeConfig): Promise<void>;
//# sourceMappingURL=index.d.ts.map