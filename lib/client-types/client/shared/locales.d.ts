/**
 * Locale dictionaries. User-facing copy lives here, never in components.
 *
 * @module dsh-dify-marketplace/client/shared/locales
 */
export declare const en: {
    readonly nav: "Dify Marketplace";
    readonly subtitle: "Browse and install Dify plugins. Installation is durable only after the Host reports success.";
    readonly searchPlaceholder: "Search plugins";
    readonly search: "Search";
    readonly tabAll: "All";
    readonly tabModels: "Models";
    readonly tabTools: "Tools";
    readonly tabDatasources: "Data Sources";
    readonly tabTriggers: "Triggers";
    readonly tabAgent: "Agent";
    readonly tabExtensions: "Extensions";
    readonly tabBundles: "Bundles";
    readonly tabInstalled: "Installed";
    readonly collections: "Collections";
    readonly marketplaceUp: "Marketplace reachable";
    readonly marketplaceDown: "Marketplace unreachable";
    readonly daemonUp: "Plugin daemon reachable";
    readonly daemonDown: "Plugin daemon unreachable";
    readonly daemonMissing: "Plugin daemon is not configured";
    readonly install: "Install";
    readonly installing: "Installing…";
    readonly uninstall: "Uninstall";
    readonly uninstalling: "Uninstalling…";
    readonly installed: "Installed";
    readonly upgrade: "Upgrade";
    readonly credentials: "Save credentials";
    readonly credentialsHint: "Credentials are stored on the Host. They never enter this browser bundle as durable state.";
    readonly noResults: "No plugins in this view.";
    readonly emptyBundles: "The marketplace returned no bundles.";
    readonly failed: "Failed";
    readonly pending: "Pending";
    readonly needsCredentials: "Needs credentials";
    readonly active: "Active";
    readonly close: "Close";
    readonly versions: "Versions";
    readonly installCount: "{count} installs";
};
export declare const zh: Record<keyof typeof en, string>;
export declare const NS = "dsh-dify-marketplace";
export type MessageKey = keyof typeof en;
//# sourceMappingURL=locales.d.ts.map