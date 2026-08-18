/**
 * Marketplace section tabs. Labels come from the locale dictionaries; ids
 * match the live marketplace information architecture captured in
 * `fixtures/marketplace/playwright-ia.json`.
 *
 * @module dsh-dify-marketplace/client/shared/tabs
 */

import type { MarketplacePluginCategory } from '../../shared/contracts/marketplace.ts'
import type { MessageKey } from './locales.ts'

/** One settings-section tab. */
export interface MarketplaceTab {
  id: MarketplaceTabId
  key: MessageKey
  category: MarketplacePluginCategory | ''
}

/** Tab identity used by the settings page. */
export type MarketplaceTabId = 'all' | MarketplacePluginCategory | 'bundles' | 'installed'

/** Tabs the Settings section renders, in marketplace homepage order plus Installed. */
export const MARKETPLACE_TABS: readonly MarketplaceTab[] = [
  { id: 'all', key: 'tabAll', category: '' },
  { id: 'model', key: 'tabModels', category: 'model' },
  { id: 'tool', key: 'tabTools', category: 'tool' },
  { id: 'datasource', key: 'tabDatasources', category: 'datasource' },
  { id: 'agent-strategy', key: 'tabAgent', category: 'agent-strategy' },
  { id: 'trigger', key: 'tabTriggers', category: 'trigger' },
  { id: 'extension', key: 'tabExtensions', category: 'extension' },
  { id: 'bundles', key: 'tabBundles', category: '' },
  { id: 'installed', key: 'tabInstalled', category: '' },
]
