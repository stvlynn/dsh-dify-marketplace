/**
 * Model plugins become one invocation tool per supported model type.
 *
 * There is no `settings.models` slot to occupy on rc.7. Credentials live in
 * this plugin's own vault; invocation goes through daemon dispatch.
 *
 * @module dsh-dify-marketplace/runtime/adapters/model
 */
import type { CapabilityAdapter } from '../deps.ts';
/** Model-provider adapter. */
export declare const registerModelAdapter: CapabilityAdapter;
//# sourceMappingURL=model.d.ts.map