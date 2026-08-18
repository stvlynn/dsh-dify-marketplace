/**
 * Host plugin configuration.
 *
 * @module dsh-dify-marketplace/host/config
 */
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "dsh-dify-marketplace";
/** Browser User-Agent the marketplace accepts. Anonymous clients without one get 403. */
export declare const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
/** Default Dify version header. Dify's own marketplace client sends a high value when running as marketplace. */
export declare const DEFAULT_DIFY_VERSION = "1.10.0";
/** Plugin configuration. */
export interface Config {
    marketplaceBaseUrl?: string;
    difyVersion?: string;
    userAgent?: string;
    daemonBaseUrl?: string;
    daemonServerKey?: string;
    daemonTenantId?: string;
    daemonUserId?: string;
    innerApiKey?: string;
    verifySignature?: boolean;
    harnessHome?: string;
}
export declare const Config: z<Config>;
/** Config after schemastery applies every field default. */
export type ResolvedConfig = Required<Omit<Config, 'harnessHome'>> & {
    harnessHome?: string;
};
/**
 * Apply schema defaults without requiring a Config object at the call site.
 * @param config - partial plugin config.
 */
export declare function resolveConfig(config?: Config): ResolvedConfig;
/** Whether the daemon is considered configured (a server key is present). */
export declare function daemonConfigured(config: ResolvedConfig): boolean;
//# sourceMappingURL=config.d.ts.map