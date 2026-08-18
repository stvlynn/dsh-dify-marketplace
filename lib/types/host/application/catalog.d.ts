/**
 * Catalog use cases: search, collections, detail, versions, icon.
 *
 * @module dsh-dify-marketplace/host/application/catalog
 */
import type { BridgeCollectionsResponse, BridgeDetailResponse, BridgeSearchRequest, BridgeSearchResponse } from '../../shared/contracts/bridge.ts';
import type { MarketplaceClient } from '../infrastructure/marketplace-client.ts';
import type { StateStore } from '../infrastructure/state-store.ts';
import type { CredentialVault } from '../infrastructure/credential-vault.ts';
/** Catalog dependencies. */
export interface CatalogDeps {
    marketplace: MarketplaceClient;
    state: StateStore;
    vault: CredentialVault;
}
/** Marketplace catalog operations. */
export declare class CatalogService {
    private readonly deps;
    constructor(deps: CatalogDeps);
    /**
     * Search plugins or bundles and annotate with local install state.
     * @param request - search request from the bridge.
     */
    search(request: BridgeSearchRequest): Promise<BridgeSearchResponse>;
    /**
     * List curated collections and the plugins inside each.
     */
    collections(): Promise<BridgeCollectionsResponse>;
    /**
     * Full detail, versions, credential schema, and registration preview.
     * @param pluginId - `<org>/<name>`.
     */
    detail(pluginId: string): Promise<BridgeDetailResponse>;
    /**
     * Proxy one plugin icon.
     * @param pluginId - `<org>/<name>`.
     */
    icon(pluginId: string): Promise<{
        bytes: Uint8Array;
        contentType: string;
    }>;
    /** Annotate marketplace records with local install facts. */
    private annotate;
}
//# sourceMappingURL=catalog.d.ts.map