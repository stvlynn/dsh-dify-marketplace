/**
 * Credential vault.
 *
 * Dify providers need API keys, and the daemon expects them on every dispatch
 * call rather than storing them itself. That makes this plugin the credential
 * holder, so credentials are kept out of the state document, written with
 * owner-only permissions, and never returned to the browser: the settings UI
 * learns only whether a credential set exists.
 *
 * @module dsh-dify-marketplace/host/infrastructure/credential-vault
 */
/** One plugin's stored credential set. */
export interface StoredCredentials {
    pluginId: string;
    /** Credential type the daemon should apply, when the provider declares one. */
    credentialType?: string;
    values: Record<string, string>;
    updatedAt: string;
}
/** File-backed credential storage, one file per plugin. */
export declare class CredentialVault {
    private readonly directory;
    /**
     * @param directory - absolute directory holding one file per plugin.
     */
    constructor(directory: string);
    /**
     * Build a vault at the conventional location inside the Harness home.
     * @param harnessHome - explicit harness home, otherwise resolved from the environment.
     * @returns the vault.
     */
    static inHarnessHome(harnessHome?: string): CredentialVault;
    /** The absolute vault directory. */
    get path(): string;
    /**
     * Read one plugin's credentials.
     * @param pluginId - `<org>/<name>`.
     * @returns the stored set, or undefined when none is stored.
     */
    read(pluginId: string): Promise<StoredCredentials | undefined>;
    /**
     * Whether credentials exist for one plugin.
     * @param pluginId - `<org>/<name>`.
     * @returns true when a credential set is stored.
     */
    has(pluginId: string): Promise<boolean>;
    /**
     * Store one plugin's credentials, replacing any previous set.
     * @param pluginId - `<org>/<name>`.
     * @param values - credential field values.
     * @param credentialType - credential type declared by the provider, when any.
     */
    write(pluginId: string, values: Record<string, string>, credentialType?: string): Promise<void>;
    /**
     * Delete one plugin's credentials.
     * @param pluginId - `<org>/<name>`.
     */
    delete(pluginId: string): Promise<void>;
    /** Path of one plugin's credential file. */
    private fileFor;
}
//# sourceMappingURL=credential-vault.d.ts.map