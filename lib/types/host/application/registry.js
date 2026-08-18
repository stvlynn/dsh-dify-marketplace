/**
 * Child-fiber registry: mount, unmount, boot rehydrate.
 *
 * @module dsh-dify-marketplace/host/application/registry
 */
import { loaderEntryId } from "../../shared/identifier.js";
import { projectedToolNamesFromSnapshot } from "../domain/capability.js";
import { DifyMarketplaceError, asMarketplaceError } from "../domain/errors.js";
import * as runtimeChild from "../../runtime/index.js";
import { bindRuntimeDeps } from "../../runtime/index.js";
/** Dynamic plugin registry. */
export class PluginRegistry {
    ctx;
    mounted = new Map();
    constructor(ctx, deps) {
        this.ctx = ctx;
        bindRuntimeDeps(deps);
    }
    /**
     * Mount one installed plugin as a Cordis child fiber.
     * @param state - durable install record.
     */
    async mount(state) {
        await this.unmount(state.pluginId);
        const config = {
            pluginId: state.pluginId,
            org: state.org,
            name: state.name,
            uniqueIdentifier: state.uniqueIdentifier,
            category: state.category,
            installationId: state.installationId,
            snapshot: state.snapshot,
            ...(state.endpointHookId === undefined ? {} : { endpointHookId: state.endpointHookId }),
        };
        const toolNames = projectedToolNamesFromSnapshot(state.org, state.name, state.category, {
            tools: state.snapshot.tools.map(tool => tool.name),
            strategies: state.snapshot.strategies.map(strategy => strategy.name),
            supportedModelTypes: state.snapshot.supportedModelTypes,
        });
        try {
            const fiber = await this.ctx.plugin(runtimeChild, config);
            this.mounted.set(state.pluginId, {
                fiber,
                state,
                status: state.credentialsStored || state.snapshot.credentialFields.length === 0
                    ? 'active'
                    : 'needs-credentials',
            });
            return this.registrationOf(state.pluginId, toolNames);
        }
        catch (error) {
            const classified = asMarketplaceError(error, 'registration_failed');
            this.mounted.set(state.pluginId, {
                fiber: { dispose: () => undefined },
                state,
                status: 'failed',
                error: classified.toBridgeError(),
            });
            throw classified;
        }
    }
    /**
     * Dispose one child fiber.
     * @param pluginId - `<org>/<name>`.
     */
    async unmount(pluginId) {
        const current = this.mounted.get(pluginId);
        this.mounted.delete(pluginId);
        if (current === undefined)
            return;
        await current.fiber.dispose();
    }
    /**
     * Remount every durable install. A single failure is recorded on that row
     * and does not abort the others.
     * @param states - durable records.
     */
    async rehydrate(states) {
        for (const state of states) {
            try {
                await this.mount(state);
            }
            catch (error) {
                this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
    /**
     * Registration state for the settings UI.
     * @param pluginId - `<org>/<name>`.
     * @param toolNames - names to report when the fiber is active.
     */
    registrationOf(pluginId, toolNames) {
        const current = this.mounted.get(pluginId);
        if (current === undefined) {
            return { entryId: null, status: 'absent', toolNames: [] };
        }
        const names = toolNames ?? projectedToolNamesFromSnapshot(current.state.org, current.state.name, current.state.category, {
            tools: current.state.snapshot.tools.map(tool => tool.name),
            strategies: current.state.snapshot.strategies.map(strategy => strategy.name),
            supportedModelTypes: current.state.snapshot.supportedModelTypes,
        });
        return {
            entryId: loaderEntryId(pluginId),
            status: current.status,
            toolNames: names,
            ...(current.error === undefined ? {} : { error: current.error }),
        };
    }
    /** Mark a mounted plugin as needing credentials, or active once they exist. */
    markCredentials(pluginId, stored) {
        const current = this.mounted.get(pluginId);
        if (current === undefined || current.status === 'failed')
            return;
        current.status = stored ? 'active' : 'needs-credentials';
    }
    /**
     * Dispose every child. Called when the Host plugin unloads.
     */
    async disposeAll() {
        const ids = [...this.mounted.keys()];
        for (const pluginId of ids)
            await this.unmount(pluginId);
    }
}
/** Thrown when a fiber cannot activate. */
export function registrationFailed(pluginId, cause) {
    return asMarketplaceError(cause, 'registration_failed');
}
//# sourceMappingURL=registry.js.map