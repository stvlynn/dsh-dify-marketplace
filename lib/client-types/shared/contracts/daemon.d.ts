/**
 * dify-plugin-daemon wire contract.
 *
 * Transcribed from `langgenius/dify-plugin-daemon` at commit
 * 1508955a48912488a3d1ef1d79b36a2fcc2bd2bd:
 *
 * - route table: `internal/server/http_server.go`,
 *   `internal/server/http_server.gen.go`
 * - envelope: `pkg/entities/response.go`
 * - dispatch payload: `pkg/entities/plugin_entities/request.go`
 * - install task: `internal/types/models/task.go`
 *
 * Cross-checked against the Dify API's own daemon client,
 * `langgenius/dify` at `api/core/plugin/impl/plugin.py`.
 *
 * @module dsh-dify-marketplace/shared/contracts/daemon
 */
import type { DifyI18nObject } from './marketplace.ts';
/** Envelope every daemon endpoint wraps its payload in. `code` 0 means success. */
export interface DaemonEnvelope<T> {
    code: number;
    message: string;
    data: T;
}
/** Header carrying the daemon server key; required on every management and dispatch route. */
export declare const DAEMON_API_KEY_HEADER = "X-Api-Key";
/** Header selecting the installed plugin a dispatch request targets. */
export declare const DAEMON_PLUGIN_ID_HEADER = "X-Plugin-ID";
/** Installation provenance recorded with an installed plugin. */
export type PluginInstallationSource = 'marketplace' | 'github' | 'package' | 'remote';
/** Lifecycle of one installation task and of each plugin inside it. */
export type InstallTaskStatus = 'pending' | 'running' | 'success' | 'failed';
/** Per-plugin progress inside an installation task. */
export interface InstallTaskPluginStatus {
    plugin_unique_identifier: string;
    plugin_id: string;
    labels: DifyI18nObject;
    icon: string;
    icon_dark: string;
    status: InstallTaskStatus;
    message: string;
    source: string;
}
/** One installation task as returned by `GET .../install/tasks/:id`. */
export interface InstallTask {
    id: string;
    created_at: string;
    updated_at: string;
    status: InstallTaskStatus;
    tenant_id: string;
    total_plugins: number;
    completed_plugins: number;
    plugins: InstallTaskPluginStatus[];
}
/** Response of `POST .../install/identifiers`. */
export interface InstallPluginResponse {
    all_installed: boolean;
    task_id: string;
}
/** Signature verification result attached to a decoded package. */
export interface PluginVerification {
    authorized_category: string;
    authorized_by?: string;
}
/** Runtime declaration inside a plugin manifest. */
export interface PluginManifestMeta {
    version: string;
    arch: string[];
    runner: {
        language: string;
        version: string;
        entrypoint: string;
    };
}
/** Capability files a plugin package declares. */
export interface PluginManifestPlugins {
    tools?: string[] | null;
    models?: string[] | null;
    endpoints?: string[] | null;
    agent_strategies?: string[] | null;
    datasources?: string[] | null;
    triggers?: string[] | null;
}
/**
 * Plugin declaration decoded from a `.difypkg`. This is the daemon's view of
 * `manifest.yaml` plus the resolved provider declarations.
 */
export interface PluginDeclaration {
    version: string;
    type: string;
    author: string;
    name: string;
    label: DifyI18nObject;
    description?: DifyI18nObject;
    icon: string;
    icon_dark?: string;
    created_at: string;
    resource: {
        memory: number;
        permission?: Record<string, unknown>;
    };
    plugins: PluginManifestPlugins;
    meta: PluginManifestMeta;
    tool?: unknown;
    model?: unknown;
    endpoint?: unknown;
    agent_strategy?: unknown;
    privacy?: string;
}
/** Response of `POST .../install/upload/package`. */
export interface PluginDecodeResponse {
    unique_identifier: string;
    manifest: PluginDeclaration;
    verification?: PluginVerification | null;
}
/** One installed plugin as reported by `GET .../management/list`. */
export interface InstalledPluginEntity {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    plugin_id: string;
    plugin_unique_identifier: string;
    declaration: PluginDeclaration;
    installation_id: string;
    tenant_id: string;
    endpoints_setups: number;
    endpoints_active: number;
    runtime_type: string;
    version: string;
    checksum: string;
    source?: string;
    meta?: Record<string, unknown>;
}
/** Paged response of `GET .../management/list`. */
export interface PluginListResponse {
    list: InstalledPluginEntity[];
    total: number;
}
/**
 * Envelope every dispatch route expects. Mirrors
 * `plugin_entities.InvokePluginRequest[T]`: the tenant comes from the path, the
 * plugin from the `X-Plugin-ID` header, and the operation payload from `data`.
 */
