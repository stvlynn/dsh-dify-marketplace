/**
 * Dify Marketplace HTTP client.
 *
 * Two request details are load-bearing and were established by capture rather
 * than by documentation (see `fixtures/marketplace/` and
 * `docs/specs/marketplace-api.md`):
 *
 * - The marketplace sits behind Cloudflare and answers requests that carry no
 *   browser-shaped `User-Agent` with 403, so every request sends one.
 * - `X-Dify-Version` is echoed by Dify's own clients and gates version-scoped
 *   responses, so it is sent on every request as well.
 *
 * @module dsh-dify-marketplace/host/infrastructure/marketplace-client
 */
import type { MarketplaceBundleSearchData, MarketplaceCollectionsData, MarketplacePluginDetail, MarketplacePluginSearchData, MarketplacePluginSummary, MarketplacePluginVersion, MarketplaceSearchRequest } from '../../shared/contracts/marketplace.ts';
/** Client configuration. */
export interface MarketplaceClientConfig {
    /** Marketplace origin, without a trailing slash. */
    baseUrl: string;
    /** Value sent as `X-Dify-Version`. */
    difyVersion: string;
    /** Value sent as `User-Agent`. */
    userAgent: string;
    /** Per-attempt deadline in milliseconds. */
    timeoutMs: number;
}
/** A downloaded plugin package. */
export interface DownloadedPackage {
    uniqueIdentifier: string;
    bytes: Uint8Array;
    contentType: string;
}
/** Read-only access to the public Dify Marketplace API. */
export declare class MarketplaceClient {
    private readonly config;
    constructor(config: MarketplaceClientConfig);
    /** The configured marketplace origin. */
    get baseUrl(): string;
    /**
     * Probe reachability with the cheapest real call available.
     * @param signal - caller cancellation.
     * @returns true when the marketplace answered a well-formed response.
     */
    ping(signal?: AbortSignal): Promise<boolean>;
    /**
     * Search plugins.
     * @param request - page, query, and filters.
     * @param signal - caller cancellation.
     * @returns the page of results and the unfiltered total.
     */
    searchPlugins(request: MarketplaceSearchRequest, signal?: AbortSignal): Promise<MarketplacePluginSearchData>;
    /**
     * Search bundles. Bundles are plugin sets and share the plugin record shape.
     * @param request - page, query, and filters.
     * @param signal - caller cancellation.
     * @returns the page of bundles and the unfiltered total.
     */
    searchBundles(request: MarketplaceSearchRequest, signal?: AbortSignal): Promise<MarketplaceBundleSearchData>;
    /**
     * List curated collections.
     * @param signal - caller cancellation.
     * @returns every collection, highest priority first.
     */
    collections(signal?: AbortSignal): Promise<MarketplaceCollectionsData>;
    /**
     * List the plugins of one collection.
     * @param name - collection name, as returned by {@link collections}.
     * @param signal - caller cancellation.
     * @returns the collection's plugins.
     */
    collectionPlugins(name: string, signal?: AbortSignal): Promise<MarketplacePluginDetail[]>;
    /**
     * Fetch one plugin's full record.
     * @param org - plugin organization.
     * @param name - plugin name.
     * @param signal - caller cancellation.
     * @returns the detail record.
     */
    pluginDetail(org: string, name: string, signal?: AbortSignal): Promise<MarketplacePluginDetail>;
    /**
     * List one plugin's published versions, newest first.
     * @param org - plugin organization.
     * @param name - plugin name.
     * @param pageSize - how many versions to request.
     * @param signal - caller cancellation.
     * @returns the versions page.
     */
    pluginVersions(org: string, name: string, pageSize?: number, signal?: AbortSignal): Promise<MarketplacePluginVersion[]>;
    /**
     * Fetch manifests for many plugins in one call, used to annotate installed
     * plugins with their latest published version.
     * @param pluginIds - `<org>/<name>` ids.
     * @param signal - caller cancellation.
     * @returns the detail records the marketplace knows.
     */
    batchManifests(pluginIds: string[], signal?: AbortSignal): Promise<MarketplacePluginDetail[]>;
    /**
     * Fetch one plugin's icon bytes, proxied to the browser by the bridge so the
     * Web face never issues a cross-origin marketplace request.
     * @param org - plugin organization.
     * @param name - plugin name.
     * @param signal - caller cancellation.
     * @returns the icon bytes and its content type.
     */
    pluginIcon(org: string, name: string, signal?: AbortSignal): Promise<{
        bytes: Uint8Array;
        contentType: string;
    }>;
    /**
     * Download one plugin package.
     *
     * The download endpoint answers 302 with a presigned object-storage URL;
     * `fetch` follows it by default, so the package bytes arrive from this one
     * call. The response is validated as a ZIP container before it is handed to
     * the daemon, so a Cloudflare challenge page cannot be mistaken for a package.
     * @param uniqueIdentifier - `<org>/<name>:<version>@<checksum>`.
     * @param signal - caller cancellation.
     * @returns the package bytes.
     */
    downloadPackage(uniqueIdentifier: string, signal?: AbortSignal): Promise<DownloadedPackage>;
    /**
     * Best-effort install-count ping. A failure here must not fail the install:
     * the marketplace treats this as analytics, not as part of the install contract.
     * @param uniqueIdentifier - the installed package identifier.
     * @param signal - caller cancellation.
     * @returns true when the marketplace accepted the event.
     */
    recordInstallCount(uniqueIdentifier: string, signal?: AbortSignal): Promise<boolean>;
    /** Issue one request with the header set the marketplace requires. */
    private request;
    /** GET one JSON endpoint and unwrap its envelope. */
    private getJson;
    /** POST one JSON endpoint and unwrap its envelope. */
    private postJson;
    /** Validate the HTTP status and the envelope's own `code` field. */
    private unwrap;
}
/** Summary and detail records share the fields the catalog layer reads. */
export type MarketplaceRecord = MarketplacePluginSummary | MarketplacePluginDetail;
//# sourceMappingURL=marketplace-client.d.ts.map