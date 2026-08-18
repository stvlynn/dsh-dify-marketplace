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
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
const EMPTY = { version: 1, plugins: [] };
/** Atomic, serialized JSON state for installed Dify plugins. */
export class StateStore {
    filePath;
    queue = Promise.resolve();
    cache;
    /**
     * @param filePath - absolute path of the state file.
     */
    constructor(filePath) {
        this.filePath = filePath;
    }
    /**
     * Build a store at the conventional location inside the Harness home.
     * @param harnessHome - explicit harness home, otherwise resolved from the environment.
     * @returns the store.
     */
    static inHarnessHome(harnessHome) {
        const home = resolveDshHome(harnessHome);
        return new StateStore(join(home, 'storages', 'dify-marketplace', 'installed.json'));
    }
    /** The absolute state file path. */
    get path() {
        return this.filePath;
    }
    /**
     * Read the current document.
     *
     * A missing file is an empty document, not an error: that is the state of a
     * profile that has never installed a Dify plugin.
     * @returns the persisted document.
     */
    async read() {
        if (this.cache !== undefined)
            return this.cache;
        try {
            const text = await readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(text);
            const document = parsed.version === 1 && Array.isArray(parsed.plugins)
                ? parsed
                : { ...EMPTY };
            this.cache = document;
            return document;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.cache = { ...EMPTY };
                return this.cache;
            }
            throw error;
        }
    }
    /** Every recorded plugin. */
    async list() {
        return (await this.read()).plugins;
    }
    /**
     * Look up one plugin.
     * @param pluginId - `<org>/<name>`.
     * @returns the record, or undefined when absent.
     */
    async get(pluginId) {
        return (await this.read()).plugins.find(plugin => plugin.pluginId === pluginId);
    }
    /**
     * Insert or replace one record.
     * @param state - the record to persist.
     */
    async upsert(state) {
        await this.mutate((document) => {
            const others = document.plugins.filter(plugin => plugin.pluginId !== state.pluginId);
            return { version: 1, plugins: [...others, state] };
        });
    }
    /**
     * Remove one record.
     * @param pluginId - `<org>/<name>`.
     * @returns true when a record was removed.
     */
    async remove(pluginId) {
        let removed = false;
        await this.mutate((document) => {
            const remaining = document.plugins.filter(plugin => plugin.pluginId !== pluginId);
            removed = remaining.length !== document.plugins.length;
            return { version: 1, plugins: remaining };
        });
        return removed;
    }
    /**
     * Apply a patch to one record.
     * @param pluginId - `<org>/<name>`.
     * @param patch - fields to overwrite.
     * @returns the updated record, or undefined when absent.
     */
    async patch(pluginId, patch) {
        let updated;
        await this.mutate((document) => {
            const plugins = document.plugins.map((plugin) => {
                if (plugin.pluginId !== pluginId)
                    return plugin;
                updated = { ...plugin, ...patch };
                return updated;
            });
            return { version: 1, plugins };
        });
        return updated;
    }
    /** Serialize one read-modify-write cycle and persist it atomically. */
    async mutate(update) {
        const run = this.queue.then(async () => {
            const current = await this.read();
            const next = update(current);
            await mkdir(dirname(this.filePath), { recursive: true });
            const temp = `${this.filePath}.${process.pid}.tmp`;
            await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
            await rename(temp, this.filePath);
            this.cache = next;
        });
        this.queue = run.catch(() => undefined);
        await run;
    }
}
//# sourceMappingURL=state-store.js.map