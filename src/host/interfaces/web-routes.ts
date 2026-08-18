/**
 * Host HTTP bridge consumed by the Settings micro-frontend.
 *
 * @module dsh-dify-marketplace/host/interfaces/web-routes
 */

import type { Context } from '@deepseek-ai/cordis'
import { BRIDGE_ROUTE_PREFIX, BRIDGE_ROUTES, type BridgeSearchRequest, type BridgeStatus } from '../../shared/contracts/bridge.ts'
import type { MarketplacePluginCategory } from '../../shared/contracts/marketplace.ts'
import { supportedCategories } from '../domain/capability.ts'
import { DifyMarketplaceError } from '../domain/errors.ts'
import { daemonConfigured, type ResolvedConfig } from '../config.ts'
import type { CatalogService } from '../application/catalog.ts'
import type { InstallService } from '../application/install.ts'
import type { MarketplaceClient } from '../infrastructure/marketplace-client.ts'
import type { DaemonClient } from '../infrastructure/daemon-client.ts'
import { handle, queryParam, readJsonBody, requireString, sendJson } from './http.ts'

/** Services the bridge handlers close over. */
export interface BridgeServices {
  config: ResolvedConfig
  marketplace: MarketplaceClient
  daemon: DaemonClient | undefined
  catalog: CatalogService
  install: InstallService | undefined
  version: string
}

/**
 * Register every bridge route on the Harness web server.
 * @param ctx - Host context.
 * @param services - catalog, install, and clients.
 */
export function registerBridgeRoutes(ctx: Context, services: BridgeServices): void {
  const prefix = BRIDGE_ROUTE_PREFIX
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.status}`,
    handler: handle('marketplace_unavailable', async (_req, res) => {
      sendJson(res, 200, await status(services))
    }),
  }), 'bridge:status')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.search}`,
    handler: handle('marketplace_unavailable', async (req, res) => {
      const body = await readJsonBody(req) as Partial<BridgeSearchRequest>
      sendJson(res, 200, await services.catalog.search({
        query: typeof body.query === 'string' ? body.query : '',
        page: typeof body.page === 'number' ? body.page : 1,
        pageSize: typeof body.pageSize === 'number' ? body.pageSize : 20,
        category: (body.category ?? '') as MarketplacePluginCategory | '',
        ...(body.tags === undefined ? {} : { tags: body.tags }),
        ...(body.sortBy === undefined ? {} : { sortBy: body.sortBy }),
        ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
        ...(body.kind === undefined ? {} : { kind: body.kind }),
      }))
    }),
  }), 'bridge:search')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.collections}`,
    handler: handle('marketplace_unavailable', async (_req, res) => {
      sendJson(res, 200, await services.catalog.collections())
    }),
  }), 'bridge:collections')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.detail}`,
    handler: handle('marketplace_unavailable', async (req, res) => {
      const pluginId = queryParam(req, 'pluginId')
      if (pluginId === undefined) throw new DifyMarketplaceError('bad_request', 'pluginId is required')
      sendJson(res, 200, await services.catalog.detail(pluginId))
    }),
  }), 'bridge:detail')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.icon}`,
    handler: handle('marketplace_unavailable', async (req, res) => {
      const pluginId = queryParam(req, 'pluginId')
      if (pluginId === undefined) throw new DifyMarketplaceError('bad_request', 'pluginId is required')
      const icon = await services.catalog.icon(pluginId)
      res.writeHead(200, {
        'content-type': icon.contentType,
        'cache-control': 'public, max-age=3600',
      })
      res.end(Buffer.from(icon.bytes))
    }),
  }), 'bridge:icon')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.installed}`,
    handler: handle('daemon_unavailable', async (_req, res) => {
      sendJson(res, 200, await requireInstall(services).installed())
    }),
  }), 'bridge:installed')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.install}`,
    handler: handle('install_failed', async (req, res) => {
      const uniqueIdentifier = requireString(await readJsonBody(req), 'uniqueIdentifier')
      sendJson(res, 200, await requireInstall(services).install(uniqueIdentifier))
    }),
  }), 'bridge:install')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.installTask}`,
    handler: handle('install_failed', async (req, res) => {
      const taskId = queryParam(req, 'taskId')
      if (taskId === undefined) throw new DifyMarketplaceError('bad_request', 'taskId is required')
      sendJson(res, 200, await requireInstall(services).installTask(taskId))
    }),
  }), 'bridge:install-task')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.uninstall}`,
    handler: handle('daemon_unavailable', async (req, res) => {
      const pluginId = requireString(await readJsonBody(req), 'pluginId')
      sendJson(res, 200, await requireInstall(services).uninstall(pluginId))
    }),
  }), 'bridge:uninstall')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}${BRIDGE_ROUTES.credentials}`,
    handler: handle('credentials_invalid', async (req, res) => {
      const body = await readJsonBody(req) as { pluginId?: string, credentials?: Record<string, string> }
      const pluginId = requireString(body, 'pluginId')
      if (body.credentials === undefined || typeof body.credentials !== 'object') {
        throw new DifyMarketplaceError('bad_request', 'credentials object is required')
      }
      sendJson(res, 200, await requireInstall(services).saveCredentials(pluginId, body.credentials))
    }),
  }), 'bridge:credentials')
}

function requireInstall(services: BridgeServices): InstallService {
  if (services.install === undefined) {
    throw new DifyMarketplaceError('daemon_unconfigured', 'plugin daemon is not configured')
  }
  return services.install
}

async function status(services: BridgeServices): Promise<BridgeStatus> {
  let marketplaceReachable = false
  let marketplaceError: BridgeStatus['marketplace']['error']
  try {
    marketplaceReachable = await services.marketplace.ping()
  } catch (error) {
    marketplaceError = error instanceof DifyMarketplaceError
      ? error.toBridgeError()
      : { code: 'marketplace_unavailable', detail: String(error) }
  }
  const configured = daemonConfigured(services.config)
  let daemonReachable = false
  let daemonError: BridgeStatus['daemon']['error']
  if (configured && services.daemon !== undefined) {
    try {
      daemonReachable = await services.daemon.health()
    } catch (error) {
      daemonError = error instanceof DifyMarketplaceError
        ? error.toBridgeError()
        : { code: 'daemon_unavailable', detail: String(error) }
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
  }
}
