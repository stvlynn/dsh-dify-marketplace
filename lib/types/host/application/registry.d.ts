/**
 * Child-fiber registry: mount, unmount, boot rehydrate.
 *
 * @module dsh-dify-marketplace/host/application/registry
 */
import type { Context } from '@deepseek-ai/cordis';
import type { BridgeRegistrationState } from '../../shared/contracts/bridge.ts';
import { DifyMarketplaceError } from '../domain/errors.ts';
import type { InstalledPluginState } from '../infrastructure/state-store.ts';
import type { RuntimeDeps } from '../../runtime/deps.ts';
/** Dynamic plugin registry. */
export declare class PluginRegistry {
    private readonly ctx;
    private readonly mounted;
    constructor(ctx: Context, deps: RuntimeDeps);
    /**
     * Mount one installed plugin as a Cordis child fiber.
     * @param state - durable install record.
     */
    mount(state: InstalledPluginState): Promise<BridgeRegistrationState>;
    /**
     * Dispose one child fiber.
     * @param pluginId - `<org>/<name>`.
     */
    unmount(pluginId: string): Promise<void>;
    /**
     * Remount every durable install. A single failure is recorded on that row
     * and does not abort the others.
     * @param states - durable records.
     */
    rehydrate(states: InstalledPluginState[]): Promise<void>;
    /**
     * Registration state for the settings UI.
     * @param pluginId - `<org>/<name>`.
     * @param toolNames - names to report when the fiber is active.
     */
    registrationOf(pluginId: string, toolNames?: string[]): BridgeRegistrationState;
    /** Mark a mounted plugin as needing credentials, or active once they exist. */
    markCredentials(pluginId: string, stored: boolean): void;
    /**
     * Dispose every child. Called when the Host plugin unloads.
     */
    disposeAll(): Promise<void>;
}
/** Thrown when a fiber cannot activate. */
export declare function registrationFailed(pluginId: string, cause: unknown): DifyMarketplaceError;
//# sourceMappingURL=registry.d.ts.map