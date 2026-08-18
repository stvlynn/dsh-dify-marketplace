/**
 * Install, uninstall, and credential use cases.
 *
 * @module dsh-dify-marketplace/host/application/install
 */
import type { BridgeCredentialsResponse, BridgeInstallResponse, BridgeInstallTaskResponse, BridgeInstalledResponse, BridgeUninstallResponse } from '../../shared/contracts/bridge.ts';
import type { DaemonClient } from '../infrastructure/daemon-client.ts';
import type { MarketplaceClient } from '../infrastructure/marketplace-client.ts';
import type { CredentialVault } from '../infrastructure/credential-vault.ts';
import type { InstalledPluginState, StateStore } from '../infrastructure/state-store.ts';
import type { PluginRegistry } from './registry.ts';
import type { ResolvedConfig } from '../config.ts';
/** Install-flow dependencies. */
export interface InstallDeps {
    marketplace: MarketplaceClient;
    daemon: DaemonClient;
    state: StateStore;
    vault: CredentialVault;
    registry: PluginRegistry;
    config: ResolvedConfig;
}
/** Install, uninstall, and credentials. */
export declare class InstallService {
    private readonly deps;
    constructor(deps: InstallDeps);
    /**
     * Download a package, upload it to the daemon, and start an install task.
     * @param uniqueIdentifier - `<org>/<name>:<version>@<checksum>`.
     */
    install(uniqueIdentifier: string): Promise<BridgeInstallResponse>;
    /**
     * Poll one install task; when it succeeds, persist state and mount the fiber.
     * @param taskId - daemon task id.
     */
    installTask(taskId: string): Promise<BridgeInstallTaskResponse>;
    /** List installed Dify plugins. */
    installed(): Promise<BridgeInstalledResponse>;
    /**
     * Uninstall one plugin: dispose fiber, daemon uninstall, delete secrets, drop state.
     * @param pluginId - `<org>/<name>`.
     */
    uninstall(pluginId: string): Promise<BridgeUninstallResponse>;
    /**
     * Store credentials after the daemon validates them, then remount.
     * @param pluginId - `<org>/<name>`.
     * @param credentials - field values.
     */
    saveCredentials(pluginId: string, credentials: Record<string, string>): Promise<BridgeCredentialsResponse>;
    /** Persist daemon installation + marketplace detail, then mount. */
    private finishInstall;
    private toInstalled;
}
/** Display label used only in Host logs. */
export declare function installLabel(record: InstalledPluginState): string;
//# sourceMappingURL=install.d.ts.map