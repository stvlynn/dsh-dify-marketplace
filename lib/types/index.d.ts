/**
 * Host entry for dsh-dify-marketplace.
 *
 * Inspected DeepSeek Harness dsh-v0.1.0-rc.7
 * (99f6f02fecdb7dff40c3fbc9470f5907c29f74ca):
 * - `inject: ['tools', 'webServer']` matches the Host surfaces this plugin uses.
 * - `ctx.llm` is optional and is not in the module-level inject list, so a
 *   headless profile without llm still mounts this plugin.
 */
import type { Context } from '@deepseek-ai/cordis';
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-tools';
import { type Config } from './host/config.ts';
export { Config, name } from './host/config.ts';
export declare const inject: string[];
/**
 * Apply the Host plugin: bind clients, register HTTP, rehydrate child fibers.
 * @param ctx - Host context.
 * @param config - plugin config.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map