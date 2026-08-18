/**
 * Host-to-client bridge contract.
 *
 * The Web face never talks to marketplace.dify.ai or to the plugin daemon
 * directly: the browser cannot hold daemon credentials, and the marketplace
 * refuses cross-origin browser calls. Instead the Host registers loopback HTTP
 * routes on `ctx.webServer` and the client calls them same-origin, the pattern
 * the published DSH market plugins use.
 *
 * Every type in this file is shared verbatim by both faces, so a route change
 * cannot drift between them.
 *
 * @module dsh-dify-marketplace/shared/contracts/bridge
 */
import type { DifyCredentialField, MarketplaceCollection, MarketplacePluginCategory, MarketplacePluginDetail, MarketplacePluginSummary, MarketplacePluginVersion, MarketplaceSortField } from './marketplace.ts';
/** Route prefix owned by this plugin on the Harness web server. */
export declare const BRIDGE_ROUTE_PREFIX = "/dify-marketplace/api";
/** Bridge routes, appended to {@link BRIDGE_ROUTE_PREFIX}. */
export declare const BRIDGE_ROUTES: {
    readonly status: "/status";
    readonly search: "/search";
    readonly collections: "/collections";
    readonly detail: "/detail";
    readonly versions: "/versions";
    readonly icon: "/icon";
    readonly installed: "/installed";
    readonly install: "/install";
    readonly installTask: "/install-task";
    readonly uninstall: "/uninstall";
    readonly credentials: "/credentials";
    readonly validateCredentials: "/credentials/validate";
};
/** Error payload every bridge route returns on failure. */
export interface BridgeError {
    /** Stable machine-readable code; the UI maps it to localized copy. */
    code: BridgeErrorCode;
    /** Operator-facing detail. Never contains daemon credentials. */
    detail: string;
}
/** Failure taxonomy shared by Host and client. */
export type BridgeErrorCode = 'marketplace_unavailable' | 'marketplace_rejected' | 'daemon_unconfigured' | 'daemon_unavailable' | 'daemon_rejected' | 'package_download_failed' | 'install_failed' | 'plugin_not_installed' | 'credentials_invalid' | 'capability_unsupported' | 'registration_failed' | 'bad_request';
/** Whether the Host can reach the marketplace and a configured daemon. */
export interface BridgeStatus {
    /** Version of this plugin, reported so the UI can surface mismatches. */
    pluginVersion: string;
    marketplace: {
        baseUrl: string;
        reachable: boolean;
        /** Present when `reachable` is false. */
        error?: BridgeError;
    };
    daemon: {
        configured: boolean;
        baseUrl: string | null;
        tenantId: string | null;
        reachable: boolean;
        /** Present when `configured` is true and `reachable` is false. */
        error?: BridgeError;
    };
    /** Capability categories this build can register onto DSH surfaces. */
    supportedCategories: MarketplacePluginCategory[];
}
/** Search request accepted by the bridge search route. */
export interface BridgeSearchRequest {
    query: string;
    page: number;
    pageSize: number;
    /** Empty means every category. */
    category: MarketplacePluginCategory | '';
    tags?: string[];
    sortBy?: MarketplaceSortField;
    sortOrder?: 'ASC' | 'DESC';
    /** Search bundles instead of plugins. */
    kind?: 'plugins' | 'bundles';
}
/** Search response, already annotated with local installation state. */
export interface BridgeSearchResponse {
    plugins: BridgePluginListItem[];
    total: number;
    page: number;
    pageSize: number;
}
/** One marketplace record plus the local facts the UI needs. */
export interface BridgePluginListItem {
    plugin: MarketplacePluginSummary;
    /** Installed version, or null when this plugin is not installed here. */
    installedVersion: string | null;
    /** True when an installed plugin has a newer marketplace version. */
    upgradable: boolean;
}
/** Collections response with each collection's plugins resolved. */
export interface BridgeCollectionsResponse {
    collections: {
        collection: MarketplaceCollection;
        plugins: BridgePluginListItem[];
    }[];
}
/** Detail response: marketplace metadata, versions, and local state. */
export interface BridgeDetailResponse {
    plugin: MarketplacePluginDetail;
    versions: MarketplacePluginVersion[];
    installedVersion: string | null;
    /** Credential fields the plugin requires before it can be invoked. */
    credentialFields: DifyCredentialField[];
    /** Whether credentials are already stored for this plugin. */
    credentialsStored: boolean;
    /** Capabilities this build would register, derived from the plugin category. */
    registration: BridgeRegistrationPreview;
}
/** What installing this plugin will expose inside DSH. */
export interface BridgeRegistrationPreview {
    category: MarketplacePluginCategory;
    /** Whether this build has an adapter for the category. */
    supported: boolean;
    /** Model-facing tool names, when the category maps onto `ctx.tools`. */
    toolNames: string[];
    /** Human-readable summary of the non-tool surface, when applicable. */
    surface: string;
}
/** Install request: a plugin plus the version to install. */
export interface BridgeInstallRequest {
    /** `<org>/<name>:<version>@<checksum>`. */
    uniqueIdentifier: string;
}
/** Install response: the daemon task to poll. */
export interface BridgeInstallResponse {
    uniqueIdentifier: string;
    pluginId: string;
    /** Null when the daemon reported the package as already installed. */
    taskId: string | null;
    allInstalled: boolean;
}
/** Progress of one install, including the DSH registration that follows it. */
export interface BridgeInstallTaskResponse {
    taskId: string | null;
    status: 'pending' | 'running' | 'success' | 'failed';
    /** Daemon-reported per-plugin messages, surfaced verbatim on failure. */
    messages: {
        pluginId: string;
        status: string;
        message: string;
    }[];
    /** Registration state of the DSH child fiber for this plugin. */
    registration: BridgeRegistrationState;
}
/** State of one plugin's DSH registration. */
export interface BridgeRegistrationState {
    /** Loader entry id, `dify:<org>/<name>`. */
    entryId: string | null;
    status: 'absent' | 'mounting' | 'active' | 'failed' | 'needs-credentials';
    /** Tool names currently registered on `ctx.tools`. */
    toolNames: string[];
    /** Present when `status` is `failed`. */
    error?: BridgeError;
}
/** One installed Dify plugin, as the settings UI lists it. */
export interface BridgeInstalledPlugin {
    pluginId: string;
    org: string;
    name: string;
    uniqueIdentifier: string;
    version: string;
    category: MarketplacePluginCategory;
    label: Record<string, string>;
    icon: string;
    /** Daemon installation id, required to uninstall. */
    installationId: string;
    credentialsStored: boolean;
    registration: BridgeRegistrationState;
    /** Newer marketplace version, when one exists. */
    latestVersion: string | null;
}
/** Installed-plugins response. */
export interface BridgeInstalledResponse {
    plugins: BridgeInstalledPlugin[];
}
/** Uninstall request. */
export interface BridgeUninstallRequest {
    pluginId: string;
}
/** Uninstall response. */
export interface BridgeUninstallResponse {
    pluginId: string;
    /** True once the fiber is disposed and the daemon installation is gone. */
    removed: boolean;
}
/** Credential write request. Values are sent once and stored Host-side. */
export interface BridgeCredentialsRequest {
    pluginId: string;
    credentials: Record<string, string>;
}
/** Credential write response, including the daemon's validation verdict. */
export interface BridgeCredentialsResponse {
    pluginId: string;
    stored: boolean;
    validated: boolean;
    registration: BridgeRegistrationState;
    /** Present when the daemon rejected the credentials. */
    error?: BridgeError;
}
/** Build the absolute bridge URL for one route. */
export declare function bridgeUrl(route: keyof typeof BRIDGE_ROUTES): string;
//# sourceMappingURL=bridge.d.ts.map