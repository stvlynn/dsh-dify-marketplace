/**
 * Host HTTP bridge consumed by the Settings micro-frontend.
 *
 * @module dsh-dify-marketplace/host/interfaces/web-routes
 */
import { BRIDGE_ROUTE_PREFIX, BRIDGE_ROUTES } from "../../shared/contracts/bridge.js";
import { supportedCategories } from "../domain/capability.js";
import { DifyMarketplaceError } from "../domain/errors.js";
import { daemonConfigured } from "../config.js";
import { handle, queryParam, readJsonBody, requireString, sendJson } from "./http.js";
/**
 * Register every bridge route on the Harness web server.
 * @param ctx - Host context.
 * @param services - catalog, install, and clients.
 */
export function registerBridgeRoutes(ctx, services) {
    const prefix = BRIDGE_ROUTE_PREFIX;
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.status}`,
        handler: handle('marketplace_unavailable', async (_req, res) => {
            sendJson(res, 200, await status(services));
        }),
    }), 'bridge:status');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.search}`,
        handler: handle('marketplace_unavailable', async (req, res) => {
            const body = await readJsonBody(req);
            sendJson(res, 200, await services.catalog.search({
                query: typeof body.query === 'string' ? body.query : '',
                page: typeof body.page === 'number' ? body.page : 1,
                pageSize: typeof body.pageSize === 'number' ? body.pageSize : 20,
                category: (body.category ?? ''),
                ...(body.tags === undefined ? {} : { tags: body.tags }),
                ...(body.sortBy === undefined ? {} : { sortBy: body.sortBy }),
                ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
                ...(body.kind === undefined ? {} : { kind: body.kind }),
            }));
        }),
    }), 'bridge:search');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.collections}`,
        handler: handle('marketplace_unavailable', async (_req, res) => {
            sendJson(res, 200, await services.catalog.collections());
        }),
    }), 'bridge:collections');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.detail}`,
        handler: handle('marketplace_unavailable', async (req, res) => {
            const pluginId = queryParam(req, 'pluginId');
            if (pluginId === undefined)
                throw new DifyMarketplaceError('bad_request', 'pluginId is required');
            sendJson(res, 200, await services.catalog.detail(pluginId));
        }),
    }), 'bridge:detail');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.icon}`,
        handler: handle('marketplace_unavailable', async (req, res) => {
            const pluginId = queryParam(req, 'pluginId');
            if (pluginId === undefined)
                throw new DifyMarketplaceError('bad_request', 'pluginId is required');
            const icon = await services.catalog.icon(pluginId);
            res.writeHead(200, {
                'content-type': icon.contentType,
                'cache-control': 'public, max-age=3600',
            });
            res.end(Buffer.from(icon.bytes));
        }),
    }), 'bridge:icon');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.installed}`,
        handler: handle('daemon_unavailable', async (_req, res) => {
            sendJson(res, 200, await requireInstall(services).installed());
        }),
    }), 'bridge:installed');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.install}`,
        handler: handle('install_failed', async (req, res) => {
            const uniqueIdentifier = requireString(await readJsonBody(req), 'uniqueIdentifier');
            sendJson(res, 200, await requireInstall(services).install(uniqueIdentifier));
        }),
    }), 'bridge:install');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.installTask}`,
        handler: handle('install_failed', async (req, res) => {
            const taskId = queryParam(req, 'taskId');
            if (taskId === undefined)
                throw new DifyMarketplaceError('bad_request', 'taskId is required');
            sendJson(res, 200, await requireInstall(services).installTask(taskId));
        }),
    }), 'bridge:install-task');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.uninstall}`,
        handler: handle('daemon_unavailable', async (req, res) => {
            const pluginId = requireString(await readJsonBody(req), 'pluginId');
            sendJson(res, 200, await requireInstall(services).uninstall(pluginId));
        }),
    }), 'bridge:uninstall');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: `${prefix}${BRIDGE_ROUTES.credentials}`,
        handler: handle('credentials_invalid', async (req, res) => {
            const body = await readJsonBody(req);
            const pluginId = requireString(body, 'pluginId');
            if (body.credentials === undefined || typeof body.credentials !== 'object') {
                throw new DifyMarketplaceError('bad_request', 'credentials object is required');
            }
            sendJson(res, 200, await requireInstall(services).saveCredentials(pluginId, body.credentials));
        }),
    }), 'bridge:credentials');
}
function requireInstall(services) {
    if (services.install === undefined) {
        throw new DifyMarketplaceError('daemon_unconfigured', 'plugin daemon is not configured');
    }
    return services.install;
}
async function status(services) {
    let marketplaceReachable = false;
    let marketplaceError;
    try {
        marketplaceReachable = await services.marketplace.ping();
    }
    catch (error) {
        marketplaceError = error instanceof DifyMarketplaceError
            ? error.toBridgeError()
            : { code: 'marketplace_unavailable', detail: String(error) };
    }
    const configured = daemonConfigured(services.config);
    let daemonReachable = false;
    let daemonError;
    if (configured && services.daemon !== undefined) {
        try {
            daemonReachable = await services.daemon.health();
        }
        catch (error) {
            daemonError = error instanceof DifyMarketplaceError
                ? error.toBridgeError()
                : { code: 'daemon_unavailable', detail: String(error) };
        }
    }
    return {
        pluginVersion: services.version,
        marketplace: {
            baseUrl: services.config.marketplaceBaseUrl,
            reachable: marketplaceReachable,
            ...(marketplaceError === undefined ? {} : { error: marketplaceError }),
        },
        daemon: {
            configured,
            baseUrl: configured ? services.config.daemonBaseUrl : null,
            tenantId: configured ? services.config.daemonTenantId : null,
            reachable: daemonReachable,
            ...(daemonError === undefined ? {} : { error: daemonError }),
        },
        supportedCategories: supportedCategories(),
    };
}
//# sourceMappingURL=web-routes.js.map