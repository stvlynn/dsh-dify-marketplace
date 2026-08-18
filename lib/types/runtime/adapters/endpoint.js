/**
 * Extension (endpoint) plugins are served through the Harness web server.
 *
 * The daemon exposes plugin HTTP at `/e/:hook_id/*`. This adapter registers a
 * prefix under `/dify-marketplace/e/<org>/<name>` and forwards.
 *
 * @module dsh-dify-marketplace/runtime/adapters/endpoint
 */
import { DifyMarketplaceError } from "../../host/domain/errors.js";
/** Endpoint adapter. */
export const registerEndpointAdapter = (ctx, config, deps) => {
    const hookId = config.endpointHookId;
    if (hookId === undefined || hookId === '') {
        throw new DifyMarketplaceError('registration_failed', `extension plugin ${config.pluginId} has no daemon endpoint hook; setup the endpoint before mounting`);
    }
    const prefix = `/dify-marketplace/e/${config.org}/${config.name}`;
    ctx.effect(() => ctx.webServer.register({
        kind: 'prefix',
        path: prefix,
        handler: (req, res) => {
            void proxy(req, res, deps, hookId, prefix);
        },
    }), `dify-endpoint:${config.pluginId}`);
    return [];
};
/** Forward one request to the daemon endpoint hook. */
async function proxy(req, res, deps, hookId, prefix) {
    const url = new URL(req.url ?? '/', 'http://dsh.local');
    const rest = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
    const chunks = [];
    for await (const chunk of req)
        chunks.push(Buffer.from(chunk));
    const body = chunks.length === 0 ? undefined : new Uint8Array(Buffer.concat(chunks));
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string')
            headers[key] = value;
    }
    try {
        const upstream = await deps.daemon.proxyEndpoint(hookId, rest + url.search, {
            method: req.method ?? 'GET',
            headers,
            body,
        });
        res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
        const bytes = new Uint8Array(await upstream.arrayBuffer());
        res.end(Buffer.from(bytes));
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ code: 'daemon_unavailable', detail }));
    }
}
//# sourceMappingURL=endpoint.js.map