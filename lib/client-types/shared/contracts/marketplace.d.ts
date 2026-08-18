/**
 * Dify Marketplace wire contract.
 *
 * Every type here is derived from live responses captured into
 * `fixtures/marketplace/` and reconciled with the manually maintained contract
 * in `langgenius/dify` at `packages/contracts/marketplace.ts`. Divergences
 * between the two are called out inline; the live payload wins, because that is
 * what the Host client actually parses.
 *
 * @module dsh-dify-marketplace/shared/contracts/marketplace
 */
/** Localized string map keyed by Dify locale code (`en_US`, `zh_Hans`, ...). */
export type DifyI18nObject = Partial<Record<string, string>>;
/** Envelope every marketplace JSON endpoint wraps its payload in. */
export interface MarketplaceEnvelope<T> {
    code: number;
    data: T;
    msg: string;
}
/** Plugin category as used by search filters and detail payloads. */
export type MarketplacePluginCategory = 'tool' | 'model' | 'extension' | 'agent-strategy' | 'datasource' | 'trigger';
/** Coarse record type. `bundle` records describe a set of plugins. */
export type MarketplacePluginType = 'plugin' | 'bundle' | 'model' | 'extension' | 'tool' | 'agent_strategy' | 'datasource' | 'trigger';
/** Publisher trust tier reported by the marketplace. */
export type MarketplaceAuthorizedCategory = 'langgenius' | 'partner' | 'community';
/** Lifecycle state; `deleted` records carry a deprecation reason. */
export type MarketplacePluginStatus = 'active' | 'deleted';
/**
 * Capability files a plugin package declares, mirroring `manifest.yaml`'s
 * `plugins` block. Absent capability groups are `null`, not omitted.
 */
export interface MarketplacePluginCapabilityFiles {
    tools: string[] | null;
    models: string[] | null;
    endpoints: string[] | null;
    agent_strategies: string[] | null;
    datasources: string[] | null;
    triggers: string[] | null;
}
/** Resource and permission requirements declared by the plugin manifest. */
export interface MarketplacePluginResource {
    memory: number;
    permission: {
        tool?: {
            enabled?: boolean;
        };
        model?: {
            enabled?: boolean;
            llm?: boolean;
            text_embedding?: boolean;
            rerank?: boolean;
            tts?: boolean;
            speech2text?: boolean;
            moderation?: boolean;
        };
        node?: {
            enabled?: boolean;
        };
        endpoint?: {
            enabled?: boolean;
        };
        app?: {
            enabled?: boolean;
        };
        storage?: {
            enabled?: boolean;
            size?: number;
        };
    };
}
/** One credential field a provider requires before it can be invoked. */
export interface DifyCredentialField {
    name: string;
    type: string;
    required: boolean;
    default: unknown;
    label: DifyI18nObject;
    help: DifyI18nObject | null;
    placeholder: DifyI18nObject | null;
    options: unknown[] | null;
    scope: string | null;
    url: string | null;
    multiple?: boolean;
}
/** Provider identity block shared by tool, model, and agent-strategy providers. */
export interface DifyProviderIdentity {
    author: string;
    name: string;
    label: DifyI18nObject;
    description?: DifyI18nObject;
    icon?: string;
    icon_dark?: string;
    tags?: string[];
}
/** One parameter of one Dify tool, as declared by its provider YAML. */
export interface DifyToolParameter {
    name: string;
    type: string;
    required?: boolean;
    form?: string;
    label?: DifyI18nObject;
    human_description?: DifyI18nObject;
    llm_description?: string;
    default?: unknown;
    min?: number | null;
    max?: number | null;
    options?: {
        value: string;
        label: DifyI18nObject;
    }[] | null;
    scope?: string | null;
    precision?: number | null;
}
/** One tool exposed by a tool provider. */
export interface DifyToolDeclaration {
    identity: {
        author: string;
        name: string;
        label: DifyI18nObject;
        provider?: string;
    };
    description: {
        human: DifyI18nObject;
        llm: string;
    };
    parameters: DifyToolParameter[] | null;
    output_schema?: Record<string, unknown> | null;
    has_runtime_parameters?: boolean;
}
/** Tool provider block of a plugin detail payload. */
export interface DifyToolProvider {
    identity: DifyProviderIdentity;
    credentials_schema: DifyCredentialField[] | null;
    oauth_schema: unknown | null;
    tools: DifyToolDeclaration[];
}
/** Model provider block of a plugin detail payload. */
export interface DifyModelProvider {
    provider: string;
    label: DifyI18nObject;
    description?: DifyI18nObject;
    icon_small?: DifyI18nObject;
    icon_large?: DifyI18nObject;
    supported_model_types: string[];
    configurate_methods: string[];
    provider_credential_schema?: {
        credential_form_schemas?: unknown[];
    } | null;
    model_credential_schema?: unknown | null;
    models?: unknown[] | null;
}
/** Endpoint (extension) provider block of a plugin detail payload. */
export interface DifyEndpointProvider {
    settings?: Record<string, unknown>[] | null;
    endpoints?: Record<string, unknown>[] | null;
}
/** Agent-strategy provider block of a plugin detail payload. */
export interface DifyAgentStrategyProvider {
    identity: DifyProviderIdentity;
    strategies?: Record<string, unknown>[] | null;
}
/**
 * Search-result plugin record.
 *
 * The search endpoint returns a lighter record than the detail endpoint: it
 * carries `index_id` and omits `introduction`, `resource`, and the provider
 * blocks. `repository` is nullable in live search payloads even though the Dify
 * contract types it as a plain string.
 */
