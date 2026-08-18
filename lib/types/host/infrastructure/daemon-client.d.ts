/**
 * dify-plugin-daemon client.
 *
 * Dify plugins are sandboxed processes with their own runtime, credentials, and
 * backwards-invocation protocol; reimplementing that lifecycle would be a
 * re-implementation of Dify itself. This client therefore drives the official
 * daemon, exactly as the Dify API server does
 * (`langgenius/dify`, `api/core/plugin/impl/*.py`).
 *
 * Two daemon behaviours are easy to get wrong and are handled here:
 *
 * - The daemon answers HTTP 200 for application-level failures and signals them
 *   through the envelope's `code` field, so status alone is never trusted.
 * - Management routes are tenant-scoped by path and dispatch routes additionally
 *   select the plugin with the `X-Plugin-ID` header, not with the body.
 *
 * @module dsh-dify-marketplace/host/infrastructure/daemon-client
 */
import type { InstallPluginResponse, InstallTask, InstalledPluginEntity, PluginDecodeResponse, PluginListResponse } from '../../shared/contracts/daemon.ts';
import { DAEMON_DISPATCH_ROUTES } from '../../shared/contracts/daemon.ts';
/** Daemon connection settings. */
export interface DaemonClientConfig {
    /** Daemon origin, without a trailing slash. */
    baseUrl: string;
    /** Value sent as `X-Api-Key`; must equal the daemon's `SERVER_KEY`. */
    serverKey: string;
    /** Tenant the Harness installs into. */
    tenantId: string;
    /** User identity recorded on dispatch requests. */
    userId: string;
    /** Per-attempt deadline in milliseconds. */
    timeoutMs: number;
}
/** One dispatch route key. */
export type DispatchRoute = keyof typeof DAEMON_DISPATCH_ROUTES;
/** Client for the daemon's management and dispatch surfaces. */
export declare class DaemonClient {
    private readonly config;
    constructor(config: DaemonClientConfig);
    /** The configured daemon origin. */
    get baseUrl(): string;
    /** The tenant this client installs into. */
    get tenantId(): string;
    /**
     * Verify the daemon is reachable and the server key is accepted.
     *
     * `management/list` is the cheapest authenticated route, so a success here
     * proves connectivity and authorization together.
     * @param signal - caller cancellation.
     * @returns true when the daemon answered successfully.
     */
    health(signal?: AbortSignal): Promise<boolean>;
    /**
     * Upload and decode a `.difypkg`, producing the unique identifier the install
     * step consumes.
     * @param bytes - the package bytes.
     * @param fileName - name recorded in the multipart part.
     * @param verifySignature - require a valid Dify signature.
     * @param signal - caller cancellation.
     * @returns the decoded identifier, manifest, and verification result.
     */
    uploadPackage(bytes: Uint8Array, fileName: string, verifySignature: boolean, signal?: AbortSignal): Promise<PluginDecodeResponse>;
    /**
     * Install decoded packages into the tenant.
     * @param uniqueIdentifiers - decoded package identifiers.
     * @param source - installation provenance recorded by the daemon.
     * @param signal - caller cancellation.
     * @returns the task to poll, plus whether everything was already installed.
     */
    installFromIdentifiers(uniqueIdentifiers: string[], source: string, signal?: AbortSignal): Promise<InstallPluginResponse>;
    /**
     * Fetch one installation task.
     * @param taskId - task id returned by {@link installFromIdentifiers}.
     * @param signal - caller cancellation.
     * @returns the task with per-plugin progress.
     */
    installTask(taskId: string, signal?: AbortSignal): Promise<InstallTask>;
    /**
     * Poll one installation task until it settles.
     * @param taskId - task id to poll.
     * @param options - poll interval and overall deadline.
     * @param signal - caller cancellation.
     * @returns the settled task.
     * @throws DifyMarketplaceError when the deadline passes first.
     */
    awaitInstallTask(taskId: string, options?: {
        intervalMs?: number;
        deadlineMs?: number;
    }, signal?: AbortSignal): Promise<InstallTask>;
    /**
     * List installed plugins.
     * @param page - one-based page number.
     * @param pageSize - page size.
     * @param signal - caller cancellation.
     * @returns the page of installed plugins.
     */
    listPlugins(page?: number, pageSize?: number, signal?: AbortSignal): Promise<PluginListResponse>;
    /**
     * List every installed plugin, following pagination to the end.
     * @param signal - caller cancellation.
     * @returns every installed plugin in the tenant.
     */
    listAllPlugins(signal?: AbortSignal): Promise<InstalledPluginEntity[]>;
    /**
     * Validate tool-provider credentials against the installed plugin.
     * @param pluginId - `<org>/<name>`.
     * @param provider - tool provider name.
     * @param credentials - field values.
     * @param signal - caller cancellation.
     */
    validateToolCredentials(pluginId: string, provider: string, credentials: Record<string, string>, signal?: AbortSignal): Promise<boolean>;
    /**
     * Validate model-provider credentials against the installed plugin.
     * @param pluginId - `<org>/<name>`.
     * @param provider - model provider name.
     * @param credentials - field values.
     * @param signal - caller cancellation.
     */
    validateProviderCredentials(pluginId: string, provider: string, credentials: Record<string, string>, signal?: AbortSignal): Promise<boolean>;
    /**
     * Allocate a daemon HTTP endpoint for an extension plugin.
     * @param uniqueIdentifier - installed package identifier.
     * @param name - endpoint display name.
     * @param settings - endpoint settings declared by the plugin.
     * @param signal - caller cancellation.
     * @returns the daemon's endpoint record.
     */
    setupEndpoint(uniqueIdentifier: string, name: string, settings: Record<string, unknown>, signal?: AbortSignal): Promise<{
        id?: string;
        hook_id?: string;
    }>;
    /**
     * List HTTP endpoints belonging to one plugin.
     * @param pluginId - `<org>/<name>`.
     * @param signal - caller cancellation.
     */
    listPluginEndpoints(pluginId: string, signal?: AbortSignal): Promise<{
        endpoints: {
            id: string;
            hook_id: string;
            name: string;
            enabled: boolean;
        }[];
    }>;
    /**
     * Proxy one request to a daemon endpoint hook.
     * @param hookId - daemon hook id.
     * @param restPath - remainder after `/e/:hook_id`.
     * @param init - method, headers, and body.
     * @param signal - caller cancellation.
     */
    proxyEndpoint(hookId: string, restPath: string, init: {
        method: string;
        headers: Record<string, string>;
        body?: Uint8Array;
    }, signal?: AbortSignal): Promise<Response>;
    /**
     * Uninstall one installation.
     * @param installationId - daemon installation id, not the plugin id.
     * @param signal - caller cancellation.
     * @returns true when the daemon reported success.
     */
    uninstall(installationId: string, signal?: AbortSignal): Promise<boolean>;
    /**
     * Fetch one plugin's README.
     * @param uniqueIdentifier - the installed package identifier.
     * @param language - Dify locale code.
     * @param signal - caller cancellation.
     * @returns the README text.
     */
    fetchReadme(uniqueIdentifier: string, language: string, signal?: AbortSignal): Promise<string>;
    /**
     * Invoke one dispatch route against one installed plugin.
     *
     * Dispatch responses are newline-delimited JSON streams for streaming
     * operations and a single envelope otherwise; {@link dispatchStream} handles
     * the streaming form.
     * @param route - dispatch route key.
     * @param pluginId - `<org>/<name>`, sent as `X-Plugin-ID`.
     * @param data - route payload.
     * @param signal - caller cancellation.
     * @returns the unwrapped response payload.
     */
    dispatch<T>(route: DispatchRoute, pluginId: string, data: unknown, signal?: AbortSignal): Promise<T>;
    /**
     * Invoke one dispatch route and yield its streamed chunks.
     *
     * The daemon writes one JSON envelope per line; a chunk whose `code` is
     * non-zero terminates the stream with a classified failure.
     * @param route - dispatch route key.
     * @param pluginId - `<org>/<name>`, sent as `X-Plugin-ID`.
     * @param data - route payload.
     * @param signal - caller cancellation.
     * @yields each chunk's payload.
     */
    dispatchStream<T>(route: DispatchRoute, pluginId: string, data: unknown, signal?: AbortSignal): AsyncGenerator<T, void, undefined>;
    /** Issue one dispatch request without reading its body. */
    private dispatchRaw;
    /** POST one tenant-scoped JSON route outside `/management`. */
    private tenantPost;
    /** GET one tenant-scoped JSON route outside `/management`. */
    private tenantGet;
    /** Issue one tenant-scoped request and unwrap its envelope. */
    private tenantRequest;
    /** Issue one management request and unwrap its envelope. */
    private management;
    /** Parse one envelope line and unwrap it. */
    private unwrapText;
}
//# sourceMappingURL=daemon-client.d.ts.map