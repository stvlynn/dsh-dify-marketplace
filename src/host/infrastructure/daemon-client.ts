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

import type {
  DaemonEnvelope,
  DispatchRequest,
  InstallPluginResponse,
  InstallTask,
  InstalledPluginEntity,
  PluginDecodeResponse,
  PluginListResponse,
} from '../../shared/contracts/daemon.ts'
import {
  DAEMON_API_KEY_HEADER,
  DAEMON_DISPATCH_ROUTES,
  DAEMON_MANAGEMENT_ROUTES,
  DAEMON_PLUGIN_ID_HEADER,
} from '../../shared/contracts/daemon.ts'
import { DifyMarketplaceError } from '../domain/errors.ts'
import { readJson, requestWithRetry } from './http.ts'

/** Daemon connection settings. */
export interface DaemonClientConfig {
  /** Daemon origin, without a trailing slash. */
  baseUrl: string
  /** Value sent as `X-Api-Key`; must equal the daemon's `SERVER_KEY`. */
  serverKey: string
  /** Tenant the Harness installs into. */
  tenantId: string
  /** User identity recorded on dispatch requests. */
  userId: string
  /** Per-attempt deadline in milliseconds. */
  timeoutMs: number
}

/** One dispatch route key. */
export type DispatchRoute = keyof typeof DAEMON_DISPATCH_ROUTES

/** Client for the daemon's management and dispatch surfaces. */
export class DaemonClient {
  constructor(private readonly config: DaemonClientConfig) {}

  /** The configured daemon origin. */
  get baseUrl(): string {
    return this.config.baseUrl
  }

  /** The tenant this client installs into. */
  get tenantId(): string {
    return this.config.tenantId
  }