export interface DispatchRequest<T> {
    user_id: string;
    plugin_id?: string;
    conversation_id?: string | null;
    message_id?: string | null;
    app_id?: string | null;
    endpoint_id?: string | null;
    context?: Record<string, unknown>;
    data: T;
}
/** Payload of `POST .../dispatch/tool/invoke`. */
export interface InvokeToolData {
    provider: string;
    tool: string;
    tool_parameters: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    credential_type?: string;
}
/** Payload of `POST .../dispatch/tool/validate_credentials`. */
export interface ValidateToolCredentialsData {
    provider: string;
    credentials: Record<string, unknown>;
}
/** Payload of `POST .../dispatch/tool/get_runtime_parameters`. */
export interface GetToolRuntimeParametersData {
    provider: string;
    tool: string;
    credentials?: Record<string, unknown>;
}
/** Payload of `POST .../dispatch/llm/invoke`. */
export interface InvokeLlmData {
    provider: string;
    model: string;
    model_type: string;
    mode?: string;
    credentials?: Record<string, unknown>;
    credential_type?: string;
    completion_params?: Record<string, unknown>;
    prompt_messages: {
        role: string;
        content: unknown;
        name?: string;
        tool_call_id?: string;
    }[];
    tools?: unknown[] | null;
    stop?: string[] | null;
    stream?: boolean;
    user_id?: string;
}
/** Payload of `POST .../dispatch/model/validate_provider_credentials`. */
export interface ValidateProviderCredentialsData {
    provider: string;
    credentials: Record<string, unknown>;
}
/** Payload of `POST .../dispatch/model/validate_model_credentials`. */
export interface ValidateModelCredentialsData {
    provider: string;
    model_type: string;
    model: string;
    credentials: Record<string, unknown>;
}
/** Payload of `POST .../dispatch/agent_strategy/invoke`. */
export interface InvokeAgentStrategyData {
    agent_strategy_provider: string;
    agent_strategy: string;
    agent_strategy_params: Record<string, unknown>;
}
/** Payload of `POST .../dispatch/datasource/*` operations that carry credentials. */
export interface DatasourceCredentialsData {
    provider: string;
    credentials: Record<string, unknown>;
    datasource?: string;
}
/** Payload of `POST .../dispatch/trigger/subscribe`. */
export interface TriggerSubscribeData {
    provider: string;
    trigger: string;
    credentials?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    endpoint?: string;
}
/** Payload of `POST .../endpoint/setup`. */
export interface EndpointSetupRequest {
    tenant_id: string;
    user_id: string;
    plugin_unique_identifier: string;
    name: string;
    settings: Record<string, unknown>;
}
/** One chunk of a streaming tool response. */
export interface ToolResponseChunk {
    type: string;
    message: Record<string, unknown>;
    meta?: Record<string, unknown>;
}
/** One chunk of a streaming LLM response. */
export interface LlmResultChunk {
    model?: string;
    prompt_messages?: unknown[];
    system_fingerprint?: string;
    delta?: {
        index?: number;
        message?: {
            role?: string;
            content?: unknown;
            tool_calls?: unknown[];
        };
        usage?: Record<string, unknown> | null;
        finish_reason?: string | null;
    };
}
/** Daemon management routes, relative to `/plugin/{tenantId}/management`. */
export declare const DAEMON_MANAGEMENT_ROUTES: {
    readonly uploadPackage: "install/upload/package";
    readonly uploadBundle: "install/upload/bundle";
    readonly installIdentifiers: "install/identifiers";
    readonly upgrade: "install/upgrade";
    readonly tasks: "install/tasks";
    readonly decodeFromIdentifier: "decode/from_identifier";
    readonly fetchManifest: "fetch/manifest";
    readonly fetchIdentifier: "fetch/identifier";
    readonly fetchReadme: "fetch/readme";
    readonly uninstall: "uninstall";
    readonly list: "list";
    readonly installationIds: "installation/ids";
    readonly tools: "tools";
    readonly models: "models";
    readonly triggers: "triggers";
    readonly datasources: "datasources";
    readonly agentStrategies: "agent_strategies";
};
/** Daemon dispatch routes, relative to `/plugin/{tenantId}/dispatch`. */
export declare const DAEMON_DISPATCH_ROUTES: {
    readonly toolInvoke: "tool/invoke";
    readonly toolValidateCredentials: "tool/validate_credentials";
    readonly toolRuntimeParameters: "tool/get_runtime_parameters";
    readonly llmInvoke: "llm/invoke";
    readonly llmNumTokens: "llm/num_tokens";
    readonly textEmbeddingInvoke: "text_embedding/invoke";
    readonly rerankInvoke: "rerank/invoke";
    readonly ttsInvoke: "tts/invoke";
    readonly speech2textInvoke: "speech2text/invoke";
    readonly moderationInvoke: "moderation/invoke";
    readonly validateProviderCredentials: "model/validate_provider_credentials";
    readonly validateModelCredentials: "model/validate_model_credentials";
    readonly modelSchema: "model/schema";
    readonly agentStrategyInvoke: "agent_strategy/invoke";
    readonly datasourceValidateCredentials: "datasource/validate_credentials";
    readonly datasourceWebsiteCrawl: "datasource/get_website_crawl";
    readonly datasourceOnlineDocumentPages: "datasource/get_online_document_pages";
    readonly datasourceOnlineDocumentPageContent: "datasource/get_online_document_page_content";
    readonly datasourceOnlineDriveBrowseFiles: "datasource/online_drive_browse_files";
    readonly datasourceOnlineDriveDownloadFile: "datasource/online_drive_download_file";
    readonly triggerInvokeEvent: "trigger/invoke_event";
    readonly triggerValidateCredentials: "trigger/validate_credentials";
    readonly triggerDispatchEvent: "trigger/dispatch_event";
    readonly triggerSubscribe: "trigger/subscribe";
    readonly triggerUnsubscribe: "trigger/unsubscribe";
    readonly triggerRefresh: "trigger/refresh";
};
//# sourceMappingURL=daemon.d.ts.map