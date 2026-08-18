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
  org: string
  name: string
  version: string
  checksum: string
  /** `<org>/<name>` — stable across versions. */
  pluginId: string
  /** The full `<org>/<name>:<version>@<checksum>` string. */
  uniqueIdentifier: string
}

/** Thrown when a string is not a well-formed plugin unique identifier. */
export class DifyIdentifierError extends Error {
  constructor(value: string, reason: string) {
    super(`invalid Dify plugin unique identifier "${value}": ${reason}`)
    this.name = 'DifyIdentifierError'
  }
}

const IDENTIFIER_PATTERN
  = /^(?<org>[a-z0-9_-]+)\/(?<name>[a-z0-9_-]+):(?<version>[^@\s]+)@(?<checksum>[a-f0-9]{64})$/i

/**
 * Parse a Dify plugin unique identifier.
 * @param value - `<org>/<name>:<version>@<checksum>`.
 * @returns the parsed identity.
 * @throws DifyIdentifierError when the value does not match the daemon's format.
 */
export function parseUniqueIdentifier(value: string): DifyPluginIdentity {
  const match = IDENTIFIER_PATTERN.exec(value.trim())
  const groups = match?.groups
  if (groups === undefined) {
    throw new DifyIdentifierError(value, 'expected <org>/<name>:<version>@<sha256>')
  }
  const { org, name, version, checksum } = groups as {
    org: string
    name: string
    version: string
    checksum: string
  }
  return {
    org,
    name,
    version,
    checksum: checksum.toLowerCase(),
    pluginId: `${org}/${name}`,
    uniqueIdentifier: `${org}/${name}:${version}@${checksum.toLowerCase()}`,
  }
}

/**
 * Split a `<org>/<name>` plugin id.
 * @param pluginId - the version-independent plugin id.
 * @returns its org and name.
 * @throws DifyIdentifierError when the id has no single slash.
 */
export function parsePluginId(pluginId: string): { org: string, name: string } {
  const [org, name, ...rest] = pluginId.trim().split('/')
  if (org === undefined || name === undefined || org === '' || name === '' || rest.length > 0) {
    throw new DifyIdentifierError(pluginId, 'expected <org>/<name>')
  }
  return { org, name }
}

/**
 * The Cordis Loader entry id for one installed Dify plugin.
 *
 * Stable across versions so an upgrade reconciles onto the same row, and
 * namespaced with `dify:` so it cannot collide with a native DSH entry.
 * @param pluginId - `<org>/<name>`.
 * @returns the Loader entry id.
 */
export function loaderEntryId(pluginId: string): string {
  const { org, name } = parsePluginId(pluginId)
  return `dify:${org}/${name}`
}

/** Maximum length the DeepSeek function-name contract allows. */
const MAX_TOOL_NAME_LENGTH = 64

/** Characters a model-facing tool name may contain. */
const TOOL_NAME_ALLOWED = /[^A-Za-z0-9_-]/g

/**
 * A deterministic short digest of the inputs, used only to keep distinct tools
 * from collapsing into one name after normalization or truncation.
 *
 * FNV-1a over the joined inputs: the value never crosses a trust boundary and
 * is not a security primitive, only a collision guard.
 * @param parts - the identity parts being hashed.
 * @returns 12 lowercase hex characters.
 */
function shortDigest(...parts: string[]): string {
  const input = parts.join('\u0000')
  let hashLow = 0x811c9dc5
  let hashHigh = 0x01000193
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    hashLow = Math.imul(hashLow ^ code, 0x01000193) >>> 0
    hashHigh = Math.imul(hashHigh ^ (code + index), 0x85ebca6b) >>> 0
  }
  return (hashLow.toString(16).padStart(8, '0') + hashHigh.toString(16).padStart(8, '0')).slice(0, 12)
}

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
export function toolName(org: string, plugin: string, tool: string): string {
  const raw = `dify__${org}__${plugin}__${tool}`
  const normalized = raw.replace(TOOL_NAME_ALLOWED, '_')
  if (normalized === raw && raw.length <= MAX_TOOL_NAME_LENGTH) return raw
  const digest = shortDigest(org, plugin, tool)
  const budget = MAX_TOOL_NAME_LENGTH - digest.length - 1
  return `${normalized.slice(0, budget)}_${digest}`
}

/**
 * The filesystem-safe basename used for one plugin's Host-owned state.
 * @param pluginId - `<org>/<name>`.
 * @returns a name containing no path separators.
 */
export function stateFileName(pluginId: string): string {
  const { org, name } = parsePluginId(pluginId)
  return `${org}__${name}.json`
}
