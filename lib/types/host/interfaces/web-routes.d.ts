/**
 * Host HTTP bridge consumed by the Settings micro-frontend.
 *
 * @module dsh-dify-marketplace/host/interfaces/web-routes
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ResolvedConfig } from '../config.ts';
import type { CatalogService } from '../application/catalog.ts';
import type { InstallService } from '../application/install.ts';
import type { MarketplaceClient } from '../infrastructure/marketplace-client.ts';
import type { DaemonClient } from '../infrastructure/daemon-client.ts';
/** Services the bridge handlers close over. */
export interface BridgeServices {
    config: ResolvedConfig;
    marketplace: MarketplaceClient;
    daemon: DaemonClient | undefined;
    catalog: CatalogService;
    install: InstallService | undefined;
    version: string;
}
/**
 * Register every bridge route on the Harness web server.
 * @param ctx - Host context.
 * @param services - catalog, install, and clients.
 */
export declare function registerBridgeRoutes(ctx: Context, services: BridgeServices): void;
//# sourceMappingURL=web-routes.d.ts.map