/**
 * Catalog use cases: search, collections, detail, versions, icon.
 *
 * @module dsh-dify-marketplace/host/application/catalog
 */

import type {
  BridgeCollectionsResponse,
  BridgeDetailResponse,
  BridgePluginListItem,
  BridgeRegistrationPreview,
  BridgeSearchRequest,
  BridgeSearchResponse,
} from '../../shared/contracts/bridge.ts'
import type { DifyCredentialField, MarketplacePluginCategory, MarketplacePluginSummary } from '../../shared/contracts/marketplace.ts'
import { parsePluginId } from '../../shared/identifier.ts'
import { categoryMapping, projectedToolNames } from '../domain/capability.ts'
import { modelCredentialFields, snapshotFromDetail } from '../domain/snapshot.ts'
import type { MarketplaceClient } from '../infrastructure/marketplace-client.ts'
import type { StateStore } from '../infrastructure/state-store.ts'
import type { CredentialVault } from '../infrastructure/credential-vault.ts'

/** Catalog dependencies. */
export interface CatalogDeps {
  marketplace: MarketplaceClient
  state: StateStore
  vault: CredentialVault
}

/** Marketplace catalog operations. */
export class CatalogService {
  constructor(private readonly deps: CatalogDeps) {}

  /**
   * Search plugins or bundles and annotate with local install state.
   * @param request - search request from the bridge.
   */
  async search(request: BridgeSearchRequest): Promise<BridgeSearchResponse> {
    const page = Math.max(1, request.page)
    const pageSize = Math.min(40, Math.max(1, request.pageSize))
    const body = {
      page,
      page_size: pageSize,
      query: request.query,
      ...(request.category === '' ? {} : { category: request.category }),
      ...(request.tags === undefined ? {} : { tags: request.tags }),
      ...(request.sortBy === undefined ? {} : { sort_by: request.sortBy }),
      ...(request.sortOrder === undefined ? {} : { sort_order: request.sortOrder }),
    }
    if (request.kind === 'bundles') {
      const data = await this.deps.marketplace.searchBundles(body)
      return {
        plugins: await this.annotate(data.bundles),
        total: data.total,
        page,
        pageSize,
      }
    }
    const data = await this.deps.marketplace.searchPlugins(body)
    return {
      plugins: await this.annotate(data.plugins),
      total: data.total,
      page,
      pageSize,
    }
  }

  /**
   * List curated collections and the plugins inside each.
   */
  async collections(): Promise<BridgeCollectionsResponse> {
    const data = await this.deps.marketplace.collections()
    const collections = []
    for (const collection of data.collections) {
      const plugins = await this.deps.marketplace.collectionPlugins(collection.name)
      collections.push({
        collection,
        plugins: await this.annotate(plugins),
      })
    }
    return { collections }
  }

  /**
   * Full detail, versions, credential schema, and registration preview.
   * @param pluginId - `<org>/<name>`.
   */
  async detail(pluginId: string): Promise<BridgeDetailResponse> {
    const { org, name } = parsePluginId(pluginId)
    const plugin = await this.deps.marketplace.pluginDetail(org, name)
    const versions = await this.deps.marketplace.pluginVersions(org, name)
    const installed = await this.deps.state.get(pluginId)
    const snapshot = snapshotFromDetail(plugin)
    const credentialFields: DifyCredentialField[] = snapshot.credentialFields.length > 0
      ? snapshot.credentialFields
      : modelCredentialFields(plugin)
    return {
      plugin,
      versions,
      installedVersion: installed?.version ?? null,
      credentialFields,
      credentialsStored: installed !== undefined && await this.deps.vault.has(pluginId),
      registration: preview(plugin.category, projectedToolNames(plugin), categoryMapping(plugin.category).description),
    }
  }

  /**
   * Proxy one plugin icon.
   * @param pluginId - `<org>/<name>`.
   */
  async icon(pluginId: string): Promise<{ bytes: Uint8Array, contentType: string }> {
    const { org, name } = parsePluginId(pluginId)
    return this.deps.marketplace.pluginIcon(org, name)
  }

  /** Annotate marketplace records with local install facts. */
  private async annotate(plugins: MarketplacePluginSummary[]): Promise<BridgePluginListItem[]> {
    const installed = await this.deps.state.list()
    const byId = new Map(installed.map(plugin => [plugin.pluginId, plugin]))
    return plugins.map((plugin) => {
      const local = byId.get(plugin.plugin_id)
      return {
        plugin,
        installedVersion: local?.version ?? null,
        upgradable: local !== undefined && local.version !== plugin.latest_version,
      }
    })
  }
}

/** Build a registration preview. */
function preview(
  category: MarketplacePluginCategory,
  toolNames: string[],
  surface: string,
): BridgeRegistrationPreview {
  const mapping = categoryMapping(category)
  return {
    category,
    supported: mapping.surface !== 'unsupported',
    toolNames,
    surface,
  }
}
