/**
 * Marketplace section tabs. Labels come from the locale dictionaries; ids
 * match the live marketplace information architecture captured in
 * `fixtures/marketplace/playwright-ia.json`.
 *
 * @module dsh-dify-marketplace/client/shared/tabs
 */
import type { MarketplacePluginCategory } from '../../shared/contracts/marketplace.ts';
import type { MessageKey } from './locales.ts';
/** One settings-section tab. */
export interface MarketplaceTab {
    id: MarketplaceTabId;
    key: MessageKey;
    category: MarketplacePluginCategory | '';
}
/** Tab identity used by the settings page. */
export type MarketplaceTabId = 'all' | MarketplacePluginCategory | 'bundles' | 'installed';
/** Tabs the Settings section renders, in marketplace homepage order plus Installed. */
export declare const MARKETPLACE_TABS: readonly MarketplaceTab[];
//# sourceMappingURL=tabs.d.ts.map