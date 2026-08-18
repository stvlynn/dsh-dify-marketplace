/**
 * Same-origin client for the Host HTTP bridge.
 *
 * @module dsh-dify-marketplace/client/shared/api
 */
import { BRIDGE_ROUTE_PREFIX, BRIDGE_ROUTES, } from "../../shared/contracts/bridge.js";
/** Fetch JSON from a bridge route. */
export async function bridgeJson(route, init = {}) {
    const { query, ...rest } = init;
    const url = new URL(`${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES[route]}`, window.location.origin);
    if (query !== undefined) {
        for (const [key, value] of Object.entries(query))
            url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
        ...rest,
        headers: { accept: 'application/json', ...(rest.headers ?? {}) },
    });
    const text = await response.text();
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        throw asBridgeError({ code: 'marketplace_unavailable', detail: text.slice(0, 200) });
    }
    if (!response.ok) {
        throw asBridgeError(parsed);
    }
    return parsed;
}
function asBridgeError(value) {
    const record = value;
    const error = new Error(record.detail ?? 'bridge request failed');
    error.code = (record.code ?? 'marketplace_unavailable');
    error.detail = record.detail ?? error.message;
    return error;
}
export const api = {
    status: () => bridgeJson('status'),
    search: (body) => bridgeJson('search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }),
    collections: () => bridgeJson('collections'),
    detail: (pluginId) => bridgeJson('detail', { query: { pluginId } }),
    iconUrl: (pluginId) => `${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES.icon}?pluginId=${encodeURIComponent(pluginId)}`,
    installed: () => bridgeJson('installed'),
    install: (uniqueIdentifier) => bridgeJson('install', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uniqueIdentifier }),
    }),
    installTask: (taskId) => bridgeJson('installTask', { query: { taskId } }),
    uninstall: (pluginId) => bridgeJson('uninstall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pluginId }),
    }),
    saveCredentials: (pluginId, credentials) => bridgeJson('credentials', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pluginId, credentials }),
    }),
};
//# sourceMappingURL=api.js.map