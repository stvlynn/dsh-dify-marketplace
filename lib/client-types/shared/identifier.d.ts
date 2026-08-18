/**
 * Dify plugin identity parsing and DSH naming rules.
 *
 * Dify identifies a package version as `<org>/<name>:<version>@<checksum>`
 * (`plugin_entities.PluginUniqueIdentifier` in the daemon). Everything DSH-side
 * — Loader entry ids, tool names, credential file names — is derived from that
 * identity here, so the mapping is one implementation shared by both faces.
 *
 * @module dsh-dify-marketplace/shared/identifier
 */
/** The parts of a Dify plugin unique identifier. */
export interface DifyPluginIdentity {
    org: string;
    name: string;
    version: string;
    checksum: string;
    /** `<org>/<name>` — stable across versions. */
    pluginId: string;
    /** The full `<org>/<name>:<version>@<checksum>` string. */
    uniqueIdentifier: string;
}
/** Thrown when a string is not a well-formed plugin unique identifier. */
export declare class DifyIdentifierError extends Error {
    constructor(value: string, reason: string);
}
/**
 * Parse a Dify plugin unique identifier.
 * @param value - `<org>/<name>:<version>@<checksum>`.
 * @returns the parsed identity.
 * @throws DifyIdentifierError when the value does not match the daemon's format.
 */
export declare function parseUniqueIdentifier(value: string): DifyPluginIdentity;
/**
 * Split a `<org>/<name>` plugin id.
 * @param pluginId - the version-independent plugin id.
 * @returns its org and name.
 * @throws DifyIdentifierError when the id has no single slash.
 */
export declare function parsePluginId(pluginId: string): {
    org: string;
    name: string;
};
/**
 * The Cordis Loader entry id for one installed Dify plugin.
 *
 * Stable across versions so an upgrade reconciles onto the same row, and
 * namespaced with `dify:` so it cannot collide with a native DSH entry.
 * @param pluginId - `<org>/<name>`.
 * @returns the Loader entry id.
 */
export declare function loaderEntryId(pluginId: string): string;
/**
 * The model-facing tool name for one Dify tool.
 *
 * Shape is `dify__<org>__<plugin>__<tool>`, the same server-qualified pattern
 * the Harness MCP bridge uses. Names are pure functions of their inputs, so
 * install order and unrelated plugins never rename a tool. When normalization
 * or truncation changes the name, a deterministic digest is appended so two
 * distinct tools cannot collapse into one registration.
 * @param org - plugin organization.
 * @param plugin - plugin name.
 * @param tool - raw Dify tool name.
 * @returns the normalized public tool name.
 */
export declare function toolName(org: string, plugin: string, tool: string): string;
/**
 * The filesystem-safe basename used for one plugin's Host-owned state.
 * @param pluginId - `<org>/<name>`.
 * @returns a name containing no path separators.
 */
export declare function stateFileName(pluginId: string): string;
//# sourceMappingURL=identifier.d.ts.map