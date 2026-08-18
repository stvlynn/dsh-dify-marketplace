/**
 * Install, uninstall, and credential use cases.
 *
 * @module dsh-dify-marketplace/host/application/install
 */
import { parsePluginId, parseUniqueIdentifier } from "../../shared/identifier.js";
import { localized } from "../../shared/localized.js";
import { DifyMarketplaceError } from "../domain/errors.js";
import { snapshotFromDetail } from "../domain/snapshot.js";
const tasks = new Map();
/** Install, uninstall, and credentials. */
export class InstallService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    /**
     * Download a package, upload it to the daemon, and start an install task.
     * @param uniqueIdentifier - `<org>/<name>:<version>@<checksum>`.
     */
    async install(uniqueIdentifier) {
        const identity = parseUniqueIdentifier(uniqueIdentifier);
        const downloaded = await this.deps.marketplace.downloadPackage(uniqueIdentifier);
        const decoded = await this.deps.daemon.uploadPackage(downloaded.bytes, `${identity.name}.difypkg`, this.deps.config.verifySignature);
        const started = await this.deps.daemon.installFromIdentifiers([decoded.unique_identifier], 'marketplace');
        if (started.task_id !== '') {
            tasks.set(started.task_id, { uniqueIdentifier: decoded.unique_identifier, pluginId: identity.pluginId });
        }
        if (started.all_installed) {
            await this.finishInstall(decoded.unique_identifier);
        }
        return {
            uniqueIdentifier: decoded.unique_identifier,
            pluginId: identity.pluginId,
            taskId: started.task_id === '' ? null : started.task_id,
            allInstalled: started.all_installed,
        };
    }
    /**
     * Poll one install task; when it succeeds, persist state and mount the fiber.
     * @param taskId - daemon task id.
     */
    async installTask(taskId) {
        const tracked = tasks.get(taskId);
        const task = await this.deps.daemon.installTask(taskId);
        const messages = task.plugins.map(plugin => ({
            pluginId: plugin.plugin_id,
            status: plugin.status,
            message: plugin.message,
        }));
        if (task.status === 'success' && tracked !== undefined) {
            const state = await this.finishInstall(tracked.uniqueIdentifier);
            return {
                taskId,
                status: 'success',
                messages,
                registration: this.deps.registry.registrationOf(state.pluginId, state.toolNames),
            };
        }
        if (task.status === 'failed') {
            return {
                taskId,
                status: 'failed',
                messages,
                registration: {
                    entryId: null,
                    status: 'failed',
                    toolNames: [],
                    error: { code: 'install_failed', detail: messages.map(item => item.message).join('; ') },
                },
            };
        }
        return {
            taskId,
            status: task.status === 'running' ? 'running' : 'pending',
            messages,
            registration: { entryId: null, status: 'mounting', toolNames: [] },
        };
    }
    /** List installed Dify plugins. */
    async installed() {
        const records = await this.deps.state.list();
        const plugins = [];
        for (const record of records) {
            plugins.push(await this.toInstalled(record));
        }
        return { plugins };
    }
    /**
     * Uninstall one plugin: dispose fiber, daemon uninstall, delete secrets, drop state.
     * @param pluginId - `<org>/<name>`.
     */
    async uninstall(pluginId) {
        const record = await this.deps.state.get(pluginId);
        if (record === undefined) {
            throw new DifyMarketplaceError('plugin_not_installed', `${pluginId} is not installed`);
        }
        await this.deps.registry.unmount(pluginId);
        await this.deps.daemon.uninstall(record.installationId);
        await this.deps.vault.delete(pluginId);
        await this.deps.state.remove(pluginId);
        return { pluginId, removed: true };
    }
    /**
     * Store credentials after the daemon validates them, then remount.
     * @param pluginId - `<org>/<name>`.
     * @param credentials - field values.
     */
    async saveCredentials(pluginId, credentials) {
        const record = await this.deps.state.get(pluginId);
        if (record === undefined) {
            throw new DifyMarketplaceError('plugin_not_installed', `${pluginId} is not installed`);
        }
        try {
            if (record.category === 'model') {
                await this.deps.daemon.validateProviderCredentials(pluginId, record.snapshot.provider, credentials);
            }
            else {
                await this.deps.daemon.validateToolCredentials(pluginId, record.snapshot.provider, credentials);
            }
        }
        catch (error) {
            const classified = error instanceof DifyMarketplaceError
                ? new DifyMarketplaceError('credentials_invalid', error.message, { cause: error })
                : new DifyMarketplaceError('credentials_invalid', String(error), { cause: error });
            return {
                pluginId,
                stored: false,
                validated: false,
                registration: this.deps.registry.registrationOf(pluginId),
                error: classified.toBridgeError(),
            };
        }
        await this.deps.vault.write(pluginId, credentials);
        const updated = await this.deps.state.patch(pluginId, { credentialsStored: true });
        if (updated !== undefined) {
            await this.deps.registry.mount(updated);
            this.deps.registry.markCredentials(pluginId, true);
        }
        return {
            pluginId,
            stored: true,
            validated: true,
            registration: this.deps.registry.registrationOf(pluginId),
        };
    }
    /** Persist daemon installation + marketplace detail, then mount. */
    async finishInstall(uniqueIdentifier) {
        const identity = parseUniqueIdentifier(uniqueIdentifier);
        const detail = await this.deps.marketplace.pluginDetail(identity.org, identity.name);
        const listed = await this.deps.daemon.listAllPlugins();
        const installation = listed.find(plugin => plugin.plugin_unique_identifier === uniqueIdentifier
            || plugin.plugin_id === identity.pluginId);
        if (installation === undefined) {
            throw new DifyMarketplaceError('install_failed', `daemon did not list ${identity.pluginId} after a successful install task`);
        }
        let endpointHookId;
        const snapshot = snapshotFromDetail(detail);
        if (snapshot.endpoint) {
            const setup = await this.deps.daemon.setupEndpoint(uniqueIdentifier, identity.name, {});
            endpointHookId = setup.hook_id ?? setup.id;
        }
        const state = {
            pluginId: identity.pluginId,
            org: identity.org,
            name: identity.name,
            uniqueIdentifier,
            version: identity.version,
            category: detail.category,
            installationId: installation.installation_id !== ''
                ? installation.installation_id
                : installation.id,
            label: Object.fromEntries(Object.entries(detail.label).filter((entry) => typeof entry[1] === 'string')),
            icon: detail.icon,
            toolNames: [],
            provider: snapshot.provider,
            credentialsStored: await this.deps.vault.has(identity.pluginId),
            installedAt: new Date().toISOString(),
            snapshot,
            ...(endpointHookId === undefined ? {} : { endpointHookId }),
        };
        await this.deps.registry.mount(state);
        state.toolNames = this.deps.registry.registrationOf(identity.pluginId).toolNames;
        await this.deps.state.upsert(state);
        void this.deps.marketplace.recordInstallCount(uniqueIdentifier);
        return state;
    }
    async toInstalled(record) {
        let latestVersion = null;
        try {
            const { org, name } = parsePluginId(record.pluginId);
            const versions = await this.deps.marketplace.pluginVersions(org, name, 1);
            latestVersion = versions[0]?.version ?? null;
        }
        catch {
            latestVersion = null;
        }
        return {
            pluginId: record.pluginId,
            org: record.org,
            name: record.name,
            uniqueIdentifier: record.uniqueIdentifier,
            version: record.version,
            category: record.category,
            label: record.label,
            icon: record.icon,
            installationId: record.installationId,
            credentialsStored: record.credentialsStored,
            registration: this.deps.registry.registrationOf(record.pluginId, record.toolNames),
            latestVersion,
        };
    }
}
/** Display label used only in Host logs. */
export function installLabel(record) {
    return localized(record.label) || record.pluginId;
}
//# sourceMappingURL=install.js.map