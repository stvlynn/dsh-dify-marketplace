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
/** Header carrying the daemon server key; required on every management and dispatch route. */
export const DAEMON_API_KEY_HEADER = 'X-Api-Key';
/** Header selecting the installed plugin a dispatch request targets. */
export const DAEMON_PLUGIN_ID_HEADER = 'X-Plugin-ID';
/** Daemon management routes, relative to `/plugin/{tenantId}/management`. */
export const DAEMON_MANAGEMENT_ROUTES = {
    uploadPackage: 'install/upload/package',
    uploadBundle: 'install/upload/bundle',
    installIdentifiers: 'install/identifiers',
    upgrade: 'install/upgrade',
    tasks: 'install/tasks',
    decodeFromIdentifier: 'decode/from_identifier',
    fetchManifest: 'fetch/manifest',
    fetchIdentifier: 'fetch/identifier',
    fetchReadme: 'fetch/readme',
    uninstall: 'uninstall',
    list: 'list',
    installationIds: 'installation/ids',
    tools: 'tools',
    models: 'models',
    triggers: 'triggers',
    datasources: 'datasources',
    agentStrategies: 'agent_strategies',
};
/** Daemon dispatch routes, relative to `/plugin/{tenantId}/dispatch`. */
export const DAEMON_DISPATCH_ROUTES = {
    toolInvoke: 'tool/invoke',
    toolValidateCredentials: 'tool/validate_credentials',
    toolRuntimeParameters: 'tool/get_runtime_parameters',
    llmInvoke: 'llm/invoke',
    llmNumTokens: 'llm/num_tokens',
    textEmbeddingInvoke: 'text_embedding/invoke',
    rerankInvoke: 'rerank/invoke',
    ttsInvoke: 'tts/invoke',
    speech2textInvoke: 'speech2text/invoke',
    moderationInvoke: 'moderation/invoke',
    validateProviderCredentials: 'model/validate_provider_credentials',
    validateModelCredentials: 'model/validate_model_credentials',
    modelSchema: 'model/schema',
    agentStrategyInvoke: 'agent_strategy/invoke',
    datasourceValidateCredentials: 'datasource/validate_credentials',
    datasourceWebsiteCrawl: 'datasource/get_website_crawl',
    datasourceOnlineDocumentPages: 'datasource/get_online_document_pages',
    datasourceOnlineDocumentPageContent: 'datasource/get_online_document_page_content',
    datasourceOnlineDriveBrowseFiles: 'datasource/online_drive_browse_files',
    datasourceOnlineDriveDownloadFile: 'datasource/online_drive_download_file',
    triggerInvokeEvent: 'trigger/invoke_event',
    triggerValidateCredentials: 'trigger/validate_credentials',
    triggerDispatchEvent: 'trigger/dispatch_event',
    triggerSubscribe: 'trigger/subscribe',
    triggerUnsubscribe: 'trigger/unsubscribe',
    triggerRefresh: 'trigger/refresh',
};
//# sourceMappingURL=daemon.js.map