  /**
   * Verify the daemon is reachable and the server key is accepted.
   *
   * `management/list` is the cheapest authenticated route, so a success here
   * proves connectivity and authorization together.
   * @param signal - caller cancellation.
   * @returns true when the daemon answered successfully.
   */
  async health(signal?: AbortSignal): Promise<boolean> {
    const url = `${this.config.baseUrl}/health/check`
    const response = await requestWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json', [DAEMON_API_KEY_HEADER]: this.config.serverKey },
      signal,
      failureCode: 'daemon_unavailable',
      policy: { timeoutMs: 5_000, retries: 1 },
    })
    if (response.ok) return true
    await this.listPlugins(1, 1, signal)
    return true
  }

  /**
   * Upload and decode a `.difypkg`, producing the unique identifier the install
   * step consumes.
   * @param bytes - the package bytes.
   * @param fileName - name recorded in the multipart part.
   * @param verifySignature - require a valid Dify signature.
   * @param signal - caller cancellation.
   * @returns the decoded identifier, manifest, and verification result.
   */
  async uploadPackage(
    bytes: Uint8Array,
    fileName: string,
    verifySignature: boolean,
    signal?: AbortSignal,
  ): Promise<PluginDecodeResponse> {
    const form = new FormData()
    // Copy into a standalone Uint8Array: a view over a larger buffer would
    // otherwise upload the whole backing store.
    form.append('dify_pkg', new Blob([bytes.slice()], { type: 'application/zip' }), fileName)
    form.append('verify_signature', verifySignature ? 'true' : 'false')
    return this.management<PluginDecodeResponse>(
      DAEMON_MANAGEMENT_ROUTES.uploadPackage,
      { method: 'POST', form, signal, timeoutMs: 300_000 },
    )
  }

  /**
   * Install decoded packages into the tenant.
   * @param uniqueIdentifiers - decoded package identifiers.
   * @param source - installation provenance recorded by the daemon.
   * @param signal - caller cancellation.
   * @returns the task to poll, plus whether everything was already installed.
   */
  async installFromIdentifiers(
    uniqueIdentifiers: string[],
    source: string,
    signal?: AbortSignal,
  ): Promise<InstallPluginResponse> {
    return this.management<InstallPluginResponse>(
      DAEMON_MANAGEMENT_ROUTES.installIdentifiers,
      {
        method: 'POST',
        json: {
          plugin_unique_identifiers: uniqueIdentifiers,
          source,
          // The daemon requires metas to be exactly as long as identifiers.
          metas: uniqueIdentifiers.map(() => ({})),
        },
        signal,
      },
    )
  }

  /**
   * Fetch one installation task.
   * @param taskId - task id returned by {@link installFromIdentifiers}.
   * @param signal - caller cancellation.
   * @returns the task with per-plugin progress.
   */
  async installTask(taskId: string, signal?: AbortSignal): Promise<InstallTask> {
    return this.management<InstallTask>(
      `${DAEMON_MANAGEMENT_ROUTES.tasks}/${encodeURIComponent(taskId)}`,
      { method: 'GET', signal },
    )
  }

  /**
   * Poll one installation task until it settles.
   * @param taskId - task id to poll.
   * @param options - poll interval and overall deadline.
   * @param signal - caller cancellation.
   * @returns the settled task.
   * @throws DifyMarketplaceError when the deadline passes first.
   */
  async awaitInstallTask(
    taskId: string,
    options: { intervalMs?: number, deadlineMs?: number } = {},
    signal?: AbortSignal,
  ): Promise<InstallTask> {
    const intervalMs = options.intervalMs ?? 1_000
    const deadlineMs = options.deadlineMs ?? 600_000
    const started = Date.now()
    for (;;) {
      const task = await this.installTask(taskId, signal)
      if (task.status === 'success' || task.status === 'failed') return task
      if (Date.now() - started > deadlineMs) {
        throw new DifyMarketplaceError(
          'install_failed',
          `install task ${taskId} did not settle within ${deadlineMs}ms (last status: ${task.status})`,
        )
      }
      await new Promise<void>((resolve) => { setTimeout(resolve, intervalMs) })
    }
  }

  /**
   * List installed plugins.
   * @param page - one-based page number.
   * @param pageSize - page size.
   * @param signal - caller cancellation.
   * @returns the page of installed plugins.
   */
  async listPlugins(page = 1, pageSize = 100, signal?: AbortSignal): Promise<PluginListResponse> {
    return this.management<PluginListResponse>(
      `${DAEMON_MANAGEMENT_ROUTES.list}?page=${page}&page_size=${pageSize}`,
      { method: 'GET', signal },
    )
  }

  /**
   * List every installed plugin, following pagination to the end.
   * @param signal - caller cancellation.
   * @returns every installed plugin in the tenant.
   */
  async listAllPlugins(signal?: AbortSignal): Promise<InstalledPluginEntity[]> {
    const pageSize = 100
    const all: InstalledPluginEntity[] = []
    for (let page = 1; ; page += 1) {
      const response = await this.listPlugins(page, pageSize, signal)
      all.push(...response.list)
      if (response.list.length < pageSize || all.length >= response.total) return all
    }
  }

  /**
   * Validate tool-provider credentials against the installed plugin.
   * @param pluginId - `<org>/<name>`.
   * @param provider - tool provider name.
   * @param credentials - field values.
   * @param signal - caller cancellation.
   */
  async validateToolCredentials(
    pluginId: string,
    provider: string,
    credentials: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<boolean> {
    await this.dispatch('toolValidateCredentials', pluginId, { provider, credentials }, signal)
    return true
  }

  /**
   * Validate model-provider credentials against the installed plugin.
   * @param pluginId - `<org>/<name>`.
   * @param provider - model provider name.
   * @param credentials - field values.
   * @param signal - caller cancellation.
   */
  async validateProviderCredentials(
    pluginId: string,
    provider: string,
    credentials: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<boolean> {
    await this.dispatch('validateProviderCredentials', pluginId, { provider, credentials }, signal)
    return true
  }

  /**
   * Allocate a daemon HTTP endpoint for an extension plugin.
   * @param uniqueIdentifier - installed package identifier.
   * @param name - endpoint display name.
   * @param settings - endpoint settings declared by the plugin.
   * @param signal - caller cancellation.
   * @returns the daemon's endpoint record.
   */
  async setupEndpoint(
    uniqueIdentifier: string,
    name: string,
    settings: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ id?: string, hook_id?: string }> {
    return this.tenantPost<{ id?: string, hook_id?: string }>(
      'endpoint/setup',
      {
        plugin_unique_identifier: uniqueIdentifier,
        name,
        settings,
        user_id: this.config.userId,
      },
      signal,
    )
  }

  /**
   * List HTTP endpoints belonging to one plugin.
   * @param pluginId - `<org>/<name>`.
   * @param signal - caller cancellation.
   */
  async listPluginEndpoints(
    pluginId: string,
    signal?: AbortSignal,
  ): Promise<{ endpoints: { id: string, hook_id: string, name: string, enabled: boolean }[] }> {
    const query = `?plugin_id=${encodeURIComponent(pluginId)}`
    return this.tenantGet(`endpoint/list/plugin${query}`, signal)
  }

  /**
   * Proxy one request to a daemon endpoint hook.
   * @param hookId - daemon hook id.
   * @param restPath - remainder after `/e/:hook_id`.
   * @param init - method, headers, and body.
   * @param signal - caller cancellation.
   */
  async proxyEndpoint(
    hookId: string,
    restPath: string,
    init: { method: string, headers: Record<string, string>, body?: Uint8Array },
    signal?: AbortSignal,
  ): Promise<Response> {
    const suffix = restPath.startsWith('/') ? restPath : `/${restPath}`
    const url = `${this.config.baseUrl}/e/${encodeURIComponent(hookId)}${suffix}`
    return requestWithRetry(url, {
      method: init.method,
      headers: { ...init.headers, [DAEMON_API_KEY_HEADER]: this.config.serverKey },
      ...(init.body === undefined ? {} : { body: new Blob([init.body.slice()]) }),
      signal,
      failureCode: 'daemon_unavailable',
      policy: { timeoutMs: this.config.timeoutMs, retries: 0 },
    })
  }

  /**
   * Uninstall one installation.
   * @param installationId - daemon installation id, not the plugin id.
   * @param signal - caller cancellation.
   * @returns true when the daemon reported success.
   */
  async uninstall(installationId: string, signal?: AbortSignal): Promise<boolean> {
    const result = await this.management<boolean>(
      DAEMON_MANAGEMENT_ROUTES.uninstall,
      { method: 'POST', json: { plugin_installation_id: installationId }, signal },
    )
    return result === true
  }

  /**
   * Fetch one plugin's README.
   * @param uniqueIdentifier - the installed package identifier.
   * @param language - Dify locale code.
   * @param signal - caller cancellation.
   * @returns the README text.
   */
  async fetchReadme(uniqueIdentifier: string, language: string, signal?: AbortSignal): Promise<string> {
    const query = `?plugin_unique_identifier=${encodeURIComponent(uniqueIdentifier)}`
      + `&language=${encodeURIComponent(language)}`
    return this.management<string>(
      `${DAEMON_MANAGEMENT_ROUTES.fetchReadme}${query}`,
      { method: 'GET', signal },
    )
  }

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
  async dispatch<T>(
    route: DispatchRoute,
    pluginId: string,
    data: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await this.dispatchRaw(route, pluginId, data, signal)
    const text = await response.text()
    return this.unwrapText<T>(text, DAEMON_DISPATCH_ROUTES[route])
  }

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
  async* dispatchStream<T>(
    route: DispatchRoute,
    pluginId: string,
    data: unknown,
    signal?: AbortSignal,
  ): AsyncGenerator<T, void, undefined> {
    const response = await this.dispatchRaw(route, pluginId, data, signal)
    const body = response.body
    if (body === null) {
      throw new DifyMarketplaceError('daemon_rejected', `dispatch ${route} returned no body`)
    }
    const decoder = new TextDecoder()
    let buffered = ''
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      buffered += decoder.decode(chunk, { stream: true })
      let newline = buffered.indexOf('\n')
      while (newline !== -1) {
        const line = buffered.slice(0, newline).trim()
        buffered = buffered.slice(newline + 1)
        if (line !== '') yield this.unwrapText<T>(line, DAEMON_DISPATCH_ROUTES[route])
        newline = buffered.indexOf('\n')
      }
    }
    const tail = buffered.trim()
    if (tail !== '') yield this.unwrapText<T>(tail, DAEMON_DISPATCH_ROUTES[route])
  }

  /** Issue one dispatch request without reading its body. */
  private async dispatchRaw(
    route: DispatchRoute,
    pluginId: string,
    data: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    const payload: DispatchRequest<unknown> = {
      user_id: this.config.userId,
      plugin_id: pluginId,
      data,
    }
    const url = `${this.config.baseUrl}/plugin/${encodeURIComponent(this.config.tenantId)}`
      + `/dispatch/${DAEMON_DISPATCH_ROUTES[route]}`
    const response = await requestWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
        [DAEMON_API_KEY_HEADER]: this.config.serverKey,
        [DAEMON_PLUGIN_ID_HEADER]: pluginId,
      },
      body: JSON.stringify(payload),
      signal,
      failureCode: 'daemon_unavailable',
      // Dispatch is never retried: a tool invocation is not guaranteed
      // idempotent, so a retry could duplicate a side effect.
      policy: { timeoutMs: this.config.timeoutMs, retries: 0 },
    })
    if (response.status === 404) {
      throw new DifyMarketplaceError(
        'plugin_not_installed',
        `daemon has no installation of ${pluginId} in tenant ${this.config.tenantId}`,
      )
    }
    if (response.status === 401) {
      throw new DifyMarketplaceError('daemon_rejected', 'daemon rejected the configured server key')
    }
    return response
  }

  /** POST one tenant-scoped JSON route outside `/management`. */
  private async tenantPost<T>(route: string, json: unknown, signal?: AbortSignal): Promise<T> {
    return this.tenantRequest<T>(route, { method: 'POST', json, signal })
  }

  /** GET one tenant-scoped JSON route outside `/management`. */
  private async tenantGet<T>(route: string, signal?: AbortSignal): Promise<T> {
    return this.tenantRequest<T>(route, { method: 'GET', signal })
  }

  /** Issue one tenant-scoped request and unwrap its envelope. */
  private async tenantRequest<T>(
    route: string,
    options: { method: 'GET' | 'POST', json?: unknown, signal?: AbortSignal },
  ): Promise<T> {
    const url = `${this.config.baseUrl}/plugin/${encodeURIComponent(this.config.tenantId)}/${route}`
    const headers: Record<string, string> = {
      Accept: 'application/json',
      [DAEMON_API_KEY_HEADER]: this.config.serverKey,
    }
    if (options.json !== undefined) headers['Content-Type'] = 'application/json'
    const response = await requestWithRetry(url, {
      method: options.method,
      headers,
      ...(options.json !== undefined ? { body: JSON.stringify(options.json) } : {}),
      signal: options.signal,
      failureCode: 'daemon_unavailable',
      policy: { timeoutMs: this.config.timeoutMs, retries: options.method === 'GET' ? 2 : 0 },
    })
    if (response.status === 401) {
      throw new DifyMarketplaceError('daemon_rejected', 'daemon rejected the configured server key')
    }
    const envelope = await readJson<DaemonEnvelope<T>>(response, 'daemon_rejected')
    if (envelope.code !== 0) {
      throw new DifyMarketplaceError(
        'daemon_rejected',
        `daemon answered code ${envelope.code} for ${route}: ${envelope.message}`,
      )
    }
    return envelope.data
  }

  /** Issue one management request and unwrap its envelope. */
  private async management<T>(
    route: string,
    options: {
      method: 'GET' | 'POST'
      json?: unknown
      form?: FormData
      signal?: AbortSignal | undefined
      timeoutMs?: number
    },
  ): Promise<T> {
    const url = `${this.config.baseUrl}/plugin/${encodeURIComponent(this.config.tenantId)}/management/${route}`
    const headers: Record<string, string> = {
      Accept: 'application/json',
      [DAEMON_API_KEY_HEADER]: this.config.serverKey,
    }
    // FormData must set its own multipart boundary, so no Content-Type here.
    if (options.json !== undefined) headers['Content-Type'] = 'application/json'
    const response = await requestWithRetry(url, {
      method: options.method,
      headers,
      ...(options.json !== undefined ? { body: JSON.stringify(options.json) } : {}),
      ...(options.form !== undefined ? { body: options.form } : {}),
      signal: options.signal,
      failureCode: 'daemon_unavailable',
      policy: {
        timeoutMs: options.timeoutMs ?? this.config.timeoutMs,
        // Only GETs are safe to retry; a repeated install would create a
        // second task for the same package.
        retries: options.method === 'GET' ? 2 : 0,
      },
    })
    if (response.status === 401) {
      throw new DifyMarketplaceError('daemon_rejected', 'daemon rejected the configured server key')
    }
    const envelope = await readJson<DaemonEnvelope<T>>(response, 'daemon_rejected')
    if (envelope.code !== 0) {
      throw new DifyMarketplaceError(
        'daemon_rejected',
        `daemon answered code ${envelope.code} for ${route}: ${envelope.message}`,
      )
    }
    return envelope.data
  }

  /** Parse one envelope line and unwrap it. */
  private unwrapText<T>(text: string, route: string): T {
    let envelope: DaemonEnvelope<T>
    try {
      envelope = JSON.parse(text) as DaemonEnvelope<T>
    } catch (error) {
      throw new DifyMarketplaceError(
        'daemon_rejected',
        `expected a JSON envelope from ${route}, received: ${text.slice(0, 200)}`,
        { cause: error },
      )
    }
    if (envelope.code !== 0) {
      throw new DifyMarketplaceError(
        'daemon_rejected',
        `daemon answered code ${envelope.code} for ${route}: ${envelope.message}`,
      )
    }
    return envelope.data
  }
}
