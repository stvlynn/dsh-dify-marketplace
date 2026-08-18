/**
 * Durable install state.
 *
 * Registration must survive a Harness restart: the daemon keeps its own
 * installation records, but it knows nothing about which DSH tools were
 * registered for them or which category adapter owns each plugin. This store is
 * that missing half, written under the Harness home so it shares the lifetime of
 * the profile that installed the plugins.
 *
 * Writes are atomic (temp file plus rename) and serialized through a promise
 * chain, because an install completing while the settings UI reads the list must
 * never observe a half-written file.
 *
 * @module dsh-dify-marketplace/host/infrastructure/state-store
 */
import type { MarketplacePluginCategory } from '../../shared/contracts/marketplace.ts';
import type { PluginSnapshot } from '../domain/snapshot.ts';
/** Everything the Host must remember about one installed Dify plugin. */
export interface InstalledPluginState {
    pluginId: string;
    org: string;
    name: string;
    uniqueIdentifier: string;
    version: string;
    category: MarketplacePluginCategory;
    /** Daemon installation id, required to uninstall. */
    installationId: string;
    label: Record<string, string>;
    icon: string;
    /** Tool names registered for this plugin at install time. */
    toolNames: string[];
    /** Provider name the daemon dispatches to (tool/model/agent-strategy provider). */
    provider: string;
    /** Whether credentials are stored in the vault for this plugin. */
    credentialsStored: boolean;
    /** ISO timestamp of the install that produced this record. */
    installedAt: string;
    /** Declaration fields adapters need on boot, independent of the marketplace. */
    snapshot: PluginSnapshot;
    /** Daemon endpoint hook id, when an extension plugin has one. */
    endpointHookId?: string;
}
/** The complete persisted document. */
export interface StateDocument {
    /** Schema version, bumped when the shape changes incompatibly. */
    version: 1;
    plugins: InstalledPluginState[];
}
/** Atomic, serialized JSON state for installed Dify plugins. */
export declare class StateStore {
    private readonly filePath;
    private queue;
    private cache;
    /**
     * @param filePath - absolute path of the state file.
     */
    constructor(filePath: string);
    /**
     * Build a store at the conventional location inside the Harness home.
     * @param harnessHome - explicit harness home, otherwise resolved from the environment.
     * @returns the store.
     */
    static inHarnessHome(harnessHome?: string): StateStore;
    /** The absolute state file path. */
    get path(): string;
    /**
     * Read the current document.
     *
     * A missing file is an empty document, not an error: that is the state of a
     * profile that has never installed a Dify plugin.
     * @returns the persisted document.
     */
    read(): Promise<StateDocument>;
    /** Every recorded plugin. */
    list(): Promise<InstalledPluginState[]>;
    /**
     * Look up one plugin.
     * @param pluginId - `<org>/<name>`.
     * @returns the record, or undefined when absent.
     */
    get(pluginId: string): Promise<InstalledPluginState | undefined>;
    /**
     * Insert or replace one record.
     * @param state - the record to persist.
     */
    upsert(state: InstalledPluginState): Promise<void>;
    /**
     * Remove one record.
     * @param pluginId - `<org>/<name>`.
     * @returns true when a record was removed.
     */
    remove(pluginId: string): Promise<boolean>;
    /**
     * Apply a patch to one record.
     * @param pluginId - `<org>/<name>`.
     * @param patch - fields to overwrite.
     * @returns the updated record, or undefined when absent.
     */
    patch(pluginId: string, patch: Partial<InstalledPluginState>): Promise<InstalledPluginState | undefined>;
    /** Serialize one read-modify-write cycle and persist it atomically. */
    private mutate;
}
//# sourceMappingURL=state-store.d.ts.map