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
import { DifyMarketplaceError } from "../domain/errors.js";
import { readJson, requestWithRetry } from "./http.js";
/** Read-only access to the public Dify Marketplace API. */
export class MarketplaceClient {
    config;
    constructor(config) {
        this.config = config;
    }
    /** The configured marketplace origin. */
    get baseUrl() {
        return this.config.baseUrl;
    }
    /**
     * Probe reachability with the cheapest real call available.
     * @param signal - caller cancellation.
     * @returns true when the marketplace answered a well-formed response.
     */
    async ping(signal) {
        const response = await this.request('/api/v1/collections?page=1&page_size=1', { method: 'GET', signal });
        return response.ok;
    }
    /**
     * Search plugins.
     * @param request - page, query, and filters.
     * @param signal - caller cancellation.
     * @returns the page of results and the unfiltered total.
     */
    async searchPlugins(request, signal) {
        return this.postJson('/api/v1/plugins/search/advanced', request, signal);
    }
    /**
     * Search bundles. Bundles are plugin sets and share the plugin record shape.
     * @param request - page, query, and filters.
     * @param signal - caller cancellation.
     * @returns the page of bundles and the unfiltered total.
     */
    async searchBundles(request, signal) {
        return this.postJson('/api/v1/bundles/search/advanced', request, signal);
    }
    /**
     * List curated collections.
     * @param signal - caller cancellation.
     * @returns every collection, highest priority first.
     */
    async collections(signal) {
        const data = await this.getJson('/api/v1/collections?page=1&page_size=100', signal);
        const sorted = [...data.collections].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
        return { collections: sorted, total: data.total };
    }
    /**
     * List the plugins of one collection.
     * @param name - collection name, as returned by {@link collections}.
     * @param signal - caller cancellation.
     * @returns the collection's plugins.
     */
    async collectionPlugins(name, signal) {
        const path = `/api/v1/collections/${encodeURIComponent(name)}/plugins`;
        const data = await this.postJson(path, {}, signal);
        return data.plugins;
    }
    /**
     * Fetch one plugin's full record.
     * @param org - plugin organization.
     * @param name - plugin name.
     * @param signal - caller cancellation.
     * @returns the detail record.
     */
    async pluginDetail(org, name, signal) {
        const path = `/api/v1/plugins/${encodeURIComponent(org)}/${encodeURIComponent(name)}`;
        const data = await this.getJson(path, signal);
        return data.plugin;
    }
    /**
     * List one plugin's published versions, newest first.
     * @param org - plugin organization.
     * @param name - plugin name.
     * @param pageSize - how many versions to request.
     * @param signal - caller cancellation.
     * @returns the versions page.
     */
    async pluginVersions(org, name, pageSize = 20, signal) {
        const path = `/api/v1/plugins/${encodeURIComponent(org)}/${encodeURIComponent(name)}/versions`
            + `?page=1&page_size=${pageSize}`;
        const data = await this.getJson(path, signal);
        return data.versions;
    }
    /**
     * Fetch manifests for many plugins in one call, used to annotate installed
     * plugins with their latest published version.
     * @param pluginIds - `<org>/<name>` ids.
     * @param signal - caller cancellation.
     * @returns the detail records the marketplace knows.
     */
    async batchManifests(pluginIds, signal) {
        if (pluginIds.length === 0)
            return [];
        const data = await this.postJson('/api/v1/plugins/batch', { plugin_ids: pluginIds }, signal);
        return data.plugins;
    }
    /**
     * Fetch one plugin's icon bytes, proxied to the browser by the bridge so the
     * Web face never issues a cross-origin marketplace request.
     * @param org - plugin organization.
     * @param name - plugin name.
     * @param signal - caller cancellation.
     * @returns the icon bytes and its content type.
     */
    async pluginIcon(org, name, signal) {
        const path = `/api/v1/plugins/${encodeURIComponent(org)}/${encodeURIComponent(name)}/icon`;
        const response = await this.request(path, { method: 'GET', signal });
        if (!response.ok) {
            throw new DifyMarketplaceError('marketplace_rejected', `icon request failed with HTTP ${response.status}`);
        }
        return {
            bytes: new Uint8Array(await response.arrayBuffer()),
            contentType: response.headers.get('content-type') ?? 'application/octet-stream',
        };
    }
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
    async downloadPackage(uniqueIdentifier, signal) {
        const path = `/api/v1/plugins/download-url?unique_identifier=${encodeURIComponent(uniqueIdentifier)}`;
        const response = await this.request(path, { method: 'GET', signal, policy: { timeoutMs: 180_000 } });
        if (!response.ok) {
            throw new DifyMarketplaceError('package_download_failed', `download of ${uniqueIdentifier} failed with HTTP ${response.status}`);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        assertZipContainer(bytes, uniqueIdentifier);
        return {
            uniqueIdentifier,
            bytes,
            contentType: response.headers.get('content-type') ?? 'application/zip',
        };
    }
    /**
     * Best-effort install-count ping. A failure here must not fail the install:
     * the marketplace treats this as analytics, not as part of the install contract.
     * @param uniqueIdentifier - the installed package identifier.
     * @param signal - caller cancellation.
     * @returns true when the marketplace accepted the event.
     */
    async recordInstallCount(uniqueIdentifier, signal) {
        try {
            await this.postJson('/api/v1/stats/plugins/install_count', { unique_identifier: uniqueIdentifier }, signal);
            return true;
        }
        catch {
            return false;
        }
    }
    /** Issue one request with the header set the marketplace requires. */
    async request(path, options) {
        const headers = {
            'Accept': options.body === undefined ? '*/*' : 'application/json',
            'User-Agent': this.config.userAgent,
            'X-Dify-Version': this.config.difyVersion,
        };
        if (options.body !== undefined)
            headers['Content-Type'] = 'application/json';
        return requestWithRetry(`${this.config.baseUrl}${path}`, {
            method: options.method,
            headers,
            ...(options.body === undefined ? {} : { body: options.body }),
            signal: options.signal,
            failureCode: 'marketplace_unavailable',
            policy: { timeoutMs: options.policy?.timeoutMs ?? this.config.timeoutMs },
        });
    }
    /** GET one JSON endpoint and unwrap its envelope. */
    async getJson(path, signal) {
        const response = await this.request(path, { method: 'GET', signal });
        return this.unwrap(response, path);
    }
    /** POST one JSON endpoint and unwrap its envelope. */
    async postJson(path, body, signal) {
        const response = await this.request(path, { method: 'POST', body: JSON.stringify(body), signal });
        return this.unwrap(response, path);
    }
    /** Validate the HTTP status and the envelope's own `code` field. */
    async unwrap(response, path) {
        if (!response.ok) {
            const preview = (await response.text()).slice(0, 200);
            throw new DifyMarketplaceError('marketplace_rejected', `marketplace answered HTTP ${response.status} for ${path}: ${preview}`);
        }
        const envelope = await readJson(response, 'marketplace_rejected');
        if (envelope.code !== 0) {
            throw new DifyMarketplaceError('marketplace_rejected', `marketplace answered code ${envelope.code} for ${path}: ${envelope.msg}`);
        }
        return envelope.data;
    }
}
/**
 * Reject a downloaded body that is not a ZIP container.
 *
 * A `.difypkg` is a ZIP archive. Without this check, an HTML error page or a
 * bot-protection challenge would be uploaded to the daemon and surface as an
 * opaque decode failure far from its cause.
 * @param bytes - the downloaded body.
 * @param uniqueIdentifier - identifier used in the failure message.
 */
function assertZipContainer(bytes, uniqueIdentifier) {
    const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
        && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
    if (isZip)
        return;
    throw new DifyMarketplaceError('package_download_failed', `download of ${uniqueIdentifier} returned ${bytes.length} bytes that are not a ZIP package`);
}
//# sourceMappingURL=marketplace-client.js.map