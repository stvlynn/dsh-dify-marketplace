/**
 * Host plugin configuration.
 *
 * @module dsh-dify-marketplace/host/config
 */
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh-dify-marketplace';
/** Browser User-Agent the marketplace accepts. Anonymous clients without one get 403. */
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
/** Default Dify version header. Dify's own marketplace client sends a high value when running as marketplace. */
export const DEFAULT_DIFY_VERSION = '1.10.0';
export const Config = z.object({
    marketplaceBaseUrl: z.string().default('https://marketplace.dify.ai'),
    difyVersion: z.string().default(DEFAULT_DIFY_VERSION),
    userAgent: z.string().default(DEFAULT_USER_AGENT),
    daemonBaseUrl: z.string().default('http://127.0.0.1:5002'),
    daemonServerKey: z.string().default(''),
    daemonTenantId: z.string().default('00000000-0000-0000-0000-000000000001'),
    daemonUserId: z.string().default('dsh'),
    innerApiKey: z.string().default(''),
    verifySignature: z.boolean().default(false),
    harnessHome: z.string().default(''),
});
/**
 * Apply schema defaults without requiring a Config object at the call site.
 * @param config - partial plugin config.
 */
export function resolveConfig(config = {}) {
    const resolved = Config(config);
    return {
        ...resolved,
        ...(resolved.harnessHome === '' ? { harnessHome: undefined } : {}),
    };
}
/** Whether the daemon is considered configured (a server key is present). */
export function daemonConfigured(config) {
    return config.daemonServerKey !== '' && config.daemonBaseUrl !== '';
}
//# sourceMappingURL=config.js.map