export interface MarketplacePluginSummary {
    type: MarketplacePluginType;
    org: string;
    name: string;
    plugin_id: string;
    /** Search-index identity, `<org>___<name>`. Live-only; absent from the Dify contract. */
    index_id?: string;
    category: MarketplacePluginCategory;
    latest_version: string;
    latest_package_identifier: string;
    icon: string;
    icon_dark?: string;
    label: DifyI18nObject;
    brief: DifyI18nObject;
    labels?: DifyI18nObject;
    description?: DifyI18nObject | string;
    install_count: number;
    repository: string | null;
    status: MarketplacePluginStatus;
    badges: string[] | null;
    tags: {
        name: string;
    }[];
    verification: {
        authorized_category: MarketplaceAuthorizedCategory;
    };
    plugins: MarketplacePluginCapabilityFiles;
    /** Live-only fields absent from the Dify contract. */
    privacy_options?: string;
    privacy_policy?: string;
    version_updated_at?: string;
}
/**
 * Detail plugin record, also returned by `plugins/batch` and by the collection
 * plugins endpoint. Adds the provider declarations the install flow needs to
 * build credential forms and capability adapters.
 */
export interface MarketplacePluginDetail extends MarketplacePluginSummary {
    introduction: string;
    readme_meta?: {
        available_languages?: string[];
    } | null;
    resource: MarketplacePluginResource;
    created_at: string;
    updated_at: string;
    deprecated_reason: string;
    alternative_plugin_id: string;
    minimum_dify_version_major: number;
    minimum_dify_version_minor: number;
    minimum_dify_version_patch: number;
    /** Provider blocks. An unused block is an empty object, not `null`. */
    tool: DifyToolProvider | Record<string, never>;
    model: DifyModelProvider | Record<string, never>;
    endpoint: DifyEndpointProvider | Record<string, never>;
    agent_strategy: DifyAgentStrategyProvider | Record<string, never>;
    data_sources: unknown | Record<string, never>;
    triggers: unknown | Record<string, never>;
}
/** Curated collection descriptor. */
export interface MarketplaceCollection {
    name: string;
    label: DifyI18nObject;
    description: DifyI18nObject;
    created_at: string;
    updated_at: string;
    searchable: boolean;
    search_params: {
        query?: string;
        sort_by?: string;
        sort_order?: string;
    };
    /** Live-only ordering hint; higher sorts first. Absent from the Dify contract. */
    priority?: number;
    /** Present in the Dify contract; not observed in live collection payloads. */
    rule?: string;
}
/** Request body of `POST /api/v1/{plugins|bundles}/search/advanced`. */
export interface MarketplaceSearchRequest {
    page: number;
    page_size: number;
    query: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    category?: string;
    tags?: string[];
    exclude?: string[];
}
/** Response payload of the plugin search endpoint. */
export interface MarketplacePluginSearchData {
    plugins: MarketplacePluginSummary[];
    total: number;
}
/** Response payload of the bundle search endpoint. */
export interface MarketplaceBundleSearchData {
    bundles: MarketplacePluginSummary[];
    total: number;
}
/** Response payload of the collections endpoint. */
export interface MarketplaceCollectionsData {
    collections: MarketplaceCollection[];
    total: number;
}
/** Response payload of the collection plugins endpoint. */
export interface MarketplaceCollectionPluginsData {
    plugins: MarketplacePluginDetail[];
    total: number;
}
/** Response payload of the plugin detail endpoint. */
export interface MarketplacePluginDetailData {
    plugin: MarketplacePluginDetail;
}
/** One published version of one plugin. */
export interface MarketplacePluginVersion {
    plugin_org: string;
    plugin_name: string;
    version: string;
    plugin_tuple: string;
    change_log: string;
    checksum: string;
    created_at: string;
    /** `<org>/<name>:<version>@<checksum>` — the identifier the daemon installs by. */
    unique_identifier: string;
    status: MarketplacePluginStatus;
    minimum_dify_version_major: number;
    minimum_dify_version_minor: number;
    minimum_dify_version_patch: number;
}
/** Response payload of the plugin versions endpoint. */
export interface MarketplacePluginVersionsData {
    versions: MarketplacePluginVersion[];
    total?: number;
}
/** Response payload of the batch manifest endpoint. */
export interface MarketplacePluginBatchData {
    plugins: MarketplacePluginDetail[];
}
/** Sort fields the search endpoint accepts. */
export declare const MARKETPLACE_SORT_FIELDS: readonly ["install_count", "version_updated_at", "created_at"];
/** One accepted sort field. */
export type MarketplaceSortField = (typeof MARKETPLACE_SORT_FIELDS)[number];
/**
 * Category filter values used by the marketplace tabs.
 *
 * Each value was probed against the live search endpoint rather than inferred
 * from the plugin manifest vocabulary, because the two differ: a manifest
 * declares its extension capability under `endpoint`, but the search filter only
 * matches `extension` (`endpoint` returns an empty page). `agent-strategy` must
 * be hyphenated for the same reason.
 */
export declare const MARKETPLACE_CATEGORY_FILTERS: {
    readonly all: "";
    readonly model: "model";
    readonly tool: "tool";
    readonly datasource: "datasource";
    readonly trigger: "trigger";
    readonly 'agent-strategy': "agent-strategy";
    readonly extension: "extension";
};
/** One marketplace tab key. */
export type MarketplaceTab = keyof typeof MARKETPLACE_CATEGORY_FILTERS;
//# sourceMappingURL=marketplace.d.ts.map