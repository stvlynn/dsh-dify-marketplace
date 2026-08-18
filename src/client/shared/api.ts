/**
 * Same-origin client for the Host HTTP bridge.
 *
 * @module dsh-dify-marketplace/client/shared/api
 */

import {
  BRIDGE_ROUTE_PREFIX,
  BRIDGE_ROUTES,
  type BridgeCollectionsResponse,
  type BridgeCredentialsResponse,
  type BridgeDetailResponse,
  type BridgeError,
  type BridgeInstallResponse,
  type BridgeInstallTaskResponse,
  type BridgeInstalledResponse,
  type BridgeSearchRequest,
  type BridgeSearchResponse,
  type BridgeStatus,
  type BridgeUninstallResponse,
} from '../../shared/contracts/bridge.ts'

/** Fetch JSON from a bridge route. */
export async function bridgeJson<T>(
  route: keyof typeof BRIDGE_ROUTES,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<T> {
  const { query, ...rest } = init
  const url = new URL(`${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES[route]}`, window.location.origin)
  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    ...rest,
    headers: { accept: 'application/json', ...(rest.headers ?? {}) },
  })
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw asBridgeError({ code: 'marketplace_unavailable', detail: text.slice(0, 200) })
  }
  if (!response.ok) {
    throw asBridgeError(parsed)
  }
  return parsed as T
}

function asBridgeError(value: unknown): Error & BridgeError {
  const record = value as { code?: string, detail?: string }
  const error = new Error(record.detail ?? 'bridge request failed') as Error & BridgeError
  error.code = (record.code ?? 'marketplace_unavailable') as BridgeError['code']
  error.detail = record.detail ?? error.message
  return error
}

export const api = {
  status: () => bridgeJson<BridgeStatus>('status'),
  search: (body: BridgeSearchRequest) => bridgeJson<BridgeSearchResponse>('search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }),
  collections: () => bridgeJson<BridgeCollectionsResponse>('collections'),
  detail: (pluginId: string) => bridgeJson<BridgeDetailResponse>('detail', { query: { pluginId } }),
  iconUrl: (pluginId: string) => `${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES.icon}?pluginId=${encodeURIComponent(pluginId)}`,
  installed: () => bridgeJson<BridgeInstalledResponse>('installed'),
  install: (uniqueIdentifier: string) => bridgeJson<BridgeInstallResponse>('install', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ uniqueIdentifier }),
  }),
  installTask: (taskId: string) => bridgeJson<BridgeInstallTaskResponse>('installTask', { query: { taskId } }),
  uninstall: (pluginId: string) => bridgeJson<BridgeUninstallResponse>('uninstall', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pluginId }),
  }),
  saveCredentials: (pluginId: string, credentials: Record<string, string>) =>
    bridgeJson<BridgeCredentialsResponse>('credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pluginId, credentials }),
    }),
}
