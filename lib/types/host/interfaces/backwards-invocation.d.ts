/**
 * Backwards-invocation adapter.
 *
 * Local daemon runtimes call Dify's inner API at `{DIFY_INNER_API_URL}/inner/api/...`
 * (`calldify.difyPath` prepends `inner/api`). This plugin registers that tree
 * under `/dify-marketplace/inner/api` and points the sidecar at
 * `http://host.docker.internal:<port>/dify-marketplace`.
 *
 * The daemon streams with a length-prefixed framing (magic `0x0f`). Responses
 * that are not streams use `{ data, error }`.
 *
 * Unsupported invoke types fail closed with an error string — they do not
 * pretend to succeed.
 *
 * @module dsh-dify-marketplace/host/interfaces/backwards-invocation
 */
import type { Context } from '@deepseek-ai/cordis';
/**
 * Register the inner-API routes the daemon calls back into.
 * @param ctx - Host context.
 * @param innerApiKey - expected `X-Inner-Api-Key`. Empty disables the adapter.
 */
export declare function registerBackwardsInvocation(ctx: Context, innerApiKey: string): void;
/** Encode one length-prefixed daemon stream frame (magic 0x0f, header 0x0a). */
export declare function encodeFrame(data: Buffer): Buffer;
//# sourceMappingURL=backwards-invocation.d.ts.map