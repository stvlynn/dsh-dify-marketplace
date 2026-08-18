/**
 * Marketplace section tabs. Labels come from the locale dictionaries; ids
 * match the live marketplace information architecture captured in
 * `fixtures/marketplace/playwright-ia.json`.
 *
 * @module dsh-dify-marketplace/client/shared/tabs
 */
/** Tabs the Settings section renders, in marketplace homepage order plus Installed. */
export const MARKETPLACE_TABS = [
    { id: 'all', key: 'tabAll', category: '' },
    { id: 'model', key: 'tabModels', category: 'model' },
    { id: 'tool', key: 'tabTools', category: 'tool' },
    { id: 'datasource', key: 'tabDatasources', category: 'datasource' },
    { id: 'agent-strategy', key: 'tabAgent', category: 'agent-strategy' },
    { id: 'trigger', key: 'tabTriggers', category: 'trigger' },
    { id: 'extension', key: 'tabExtensions', category: 'extension' },
    { id: 'bundles', key: 'tabBundles', category: '' },
    { id: 'installed', key: 'tabInstalled', category: '' },
];
//# sourceMappingURL=tabs.js.map