import "@deepseek-ai/dsh-host-webserver";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region lib/types/host/config.js
/**
* Host plugin configuration.
*
* @module dsh-dify-marketplace/host/config
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "dsh-dify-marketplace";
const Config = z.object({
	marketplaceBaseUrl: z.string().default("https://marketplace.dify.ai"),
	difyVersion: z.string().default("1.10.0"),
	userAgent: z.string().default("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"),
	daemonBaseUrl: z.string().default("http://127.0.0.1:5002"),
	daemonServerKey: z.string().default(""),
	daemonTenantId: z.string().default("00000000-0000-0000-0000-000000000001"),
	daemonUserId: z.string().default("dsh"),
	innerApiKey: z.string().default(""),
	verifySignature: z.boolean().default(false),
	harnessHome: z.string().default("")
});
/**
* Apply schema defaults without requiring a Config object at the call site.
* @param config - partial plugin config.
*/
function resolveConfig(config = {}) {
	const resolved = Config(config);
	return {
		...resolved,
		...resolved.harnessHome === "" ? { harnessHome: void 0 } : {}
	};
}
/** Whether the daemon is considered configured (a server key is present). */
function daemonConfigured(config) {
	return config.daemonServerKey !== "" && config.daemonBaseUrl !== "";
}
//#endregion
//#region lib/types/shared/identifier.js
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
/** Thrown when a string is not a well-formed plugin unique identifier. */
var DifyIdentifierError = class extends Error {
	constructor(value, reason) {
		super(`invalid Dify plugin unique identifier "${value}": ${reason}`);
		this.name = "DifyIdentifierError";
	}
};
const IDENTIFIER_PATTERN = /^(?<org>[a-z0-9_-]+)\/(?<name>[a-z0-9_-]+):(?<version>[^@\s]+)@(?<checksum>[a-f0-9]{64})$/i;
/**
* Parse a Dify plugin unique identifier.
* @param value - `<org>/<name>:<version>@<checksum>`.
* @returns the parsed identity.
* @throws DifyIdentifierError when the value does not match the daemon's format.
*/
function parseUniqueIdentifier(value) {
	const groups = IDENTIFIER_PATTERN.exec(value.trim())?.groups;
	if (groups === void 0) throw new DifyIdentifierError(value, "expected <org>/<name>:<version>@<sha256>");
	const { org, name, version, checksum } = groups;
	return {
		org,
		name,
		version,
		checksum: checksum.toLowerCase(),
		pluginId: `${org}/${name}`,
		uniqueIdentifier: `${org}/${name}:${version}@${checksum.toLowerCase()}`
	};
}
/**
* Split a `<org>/<name>` plugin id.
* @param pluginId - the version-independent plugin id.
* @returns its org and name.
* @throws DifyIdentifierError when the id has no single slash.
*/
function parsePluginId(pluginId) {
	const [org, name, ...rest] = pluginId.trim().split("/");
	if (org === void 0 || name === void 0 || org === "" || name === "" || rest.length > 0) throw new DifyIdentifierError(pluginId, "expected <org>/<name>");
	return {
		org,
		name
	};
}
/**
* The Cordis Loader entry id for one installed Dify plugin.
*
* Stable across versions so an upgrade reconciles onto the same row, and
* namespaced with `dify:` so it cannot collide with a native DSH entry.
* @param pluginId - `<org>/<name>`.
* @returns the Loader entry id.
*/
function loaderEntryId(pluginId) {
	const { org, name } = parsePluginId(pluginId);
	return `dify:${org}/${name}`;
}
/** Maximum length the DeepSeek function-name contract allows. */
const MAX_TOOL_NAME_LENGTH = 64;
/** Characters a model-facing tool name may contain. */
const TOOL_NAME_ALLOWED = /[^A-Za-z0-9_-]/g;
/**
* A deterministic short digest of the inputs, used only to keep distinct tools
* from collapsing into one name after normalization or truncation.
*
* FNV-1a over the joined inputs: the value never crosses a trust boundary and
* is not a security primitive, only a collision guard.
* @param parts - the identity parts being hashed.
* @returns 12 lowercase hex characters.
*/
function shortDigest(...parts) {
	const input = parts.join("\0");
	let hashLow = 2166136261;
	let hashHigh = 16777619;
	for (let index = 0; index < input.length; index += 1) {
		const code = input.charCodeAt(index);
		hashLow = Math.imul(hashLow ^ code, 16777619) >>> 0;
		hashHigh = Math.imul(hashHigh ^ code + index, 2246822507) >>> 0;
	}
	return (hashLow.toString(16).padStart(8, "0") + hashHigh.toString(16).padStart(8, "0")).slice(0, 12);
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
function toolName(org, plugin, tool) {
	const raw = `dify__${org}__${plugin}__${tool}`;
	const normalized = raw.replace(TOOL_NAME_ALLOWED, "_");
	if (normalized === raw && raw.length <= MAX_TOOL_NAME_LENGTH) return raw;
	const digest = shortDigest(org, plugin, tool);
	const budget = MAX_TOOL_NAME_LENGTH - digest.length - 1;
	return `${normalized.slice(0, budget)}_${digest}`;
}
/**
* The filesystem-safe basename used for one plugin's Host-owned state.
* @param pluginId - `<org>/<name>`.
* @returns a name containing no path separators.
*/
function stateFileName(pluginId) {
	const { org, name } = parsePluginId(pluginId);
	return `${org}__${name}.json`;
}
//#endregion
//#region lib/types/host/domain/capability.js
/**
* Capability model: what a Dify plugin category becomes inside DeepSeek Harness.
*
* Dify and DSH do not share a capability vocabulary, so this module is the
* single place that decides how each Dify category projects onto a DSH surface.
* Both the install flow and the settings UI read their answers from here, which
* is why an unsupported category is a first-class value rather than a thrown
* error at registration time.
*
* @module dsh-dify-marketplace/host/domain/capability
*/
/**
* The complete category mapping this build implements.
*
* `datasource` and `trigger` plugins are installed and invocable through the
* daemon, and are projected as model-facing tools: a datasource becomes browse
* and fetch tools, a trigger becomes subscription management tools. Nothing in
* this table is aspirational — every non-`unsupported` row has an adapter under
* `src/runtime/adapters`.
*/
const CATEGORY_MAPPINGS = [
	{
		category: "tool",
		surface: "tools",
		description: "Each Dify tool is registered as a model-facing DSH tool."
	},
	{
		category: "agent-strategy",
		surface: "tools",
		description: "Each agent strategy is registered as one model-facing DSH tool."
	},
	{
		category: "datasource",
		surface: "tools",
		description: "Datasource browse and fetch operations are registered as model-facing DSH tools."
	},
	{
		category: "trigger",
		surface: "tools",
		description: "Trigger subscription management is registered as model-facing DSH tools."
	},
	{
		category: "model",
		surface: "model-provider",
		description: "Model providers are inspectable and their credentials are validated, and each supported model type is exposed as a model-facing invocation tool."
	},
	{
		category: "extension",
		surface: "http-endpoint",
		description: "Endpoint (extension) plugins are served through the Harness web server under the plugin's own route prefix."
	}
];
/**
* Resolve the mapping for one category.
* @param category - the Dify plugin category.
* @returns its mapping, or an `unsupported` mapping for unknown categories.
*/
function categoryMapping(category) {
	const found = CATEGORY_MAPPINGS.find((mapping) => mapping.category === category);
	if (found !== void 0) return found;
	return {
		category,
		surface: "unsupported",
		description: `Dify category "${category}" has no DeepSeek Harness surface in this build.`
	};
}
/** Categories this build can register. */
function supportedCategories() {
	return CATEGORY_MAPPINGS.filter((mapping) => mapping.surface !== "unsupported").map((mapping) => mapping.category);
}
/**
* The model-facing tool names a plugin would register, derived from its
* marketplace detail record.
*
* Tool and agent-strategy plugins declare their operations in the detail
* payload, so their names are exact. Datasource, trigger, and model plugins
* declare provider files rather than named operations, so their names come from
* the fixed operation set each adapter registers.
* @param detail - the marketplace detail record.
* @returns the tool names, empty for categories that register no tools.
*/
function projectedToolNames(detail) {
	return projectedToolNamesFromSnapshot(detail.org, detail.name, detail.category, {
		tools: "tools" in detail.tool && Array.isArray(detail.tool.tools) ? detail.tool.tools.map((tool) => tool.identity.name) : [],
		strategies: "strategies" in detail.agent_strategy && Array.isArray(detail.agent_strategy.strategies) ? detail.agent_strategy.strategies.map((strategy) => {
			const identity = strategy.identity;
			return typeof identity?.name === "string" ? identity.name : void 0;
		}).filter((value) => value !== void 0) : [],
		supportedModelTypes: "supported_model_types" in detail.model && Array.isArray(detail.model.supported_model_types) ? detail.model.supported_model_types : []
	});
}
/**
* The model-facing tool names a plugin would register, derived from a snapshot.
* @param org - plugin organization.
* @param name - plugin name.
* @param category - Dify category.
* @param projection - declared operations.
*/
function projectedToolNamesFromSnapshot(org, name, category, projection) {
	switch (category) {
		case "tool": return projection.tools.map((tool) => toolName(org, name, tool));
		case "agent-strategy": return projection.strategies.map((strategy) => toolName(org, name, strategy));
		case "datasource": return DATASOURCE_OPERATIONS.map((operation) => toolName(org, name, operation));
		case "trigger": return TRIGGER_OPERATIONS.map((operation) => toolName(org, name, operation));
		case "model": return projection.supportedModelTypes.map((type) => MODEL_TYPE_OPERATIONS[type]).filter((value) => value !== void 0).map((operation) => toolName(org, name, operation));
		default: return [];
	}
}
/** Operations the datasource adapter registers for every datasource plugin. */
const DATASOURCE_OPERATIONS = ["browse", "fetch"];
/** Operations the trigger adapter registers for every trigger plugin. */
const TRIGGER_OPERATIONS = ["subscribe", "unsubscribe"];
/** Dispatchable model types and the operation name each becomes. */
const MODEL_TYPE_OPERATIONS = {
	"llm": "llm",
	"text-embedding": "embed",
	"text_embedding": "embed",
	"rerank": "rerank",
	"tts": "tts",
	"speech2text": "speech2text",
	"moderation": "moderation"
};
//#endregion
//#region lib/types/shared/localized.js
/**
* Pick a display string from a Dify i18n object.
*
* @module dsh-dify-marketplace/shared/localized
*/
/**
* Resolve one localized string, preferring the requested locale then English,
* then Simplified Chinese, then the first remaining value.
* @param map - Dify i18n object, or undefined.
* @param locale - requested locale (`en_US`, `zh_Hans`, or a UI locale).
* @returns the resolved string, empty when the map is empty.
*/
function localized(map, locale = "en_US") {
	if (typeof map === "string") return map;
	if (map === void 0) return "";
	const candidates = [
		locale,
		...{
			en: ["en_US", "en"],
			zh: [
				"zh_Hans",
				"zh_Hant",
				"zh"
			],
			"zh-CN": ["zh_Hans", "zh"],
			"zh-TW": [
				"zh_Hant",
				"zh_Hans",
				"zh"
			]
		}[locale] ?? [],
		"en_US",
		"zh_Hans"
	];
	for (const key of candidates) {
		const value = map[key];
		if (typeof value === "string" && value !== "") return value;
	}
	for (const value of Object.values(map)) if (typeof value === "string" && value !== "") return value;
	return "";
}
//#endregion
//#region lib/types/host/domain/snapshot.js
/**
* Durable declaration snapshot for one installed Dify plugin.
*
* Boot rehydration must not depend on the marketplace still serving the same
* detail document, so the Host stores the fields the adapters need.
*
* @module dsh-dify-marketplace/host/domain/snapshot
*/
/**
* Extract a snapshot from a marketplace detail record.
* @param detail - marketplace plugin document.
* @returns the durable snapshot.
*/
function snapshotFromDetail(detail) {
	const tool = detail.tool;
	const model = detail.model;
	const strategy = detail.agent_strategy;
	const tools = "tools" in tool && Array.isArray(tool.tools) ? tool.tools.map((declared) => ({
		name: declared.identity.name,
		description: declared.description.llm || localized(declared.description.human),
		parameters: declared.parameters ?? []
	})) : [];
	const strategies = "strategies" in strategy && Array.isArray(strategy.strategies) ? strategy.strategies.map((entry) => {
		const record = entry;
		return {
			name: record.identity?.name ?? "strategy",
			description: typeof record.description === "object" && record.description !== null && "llm" in record.description && typeof record.description.llm === "string" ? record.description.llm : localized(record.identity?.label),
			parameters: record.parameters ?? []
		};
	}) : [];
	const credentialFields = "credentials_schema" in tool && Array.isArray(tool.credentials_schema) ? tool.credentials_schema : [];
	return {
		provider: "identity" in tool && tool.identity?.name !== void 0 ? tool.identity.name : "provider" in model && typeof model.provider === "string" ? model.provider : "identity" in strategy && strategy.identity?.name !== void 0 ? strategy.identity.name : detail.name,
		credentialFields,
		tools,
		strategies,
		supportedModelTypes: "supported_model_types" in model && Array.isArray(model.supported_model_types) ? model.supported_model_types : [],
		endpoint: "endpoints" in detail.endpoint && Array.isArray(detail.endpoint.endpoints) && detail.endpoint.endpoints.length > 0
	};
}
/**
* Credential fields a model plugin declares, if any.
* @param detail - marketplace plugin document.
*/
function modelCredentialFields(detail) {
	const forms = ("provider_credential_schema" in detail.model ? detail.model.provider_credential_schema : null)?.credential_form_schemas;
	if (!Array.isArray(forms)) return [];
	return forms;
}
//#endregion
//#region lib/types/host/application/catalog.js
/**
* Catalog use cases: search, collections, detail, versions, icon.
*
* @module dsh-dify-marketplace/host/application/catalog
*/
/** Marketplace catalog operations. */
var CatalogService = class {
	deps;
	constructor(deps) {
		this.deps = deps;
	}
	/**
	* Search plugins or bundles and annotate with local install state.
	* @param request - search request from the bridge.
	*/
	async search(request) {
		const page = Math.max(1, request.page);
		const pageSize = Math.min(40, Math.max(1, request.pageSize));
		const body = {
			page,
			page_size: pageSize,
			query: request.query,
			...request.category === "" ? {} : { category: request.category },
			...request.tags === void 0 ? {} : { tags: request.tags },
			...request.sortBy === void 0 ? {} : { sort_by: request.sortBy },
			...request.sortOrder === void 0 ? {} : { sort_order: request.sortOrder }
		};
		if (request.kind === "bundles") {
			const data = await this.deps.marketplace.searchBundles(body);
			return {
				plugins: await this.annotate(data.bundles),
				total: data.total,
				page,
				pageSize
			};
		}
		const data = await this.deps.marketplace.searchPlugins(body);
		return {
			plugins: await this.annotate(data.plugins),
			total: data.total,
			page,
			pageSize
		};
	}
	/**
	* List curated collections and the plugins inside each.
	*/
	async collections() {
		const data = await this.deps.marketplace.collections();
		const collections = [];
		for (const collection of data.collections) {
			const plugins = await this.deps.marketplace.collectionPlugins(collection.name);
			collections.push({
				collection,
				plugins: await this.annotate(plugins)
			});
		}
		return { collections };
	}
	/**
	* Full detail, versions, credential schema, and registration preview.
	* @param pluginId - `<org>/<name>`.
	*/
	async detail(pluginId) {
		const { org, name } = parsePluginId(pluginId);
		const plugin = await this.deps.marketplace.pluginDetail(org, name);
		const versions = await this.deps.marketplace.pluginVersions(org, name);
		const installed = await this.deps.state.get(pluginId);
		const snapshot = snapshotFromDetail(plugin);
		const credentialFields = snapshot.credentialFields.length > 0 ? snapshot.credentialFields : modelCredentialFields(plugin);
		return {
			plugin,
			versions,
			installedVersion: installed?.version ?? null,
			credentialFields,
			credentialsStored: installed !== void 0 && await this.deps.vault.has(pluginId),
			registration: preview(plugin.category, projectedToolNames(plugin), categoryMapping(plugin.category).description)
		};
	}
	/**
	* Proxy one plugin icon.
	* @param pluginId - `<org>/<name>`.
	*/
	async icon(pluginId) {
		const { org, name } = parsePluginId(pluginId);
		return this.deps.marketplace.pluginIcon(org, name);
	}
	/** Annotate marketplace records with local install facts. */
	async annotate(plugins) {
		const installed = await this.deps.state.list();
		const byId = new Map(installed.map((plugin) => [plugin.pluginId, plugin]));
		return plugins.map((plugin) => {
			const local = byId.get(plugin.plugin_id);
			return {
				plugin,
				installedVersion: local?.version ?? null,
				upgradable: local !== void 0 && local.version !== plugin.latest_version
			};
		});
	}
};
/** Build a registration preview. */
function preview(category, toolNames, surface) {
	return {
		category,
		supported: categoryMapping(category).surface !== "unsupported",
		toolNames,
		surface
	};
}
//#endregion
//#region lib/types/host/domain/errors.js
/**
* Failure taxonomy. Every outward-facing failure in this plugin is one
* {@link DifyMarketplaceError} carrying a {@link BridgeErrorCode}, so the Web UI
* and the model-facing tools present the same classification and neither has to
* pattern-match on message text.
*
* @module dsh-dify-marketplace/host/domain/errors
*/
/** A classified failure with an operator-facing detail string. */
var DifyMarketplaceError = class extends Error {
	code;
	/** HTTP status the bridge answers with. */
	status;
	constructor(code, detail, options = {}) {
		super(detail, options.cause === void 0 ? {} : { cause: options.cause });
		this.name = "DifyMarketplaceError";
		this.code = code;
		this.status = options.status ?? defaultStatus(code);
	}
	/** Project onto the wire shape the bridge returns. */
	toBridgeError() {
		return {
			code: this.code,
			detail: this.message
		};
	}
};
/** Map a code onto the HTTP status the bridge answers with. */
function defaultStatus(code) {
	switch (code) {
		case "bad_request": return 400;
		case "credentials_invalid": return 400;
		case "plugin_not_installed": return 404;
		case "capability_unsupported": return 501;
		case "daemon_unconfigured": return 503;
		case "daemon_unavailable":
		case "marketplace_unavailable": return 502;
		default: return 500;
	}
}
/**
* Coerce an unknown thrown value into a classified error.
* @param error - the caught value.
* @param fallback - code to use when the value carries no classification.
* @returns a classified error.
*/
function asMarketplaceError(error, fallback) {
	if (error instanceof DifyMarketplaceError) return error;
	return new DifyMarketplaceError(fallback, error instanceof Error ? error.message : String(error), { cause: error });
}
//#endregion
//#region lib/types/host/application/install.js
/**
* Install, uninstall, and credential use cases.
*
* @module dsh-dify-marketplace/host/application/install
*/
const tasks = /* @__PURE__ */ new Map();
/** Install, uninstall, and credentials. */
var InstallService = class {
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
		const started = await this.deps.daemon.installFromIdentifiers([decoded.unique_identifier], "marketplace");
		if (started.task_id !== "") tasks.set(started.task_id, {
			uniqueIdentifier: decoded.unique_identifier,
			pluginId: identity.pluginId
		});
		if (started.all_installed) await this.finishInstall(decoded.unique_identifier);
		return {
			uniqueIdentifier: decoded.unique_identifier,
			pluginId: identity.pluginId,
			taskId: started.task_id === "" ? null : started.task_id,
			allInstalled: started.all_installed
		};
	}
	/**
	* Poll one install task; when it succeeds, persist state and mount the fiber.
	* @param taskId - daemon task id.
	*/
	async installTask(taskId) {
		const tracked = tasks.get(taskId);
		const task = await this.deps.daemon.installTask(taskId);
		const messages = task.plugins.map((plugin) => ({
			pluginId: plugin.plugin_id,
			status: plugin.status,
			message: plugin.message
		}));
		if (task.status === "success" && tracked !== void 0) {
			const state = await this.finishInstall(tracked.uniqueIdentifier);
			return {
				taskId,
				status: "success",
				messages,
				registration: this.deps.registry.registrationOf(state.pluginId, state.toolNames)
			};
		}
		if (task.status === "failed") return {
			taskId,
			status: "failed",
			messages,
			registration: {
				entryId: null,
				status: "failed",
				toolNames: [],
				error: {
					code: "install_failed",
					detail: messages.map((item) => item.message).join("; ")
				}
			}
		};
		return {
			taskId,
			status: task.status === "running" ? "running" : "pending",
			messages,
			registration: {
				entryId: null,
				status: "mounting",
				toolNames: []
			}
		};
	}
	/** List installed Dify plugins. */
	async installed() {
		const records = await this.deps.state.list();
		const plugins = [];
		for (const record of records) plugins.push(await this.toInstalled(record));
		return { plugins };
	}
	/**
	* Uninstall one plugin: dispose fiber, daemon uninstall, delete secrets, drop state.
	* @param pluginId - `<org>/<name>`.
	*/
	async uninstall(pluginId) {
		const record = await this.deps.state.get(pluginId);
		if (record === void 0) throw new DifyMarketplaceError("plugin_not_installed", `${pluginId} is not installed`);
		await this.deps.registry.unmount(pluginId);
		await this.deps.daemon.uninstall(record.installationId);
		await this.deps.vault.delete(pluginId);
		await this.deps.state.remove(pluginId);
		return {
			pluginId,
			removed: true
		};
	}
	/**
	* Store credentials after the daemon validates them, then remount.
	* @param pluginId - `<org>/<name>`.
	* @param credentials - field values.
	*/
	async saveCredentials(pluginId, credentials) {
		const record = await this.deps.state.get(pluginId);
		if (record === void 0) throw new DifyMarketplaceError("plugin_not_installed", `${pluginId} is not installed`);
		try {
			if (record.category === "model") await this.deps.daemon.validateProviderCredentials(pluginId, record.snapshot.provider, credentials);
			else await this.deps.daemon.validateToolCredentials(pluginId, record.snapshot.provider, credentials);
		} catch (error) {
			const classified = error instanceof DifyMarketplaceError ? new DifyMarketplaceError("credentials_invalid", error.message, { cause: error }) : new DifyMarketplaceError("credentials_invalid", String(error), { cause: error });
			return {
				pluginId,
				stored: false,
				validated: false,
				registration: this.deps.registry.registrationOf(pluginId),
				error: classified.toBridgeError()
			};
		}
		await this.deps.vault.write(pluginId, credentials);
		const updated = await this.deps.state.patch(pluginId, { credentialsStored: true });
		if (updated !== void 0) {
			await this.deps.registry.mount(updated);
			this.deps.registry.markCredentials(pluginId, true);
		}
		return {
			pluginId,
			stored: true,
			validated: true,
			registration: this.deps.registry.registrationOf(pluginId)
		};
	}
	/** Persist daemon installation + marketplace detail, then mount. */
	async finishInstall(uniqueIdentifier) {
		const identity = parseUniqueIdentifier(uniqueIdentifier);
		const detail = await this.deps.marketplace.pluginDetail(identity.org, identity.name);
		const installation = (await this.deps.daemon.listAllPlugins()).find((plugin) => plugin.plugin_unique_identifier === uniqueIdentifier || plugin.plugin_id === identity.pluginId);
		if (installation === void 0) throw new DifyMarketplaceError("install_failed", `daemon did not list ${identity.pluginId} after a successful install task`);
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
			installationId: installation.installation_id !== "" ? installation.installation_id : installation.id,
			label: Object.fromEntries(Object.entries(detail.label).filter((entry) => typeof entry[1] === "string")),
			icon: detail.icon,
			toolNames: [],
			provider: snapshot.provider,
			credentialsStored: await this.deps.vault.has(identity.pluginId),
			installedAt: (/* @__PURE__ */ new Date()).toISOString(),
			snapshot,
			...endpointHookId === void 0 ? {} : { endpointHookId }
		};
		await this.deps.registry.mount(state);
		state.toolNames = this.deps.registry.registrationOf(identity.pluginId).toolNames;
		await this.deps.state.upsert(state);
		this.deps.marketplace.recordInstallCount(uniqueIdentifier);
		return state;
	}
	async toInstalled(record) {
		let latestVersion = null;
		try {
			const { org, name } = parsePluginId(record.pluginId);
			latestVersion = (await this.deps.marketplace.pluginVersions(org, name, 1))[0]?.version ?? null;
		} catch {
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
			latestVersion
		};
	}
};
//#endregion
//#region lib/types/runtime/define-dify-tool.js
/**
* Shared `defineTool` wrapper for Dify-backed operations.
*
* @module dsh-dify-marketplace/runtime/define-dify-tool
*/
/**
* Define a tool whose canonical value is a JSON object and whose model-facing
* content is a text dump of that object.
* @param options - name, parameters, and execute.
*/
function defineDifyTool(options) {
	return defineTool({
		name: options.name,
		description: options.description,
		parameters: options.parameters,
		timeoutMs: options.timeoutMs ?? 12e4,
		output: {
			schema: {
				type: "object",
				additionalProperties: true
			},
			render(_args, value) {
				return [{
					type: "text",
					text: JSON.stringify(value, null, 2)
				}];
			}
		},
		async execute(args, exec) {
			const value = await options.execute(args, exec.signal);
			return JSON.parse(JSON.stringify(value !== null && typeof value === "object" && !Array.isArray(value) ? value : { result: value }));
		}
	});
}
/**
* Drain a daemon dispatch stream into one JSON value.
* @param chunks - async iterable of daemon payloads.
*/
async function collectChunks(chunks) {
	const collected = [];
	for await (const chunk of chunks) collected.push(chunk);
	return { chunks: collected };
}
//#endregion
//#region lib/types/runtime/parameters.js
/**
* Map Dify tool parameters onto the `defineTool` parameter schema.
*
* @module dsh-dify-marketplace/runtime/parameters
*/
/**
* Convert one plugin's tool parameters into a DSH parameter schema.
*
* Only `form: llm` parameters (or parameters with no form) are model-facing.
* User-form fields belong in the Host credential vault, not in the tool schema.
* @param parameters - Dify tool parameters.
*/
function mapToolParameters(parameters) {
	const schema = {};
	for (const parameter of parameters) {
		if (parameter.form !== void 0 && parameter.form !== "llm") continue;
		const spec = mapType(parameter);
		spec.description = parameter.llm_description || localized(parameter.human_description) || localized(parameter.label);
		if (parameter.required === true) schema[parameter.name] = {
			...spec,
			required: true
		};
		else schema[parameter.name] = spec;
	}
	if (Object.keys(schema).length === 0) schema.input = {
		type: "json",
		description: "Arguments for this Dify tool, as a JSON object.",
		required: true
	};
	return schema;
}
/** Map one Dify parameter type onto a DSH value schema. */
function mapType(parameter) {
	switch (parameter.type) {
		case "number": return { type: "number" };
		case "integer": return { type: "integer" };
		case "boolean":
		case "checkbox": return { type: "boolean" };
		case "array":
		case "files": return {
			type: "array",
			items: { type: "string" }
		};
		case "object": return {
			type: "object",
			additionalProperties: true
		};
		case "select": {
			const values = (parameter.options ?? []).map((option) => option.value).filter((value) => typeof value === "string");
			return values.length > 0 ? {
				type: "string",
				enum: values
			} : { type: "string" };
		}
		default: return { type: "string" };
	}
}
//#endregion
//#region lib/types/runtime/adapters/agent-strategy.js
/**
* Register each agent strategy as one model-facing DSH tool.
*
* @module dsh-dify-marketplace/runtime/adapters/agent-strategy
*/
/** Agent-strategy adapter. */
const registerAgentStrategyAdapter = (ctx, config, deps) => {
	const names = [];
	for (const strategy of config.snapshot.strategies) {
		const publicName = toolName(config.org, config.name, strategy.name);
		const definition = defineDifyTool({
			name: publicName,
			description: strategy.description || `Dify agent strategy ${strategy.name}`,
			parameters: mapToolParameters(strategy.parameters),
			async execute(args, signal) {
				return collectChunks(deps.daemon.dispatchStream("agentStrategyInvoke", config.pluginId, {
					agent_strategy_provider: config.snapshot.provider,
					agent_strategy: strategy.name,
					agent_strategy_params: args
				}, signal));
			}
		});
		ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
		names.push(publicName);
	}
	return names;
};
//#endregion
//#region lib/types/runtime/adapters/datasource.js
/**
* Datasource plugins become browse and fetch tools.
*
* @module dsh-dify-marketplace/runtime/adapters/datasource
*/
/** Datasource adapter. */
const registerDatasourceAdapter = (ctx, config, deps) => {
	const names = [];
	for (const operation of DATASOURCE_OPERATIONS) {
		const publicName = toolName(config.org, config.name, operation);
		const route = operation === "browse" ? "datasourceOnlineDriveBrowseFiles" : "datasourceOnlineDocumentPageContent";
		const definition = defineDifyTool({
			name: publicName,
			description: operation === "browse" ? `Browse files exposed by Dify datasource ${config.pluginId}.` : `Fetch a page or file from Dify datasource ${config.pluginId}.`,
			parameters: { query: {
				type: "json",
				description: "Datasource operation payload.",
				required: true
			} },
			async execute(args, signal) {
				const stored = await deps.vault.read(config.pluginId);
				const payload = {
					provider: config.snapshot.provider,
					credentials: stored?.values ?? {},
					...typeof args.query === "object" && args.query !== null ? args.query : {}
				};
				return collectChunks(deps.daemon.dispatchStream(route, config.pluginId, payload, signal));
			}
		});
		ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
		names.push(publicName);
	}
	return names;
};
//#endregion
//#region lib/types/runtime/adapters/endpoint.js
/**
* Extension (endpoint) plugins are served through the Harness web server.
*
* The daemon exposes plugin HTTP at `/e/:hook_id/*`. This adapter registers a
* prefix under `/dify-marketplace/e/<org>/<name>` and forwards.
*
* @module dsh-dify-marketplace/runtime/adapters/endpoint
*/
/** Endpoint adapter. */
const registerEndpointAdapter = (ctx, config, deps) => {
	const hookId = config.endpointHookId;
	if (hookId === void 0 || hookId === "") throw new DifyMarketplaceError("registration_failed", `extension plugin ${config.pluginId} has no daemon endpoint hook; setup the endpoint before mounting`);
	const prefix = `/dify-marketplace/e/${config.org}/${config.name}`;
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: prefix,
		handler: (req, res) => {
			proxy(req, res, deps, hookId, prefix);
		}
	}), `dify-endpoint:${config.pluginId}`);
	return [];
};
/** Forward one request to the daemon endpoint hook. */
async function proxy(req, res, deps, hookId, prefix) {
	const url = new URL(req.url ?? "/", "http://dsh.local");
	const rest = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.from(chunk));
	const body = chunks.length === 0 ? void 0 : new Uint8Array(Buffer.concat(chunks));
	const headers = {};
	for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers[key] = value;
	try {
		const upstream = await deps.daemon.proxyEndpoint(hookId, rest + url.search, {
			method: req.method ?? "GET",
			headers,
			body
		});
		res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
		const bytes = new Uint8Array(await upstream.arrayBuffer());
		res.end(Buffer.from(bytes));
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		res.writeHead(502, { "content-type": "application/json" });
		res.end(JSON.stringify({
			code: "daemon_unavailable",
			detail
		}));
	}
}
//#endregion
//#region lib/types/runtime/adapters/model.js
/**
* Model plugins become one invocation tool per supported model type.
*
* There is no `settings.models` slot to occupy on rc.7. Credentials live in
* this plugin's own vault; invocation goes through daemon dispatch.
*
* @module dsh-dify-marketplace/runtime/adapters/model
*/
const ROUTE_BY_OPERATION = {
	llm: "llmInvoke",
	embed: "textEmbeddingInvoke",
	rerank: "rerankInvoke",
	tts: "ttsInvoke",
	speech2text: "speech2textInvoke",
	moderation: "moderationInvoke"
};
/** Model-provider adapter. */
const registerModelAdapter = (ctx, config, deps) => {
	const names = [];
	for (const type of config.snapshot.supportedModelTypes) {
		const operation = MODEL_TYPE_OPERATIONS[type];
		if (operation === void 0) continue;
		const route = ROUTE_BY_OPERATION[operation];
		if (route === void 0) continue;
		const publicName = toolName(config.org, config.name, operation);
		const definition = defineDifyTool({
			name: publicName,
			description: `Invoke Dify ${type} model from ${config.pluginId}.`,
			parameters: {
				model: {
					type: "string",
					description: "Model name declared by the provider.",
					required: true
				},
				input: {
					type: "json",
					description: "Provider-specific invocation payload.",
					required: true
				}
			},
			async execute(args, signal) {
				const stored = await deps.vault.read(config.pluginId);
				const payload = {
					provider: config.snapshot.provider,
					model: args.model,
					model_type: type,
					credentials: stored?.values ?? {},
					...typeof args.input === "object" && args.input !== null ? args.input : {}
				};
				if (operation === "llm" || operation === "tts") return collectChunks(deps.daemon.dispatchStream(route, config.pluginId, payload, signal));
				return deps.daemon.dispatch(route, config.pluginId, payload, signal);
			}
		});
		ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
		names.push(publicName);
	}
	return names;
};
//#endregion
//#region lib/types/runtime/adapters/tool.js
/**
* Register each Dify tool as a model-facing DSH tool.
*
* @module dsh-dify-marketplace/runtime/adapters/tool
*/
/** Tool-category adapter. */
const registerToolAdapter = (ctx, config, deps) => {
	const names = [];
	for (const tool of config.snapshot.tools) {
		const publicName = toolName(config.org, config.name, tool.name);
		const definition = defineDifyTool({
			name: publicName,
			description: tool.description,
			parameters: mapToolParameters(tool.parameters),
			async execute(args, signal) {
				const stored = await deps.vault.read(config.pluginId);
				return collectChunks(deps.daemon.dispatchStream("toolInvoke", config.pluginId, {
					provider: config.snapshot.provider,
					tool: tool.name,
					tool_parameters: args,
					credentials: stored?.values ?? {},
					...stored?.credentialType === void 0 ? {} : { credential_type: stored.credentialType }
				}, signal));
			}
		});
		ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
		names.push(publicName);
	}
	return names;
};
//#endregion
//#region lib/types/runtime/adapters/trigger.js
/**
* Trigger plugins become subscribe and unsubscribe tools.
*
* @module dsh-dify-marketplace/runtime/adapters/trigger
*/
/** Trigger adapter. */
const registerTriggerAdapter = (ctx, config, deps) => {
	const names = [];
	for (const operation of TRIGGER_OPERATIONS) {
		const publicName = toolName(config.org, config.name, operation);
		const route = operation === "subscribe" ? "triggerSubscribe" : "triggerUnsubscribe";
		const definition = defineDifyTool({
			name: publicName,
			description: operation === "subscribe" ? `Subscribe to events from Dify trigger ${config.pluginId}.` : `Unsubscribe a Dify trigger subscription for ${config.pluginId}.`,
			parameters: {
				parameters: {
					type: "json",
					description: "Trigger parameters declared by the plugin."
				},
				endpoint: {
					type: "string",
					description: "Callback URL the trigger should invoke."
				}
			},
			async execute(args, signal) {
				const stored = await deps.vault.read(config.pluginId);
				return deps.daemon.dispatch(route, config.pluginId, {
					provider: config.snapshot.provider,
					trigger: config.name,
					credentials: stored?.values ?? {},
					parameters: args.parameters ?? {},
					endpoint: args.endpoint
				}, signal);
			}
		});
		ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
		names.push(publicName);
	}
	return names;
};
//#endregion
//#region lib/types/runtime/index.js
var runtime_exports = /* @__PURE__ */ __exportAll({
	apply: () => apply$1,
	bindRuntimeDeps: () => bindRuntimeDeps,
	inject: () => inject$1,
	name: () => name$1
});
/** Cordis plugin name. The Loader row id is `dify:<org>/<name>`, set by the registry. */
const name$1 = "dify-plugin-runtime";
/** Tools always. webServer is required so extension plugins can register routes. */
const inject$1 = ["tools", "webServer"];
const ADAPTERS = {
	tool: registerToolAdapter,
	"agent-strategy": registerAgentStrategyAdapter,
	datasource: registerDatasourceAdapter,
	trigger: registerTriggerAdapter,
	model: registerModelAdapter,
	extension: registerEndpointAdapter
};
let sharedDeps;
/**
* Bind Host-owned daemon/vault handles the child fibers read during `apply`.
* Called once from the Host plugin before any child is mounted.
* @param deps - daemon client and credential vault.
*/
function bindRuntimeDeps(deps) {
	sharedDeps = deps;
}
/**
* Register the adapter for this plugin's category.
* @param ctx - child fiber context.
* @param config - identity, snapshot, and daemon ids.
*/
async function apply$1(ctx, config) {
	const mapping = categoryMapping(config.category);
	const adapter = ADAPTERS[config.category];
	if (adapter === void 0 || mapping.surface === "unsupported") throw new DifyMarketplaceError("capability_unsupported", `no adapter for Dify category "${config.category}"`);
	const deps = sharedDeps;
	if (deps === void 0) throw new DifyMarketplaceError("registration_failed", `runtime child for ${config.pluginId} mounted before Host runtime dependencies were bound`);
	await adapter(ctx, config, deps);
}
//#endregion
//#region lib/types/host/application/registry.js
/**
* Child-fiber registry: mount, unmount, boot rehydrate.
*
* @module dsh-dify-marketplace/host/application/registry
*/
/** Dynamic plugin registry. */
var PluginRegistry = class {
	ctx;
	mounted = /* @__PURE__ */ new Map();
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
			...state.endpointHookId === void 0 ? {} : { endpointHookId: state.endpointHookId }
		};
		const toolNames = projectedToolNamesFromSnapshot(state.org, state.name, state.category, {
			tools: state.snapshot.tools.map((tool) => tool.name),
			strategies: state.snapshot.strategies.map((strategy) => strategy.name),
			supportedModelTypes: state.snapshot.supportedModelTypes
		});
		try {
			const fiber = await this.ctx.plugin(runtime_exports, config);
			this.mounted.set(state.pluginId, {
				fiber,
				state,
				status: state.credentialsStored || state.snapshot.credentialFields.length === 0 ? "active" : "needs-credentials"
			});
			return this.registrationOf(state.pluginId, toolNames);
		} catch (error) {
			const classified = asMarketplaceError(error, "registration_failed");
			this.mounted.set(state.pluginId, {
				fiber: { dispose: () => void 0 },
				state,
				status: "failed",
				error: classified.toBridgeError()
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
		if (current === void 0) return;
		await current.fiber.dispose();
	}
	/**
	* Remount every durable install. A single failure is recorded on that row
	* and does not abort the others.
	* @param states - durable records.
	*/
	async rehydrate(states) {
		for (const state of states) try {
			await this.mount(state);
		} catch (error) {
			this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error)));
		}
	}
	/**
	* Registration state for the settings UI.
	* @param pluginId - `<org>/<name>`.
	* @param toolNames - names to report when the fiber is active.
	*/
	registrationOf(pluginId, toolNames) {
		const current = this.mounted.get(pluginId);
		if (current === void 0) return {
			entryId: null,
			status: "absent",
			toolNames: []
		};
		const names = toolNames ?? projectedToolNamesFromSnapshot(current.state.org, current.state.name, current.state.category, {
			tools: current.state.snapshot.tools.map((tool) => tool.name),
			strategies: current.state.snapshot.strategies.map((strategy) => strategy.name),
			supportedModelTypes: current.state.snapshot.supportedModelTypes
		});
		return {
			entryId: loaderEntryId(pluginId),
			status: current.status,
			toolNames: names,
			...current.error === void 0 ? {} : { error: current.error }
		};
	}
	/** Mark a mounted plugin as needing credentials, or active once they exist. */
	markCredentials(pluginId, stored) {
		const current = this.mounted.get(pluginId);
		if (current === void 0 || current.status === "failed") return;
		current.status = stored ? "active" : "needs-credentials";
	}
	/**
	* Dispose every child. Called when the Host plugin unloads.
	*/
	async disposeAll() {
		const ids = [...this.mounted.keys()];
		for (const pluginId of ids) await this.unmount(pluginId);
	}
};
//#endregion
//#region lib/types/host/infrastructure/credential-vault.js
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
/** File-backed credential storage, one file per plugin. */
var CredentialVault = class CredentialVault {
	directory;
	/**
	* @param directory - absolute directory holding one file per plugin.
	*/
	constructor(directory) {
		this.directory = directory;
	}
	/**
	* Build a vault at the conventional location inside the Harness home.
	* @param harnessHome - explicit harness home, otherwise resolved from the environment.
	* @returns the vault.
	*/
	static inHarnessHome(harnessHome) {
		const home = resolveDshHome(harnessHome);
		return new CredentialVault(join(home, "storages", "dify-marketplace", "credentials"));
	}
	/** The absolute vault directory. */
	get path() {
		return this.directory;
	}
	/**
	* Read one plugin's credentials.
	* @param pluginId - `<org>/<name>`.
	* @returns the stored set, or undefined when none is stored.
	*/
	async read(pluginId) {
		try {
			const text = await readFile(this.fileFor(pluginId), "utf8");
			return JSON.parse(text);
		} catch (error) {
			if (error.code === "ENOENT") return void 0;
			throw error;
		}
	}
	/**
	* Whether credentials exist for one plugin.
	* @param pluginId - `<org>/<name>`.
	* @returns true when a credential set is stored.
	*/
	async has(pluginId) {
		return await this.read(pluginId) !== void 0;
	}
	/**
	* Store one plugin's credentials, replacing any previous set.
	* @param pluginId - `<org>/<name>`.
	* @param values - credential field values.
	* @param credentialType - credential type declared by the provider, when any.
	*/
	async write(pluginId, values, credentialType) {
		const record = {
			pluginId,
			...credentialType === void 0 ? {} : { credentialType },
			values,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await mkdir(this.directory, {
			recursive: true,
			mode: 448
		});
		await chmod(this.directory, 448).catch(() => void 0);
		const target = this.fileFor(pluginId);
		const temp = `${target}.${process.pid}.tmp`;
		await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { mode: 384 });
		await rename(temp, target);
	}
	/**
	* Delete one plugin's credentials.
	* @param pluginId - `<org>/<name>`.
	*/
	async delete(pluginId) {
		await rm(this.fileFor(pluginId), { force: true });
	}
	/** Path of one plugin's credential file. */
	fileFor(pluginId) {
		return join(this.directory, stateFileName(pluginId));
	}
};
//#endregion
//#region lib/types/shared/contracts/daemon.js
/**
* dify-plugin-daemon wire contract.
*
* Transcribed from `langgenius/dify-plugin-daemon` at commit
* 1508955a48912488a3d1ef1d79b36a2fcc2bd2bd:
*
* - route table: `internal/server/http_server.go`,
*   `internal/server/http_server.gen.go`
* - envelope: `pkg/entities/response.go`
* - dispatch payload: `pkg/entities/plugin_entities/request.go`
* - install task: `internal/types/models/task.go`
*
* Cross-checked against the Dify API's own daemon client,
* `langgenius/dify` at `api/core/plugin/impl/plugin.py`.
*
* @module dsh-dify-marketplace/shared/contracts/daemon
*/
/** Header carrying the daemon server key; required on every management and dispatch route. */
const DAEMON_API_KEY_HEADER = "X-Api-Key";
/** Header selecting the installed plugin a dispatch request targets. */
const DAEMON_PLUGIN_ID_HEADER = "X-Plugin-ID";
/** Daemon management routes, relative to `/plugin/{tenantId}/management`. */
const DAEMON_MANAGEMENT_ROUTES = {
	uploadPackage: "install/upload/package",
	uploadBundle: "install/upload/bundle",
	installIdentifiers: "install/identifiers",
	upgrade: "install/upgrade",
	tasks: "install/tasks",
	decodeFromIdentifier: "decode/from_identifier",
	fetchManifest: "fetch/manifest",
	fetchIdentifier: "fetch/identifier",
	fetchReadme: "fetch/readme",
	uninstall: "uninstall",
	list: "list",
	installationIds: "installation/ids",
	tools: "tools",
	models: "models",
	triggers: "triggers",
	datasources: "datasources",
	agentStrategies: "agent_strategies"
};
/** Daemon dispatch routes, relative to `/plugin/{tenantId}/dispatch`. */
const DAEMON_DISPATCH_ROUTES = {
	toolInvoke: "tool/invoke",
	toolValidateCredentials: "tool/validate_credentials",
	toolRuntimeParameters: "tool/get_runtime_parameters",
	llmInvoke: "llm/invoke",
	llmNumTokens: "llm/num_tokens",
	textEmbeddingInvoke: "text_embedding/invoke",
	rerankInvoke: "rerank/invoke",
	ttsInvoke: "tts/invoke",
	speech2textInvoke: "speech2text/invoke",
	moderationInvoke: "moderation/invoke",
	validateProviderCredentials: "model/validate_provider_credentials",
	validateModelCredentials: "model/validate_model_credentials",
	modelSchema: "model/schema",
	agentStrategyInvoke: "agent_strategy/invoke",
	datasourceValidateCredentials: "datasource/validate_credentials",
	datasourceWebsiteCrawl: "datasource/get_website_crawl",
	datasourceOnlineDocumentPages: "datasource/get_online_document_pages",
	datasourceOnlineDocumentPageContent: "datasource/get_online_document_page_content",
	datasourceOnlineDriveBrowseFiles: "datasource/online_drive_browse_files",
	datasourceOnlineDriveDownloadFile: "datasource/online_drive_download_file",
	triggerInvokeEvent: "trigger/invoke_event",
	triggerValidateCredentials: "trigger/validate_credentials",
	triggerDispatchEvent: "trigger/dispatch_event",
	triggerSubscribe: "trigger/subscribe",
	triggerUnsubscribe: "trigger/unsubscribe",
	triggerRefresh: "trigger/refresh"
};
//#endregion
//#region lib/types/host/infrastructure/http.js
/**
* Shared HTTP helpers for the two outbound clients.
*
* Both the marketplace and the daemon are remote systems that fail in ordinary
* ways — timeouts, transient 5xx, connection resets — so retry and deadline
* policy lives here once instead of in each call site.
*
* @module dsh-dify-marketplace/host/infrastructure/http
*/
/** Default policy: one retry pair, short backoff, 30s per attempt. */
const DEFAULT_POLICY = {
	timeoutMs: 3e4,
	retries: 2,
	backoffMs: 400
};
/** Statuses worth retrying: transient server and rate-limit responses. */
const RETRYABLE_STATUS = /* @__PURE__ */ new Set([
	408,
	425,
	429,
	500,
	502,
	503,
	504
]);
/**
* Perform one HTTP request with deadline and bounded retry.
*
* A non-retryable status is returned to the caller rather than thrown, because
* both clients need the body of a 4xx to classify it.
* @param url - absolute request URL.
* @param options - fetch options plus policy and failure classification.
* @returns the response of the first attempt that is not retryable.
* @throws DifyMarketplaceError when every attempt fails to produce a response.
*/
async function requestWithRetry(url, options) {
	const policy = {
		...DEFAULT_POLICY,
		...options.policy
	};
	const { policy: _policy, failureCode, signal: callerSignal, ...init } = options;
	let lastError;
	for (let attempt = 0; attempt <= policy.retries; attempt += 1) {
		if (callerSignal?.aborted === true) throw new DifyMarketplaceError(failureCode, `request to ${url} was cancelled`);
		const timeout = AbortSignal.timeout(policy.timeoutMs);
		const signal = callerSignal === void 0 ? timeout : AbortSignal.any([callerSignal, timeout]);
		try {
			const response = await fetch(url, {
				...init,
				signal
			});
			if (!RETRYABLE_STATUS.has(response.status) || attempt === policy.retries) return response;
			lastError = /* @__PURE__ */ new Error(`HTTP ${response.status}`);
			await response.arrayBuffer().catch(() => void 0);
		} catch (error) {
			lastError = error;
			if (attempt === policy.retries) break;
		}
		await delay(policy.backoffMs * 2 ** attempt);
	}
	const detail = lastError instanceof Error ? lastError.message : String(lastError);
	throw new DifyMarketplaceError(failureCode, `request to ${url} failed after ${policy.retries + 1} attempts: ${detail}`, { cause: lastError });
}
/**
* Read a JSON body, classifying a malformed payload as a client failure rather
* than letting a `SyntaxError` escape.
* @param response - the response to read.
* @param failureCode - code used when the body is not JSON.
* @returns the parsed body.
*/
async function readJson(response, failureCode) {
	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch (error) {
		const preview = text.slice(0, 200);
		throw new DifyMarketplaceError(failureCode, `expected JSON from ${response.url}, received: ${preview}`, { cause: error });
	}
}
/** Sleep, used only for retry backoff. */
function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
//#endregion
//#region lib/types/host/infrastructure/daemon-client.js
/**
* dify-plugin-daemon client.
*
* Dify plugins are sandboxed processes with their own runtime, credentials, and
* backwards-invocation protocol; reimplementing that lifecycle would be a
* re-implementation of Dify itself. This client therefore drives the official
* daemon, exactly as the Dify API server does
* (`langgenius/dify`, `api/core/plugin/impl/*.py`).
*
* Two daemon behaviours are easy to get wrong and are handled here:
*
* - The daemon answers HTTP 200 for application-level failures and signals them
*   through the envelope's `code` field, so status alone is never trusted.
* - Management routes are tenant-scoped by path and dispatch routes additionally
*   select the plugin with the `X-Plugin-ID` header, not with the body.
*
* @module dsh-dify-marketplace/host/infrastructure/daemon-client
*/
/** Client for the daemon's management and dispatch surfaces. */
var DaemonClient = class {
	config;
	constructor(config) {
		this.config = config;
	}
	/** The configured daemon origin. */
	get baseUrl() {
		return this.config.baseUrl;
	}
	/** The tenant this client installs into. */
	get tenantId() {
		return this.config.tenantId;
	}
	/**
	* Verify the daemon is reachable and the server key is accepted.
	*
	* `management/list` is the cheapest authenticated route, so a success here
	* proves connectivity and authorization together.
	* @param signal - caller cancellation.
	* @returns true when the daemon answered successfully.
	*/
	async health(signal) {
		if ((await requestWithRetry(`${this.config.baseUrl}/health/check`, {
			method: "GET",
			headers: {
				Accept: "application/json",
				["X-Api-Key"]: this.config.serverKey
			},
			signal,
			failureCode: "daemon_unavailable",
			policy: {
				timeoutMs: 5e3,
				retries: 1
			}
		})).ok) return true;
		await this.listPlugins(1, 1, signal);
		return true;
	}
	/**
	* Upload and decode a `.difypkg`, producing the unique identifier the install
	* step consumes.
	* @param bytes - the package bytes.
	* @param fileName - name recorded in the multipart part.
	* @param verifySignature - require a valid Dify signature.
	* @param signal - caller cancellation.
	* @returns the decoded identifier, manifest, and verification result.
	*/
	async uploadPackage(bytes, fileName, verifySignature, signal) {
		const form = new FormData();
		form.append("dify_pkg", new Blob([bytes.slice()], { type: "application/zip" }), fileName);
		form.append("verify_signature", verifySignature ? "true" : "false");
		return this.management(DAEMON_MANAGEMENT_ROUTES.uploadPackage, {
			method: "POST",
			form,
			signal,
			timeoutMs: 3e5
		});
	}
	/**
	* Install decoded packages into the tenant.
	* @param uniqueIdentifiers - decoded package identifiers.
	* @param source - installation provenance recorded by the daemon.
	* @param signal - caller cancellation.
	* @returns the task to poll, plus whether everything was already installed.
	*/
	async installFromIdentifiers(uniqueIdentifiers, source, signal) {
		return this.management(DAEMON_MANAGEMENT_ROUTES.installIdentifiers, {
			method: "POST",
			json: {
				plugin_unique_identifiers: uniqueIdentifiers,
				source,
				metas: uniqueIdentifiers.map(() => ({}))
			},
			signal
		});
	}
	/**
	* Fetch one installation task.
	* @param taskId - task id returned by {@link installFromIdentifiers}.
	* @param signal - caller cancellation.
	* @returns the task with per-plugin progress.
	*/
	async installTask(taskId, signal) {
		return this.management(`${DAEMON_MANAGEMENT_ROUTES.tasks}/${encodeURIComponent(taskId)}`, {
			method: "GET",
			signal
		});
	}
	/**
	* Poll one installation task until it settles.
	* @param taskId - task id to poll.
	* @param options - poll interval and overall deadline.
	* @param signal - caller cancellation.
	* @returns the settled task.
	* @throws DifyMarketplaceError when the deadline passes first.
	*/
	async awaitInstallTask(taskId, options = {}, signal) {
		const intervalMs = options.intervalMs ?? 1e3;
		const deadlineMs = options.deadlineMs ?? 6e5;
		const started = Date.now();
		for (;;) {
			const task = await this.installTask(taskId, signal);
			if (task.status === "success" || task.status === "failed") return task;
			if (Date.now() - started > deadlineMs) throw new DifyMarketplaceError("install_failed", `install task ${taskId} did not settle within ${deadlineMs}ms (last status: ${task.status})`);
			await new Promise((resolve) => {
				setTimeout(resolve, intervalMs);
			});
		}
	}
	/**
	* List installed plugins.
	* @param page - one-based page number.
	* @param pageSize - page size.
	* @param signal - caller cancellation.
	* @returns the page of installed plugins.
	*/
	async listPlugins(page = 1, pageSize = 100, signal) {
		return this.management(`${DAEMON_MANAGEMENT_ROUTES.list}?page=${page}&page_size=${pageSize}`, {
			method: "GET",
			signal
		});
	}
	/**
	* List every installed plugin, following pagination to the end.
	* @param signal - caller cancellation.
	* @returns every installed plugin in the tenant.
	*/
	async listAllPlugins(signal) {
		const pageSize = 100;
		const all = [];
		for (let page = 1;; page += 1) {
			const response = await this.listPlugins(page, pageSize, signal);
			all.push(...response.list);
			if (response.list.length < pageSize || all.length >= response.total) return all;
		}
	}
	/**
	* Validate tool-provider credentials against the installed plugin.
	* @param pluginId - `<org>/<name>`.
	* @param provider - tool provider name.
	* @param credentials - field values.
	* @param signal - caller cancellation.
	*/
	async validateToolCredentials(pluginId, provider, credentials, signal) {
		await this.dispatch("toolValidateCredentials", pluginId, {
			provider,
			credentials
		}, signal);
		return true;
	}
	/**
	* Validate model-provider credentials against the installed plugin.
	* @param pluginId - `<org>/<name>`.
	* @param provider - model provider name.
	* @param credentials - field values.
	* @param signal - caller cancellation.
	*/
	async validateProviderCredentials(pluginId, provider, credentials, signal) {
		await this.dispatch("validateProviderCredentials", pluginId, {
			provider,
			credentials
		}, signal);
		return true;
	}
	/**
	* Allocate a daemon HTTP endpoint for an extension plugin.
	* @param uniqueIdentifier - installed package identifier.
	* @param name - endpoint display name.
	* @param settings - endpoint settings declared by the plugin.
	* @param signal - caller cancellation.
	* @returns the daemon's endpoint record.
	*/
	async setupEndpoint(uniqueIdentifier, name, settings, signal) {
		return this.tenantPost("endpoint/setup", {
			plugin_unique_identifier: uniqueIdentifier,
			name,
			settings,
			user_id: this.config.userId
		}, signal);
	}
	/**
	* List HTTP endpoints belonging to one plugin.
	* @param pluginId - `<org>/<name>`.
	* @param signal - caller cancellation.
	*/
	async listPluginEndpoints(pluginId, signal) {
		const query = `?plugin_id=${encodeURIComponent(pluginId)}`;
		return this.tenantGet(`endpoint/list/plugin${query}`, signal);
	}
	/**
	* Proxy one request to a daemon endpoint hook.
	* @param hookId - daemon hook id.
	* @param restPath - remainder after `/e/:hook_id`.
	* @param init - method, headers, and body.
	* @param signal - caller cancellation.
	*/
	async proxyEndpoint(hookId, restPath, init, signal) {
		const suffix = restPath.startsWith("/") ? restPath : `/${restPath}`;
		return requestWithRetry(`${this.config.baseUrl}/e/${encodeURIComponent(hookId)}${suffix}`, {
			method: init.method,
			headers: {
				...init.headers,
				[DAEMON_API_KEY_HEADER]: this.config.serverKey
			},
			...init.body === void 0 ? {} : { body: new Blob([init.body.slice()]) },
			signal,
			failureCode: "daemon_unavailable",
			policy: {
				timeoutMs: this.config.timeoutMs,
				retries: 0
			}
		});
	}
	/**
	* Uninstall one installation.
	* @param installationId - daemon installation id, not the plugin id.
	* @param signal - caller cancellation.
	* @returns true when the daemon reported success.
	*/
	async uninstall(installationId, signal) {
		return await this.management(DAEMON_MANAGEMENT_ROUTES.uninstall, {
			method: "POST",
			json: { plugin_installation_id: installationId },
			signal
		}) === true;
	}
	/**
	* Fetch one plugin's README.
	* @param uniqueIdentifier - the installed package identifier.
	* @param language - Dify locale code.
	* @param signal - caller cancellation.
	* @returns the README text.
	*/
	async fetchReadme(uniqueIdentifier, language, signal) {
		const query = `?plugin_unique_identifier=${encodeURIComponent(uniqueIdentifier)}&language=${encodeURIComponent(language)}`;
		return this.management(`${DAEMON_MANAGEMENT_ROUTES.fetchReadme}${query}`, {
			method: "GET",
			signal
		});
	}
	/**
	* Invoke one dispatch route against one installed plugin.
	*
	* Dispatch responses are newline-delimited JSON streams for streaming
	* operations and a single envelope otherwise; {@link dispatchStream} handles
	* the streaming form.
	* @param route - dispatch route key.
	* @param pluginId - `<org>/<name>`, sent as `X-Plugin-ID`.
	* @param data - route payload.
	* @param signal - caller cancellation.
	* @returns the unwrapped response payload.
	*/
	async dispatch(route, pluginId, data, signal) {
		const text = await (await this.dispatchRaw(route, pluginId, data, signal)).text();
		return this.unwrapText(text, DAEMON_DISPATCH_ROUTES[route]);
	}
	/**
	* Invoke one dispatch route and yield its streamed chunks.
	*
	* The daemon writes one JSON envelope per line; a chunk whose `code` is
	* non-zero terminates the stream with a classified failure.
	* @param route - dispatch route key.
	* @param pluginId - `<org>/<name>`, sent as `X-Plugin-ID`.
	* @param data - route payload.
	* @param signal - caller cancellation.
	* @yields each chunk's payload.
	*/
	async *dispatchStream(route, pluginId, data, signal) {
		const body = (await this.dispatchRaw(route, pluginId, data, signal)).body;
		if (body === null) throw new DifyMarketplaceError("daemon_rejected", `dispatch ${route} returned no body`);
		const decoder = new TextDecoder();
		let buffered = "";
		for await (const chunk of body) {
			buffered += decoder.decode(chunk, { stream: true });
			let newline = buffered.indexOf("\n");
			while (newline !== -1) {
				const line = buffered.slice(0, newline).trim();
				buffered = buffered.slice(newline + 1);
				if (line !== "") yield this.unwrapText(line, DAEMON_DISPATCH_ROUTES[route]);
				newline = buffered.indexOf("\n");
			}
		}
		const tail = buffered.trim();
		if (tail !== "") yield this.unwrapText(tail, DAEMON_DISPATCH_ROUTES[route]);
	}
	/** Issue one dispatch request without reading its body. */
	async dispatchRaw(route, pluginId, data, signal) {
		const payload = {
			user_id: this.config.userId,
			plugin_id: pluginId,
			data
		};
		const response = await requestWithRetry(`${this.config.baseUrl}/plugin/${encodeURIComponent(this.config.tenantId)}/dispatch/${DAEMON_DISPATCH_ROUTES[route]}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept": "text/event-stream, application/json",
				[DAEMON_API_KEY_HEADER]: this.config.serverKey,
				[DAEMON_PLUGIN_ID_HEADER]: pluginId
			},
			body: JSON.stringify(payload),
			signal,
			failureCode: "daemon_unavailable",
			policy: {
				timeoutMs: this.config.timeoutMs,
				retries: 0
			}
		});
		if (response.status === 404) throw new DifyMarketplaceError("plugin_not_installed", `daemon has no installation of ${pluginId} in tenant ${this.config.tenantId}`);
		if (response.status === 401) throw new DifyMarketplaceError("daemon_rejected", "daemon rejected the configured server key");
		return response;
	}
	/** POST one tenant-scoped JSON route outside `/management`. */
	async tenantPost(route, json, signal) {
		return this.tenantRequest(route, {
			method: "POST",
			json,
			signal
		});
	}
	/** GET one tenant-scoped JSON route outside `/management`. */
	async tenantGet(route, signal) {
		return this.tenantRequest(route, {
			method: "GET",
			signal
		});
	}
	/** Issue one tenant-scoped request and unwrap its envelope. */
	async tenantRequest(route, options) {
		const url = `${this.config.baseUrl}/plugin/${encodeURIComponent(this.config.tenantId)}/${route}`;
		const headers = {
			Accept: "application/json",
			[DAEMON_API_KEY_HEADER]: this.config.serverKey
		};
		if (options.json !== void 0) headers["Content-Type"] = "application/json";
		const response = await requestWithRetry(url, {
			method: options.method,
			headers,
			...options.json !== void 0 ? { body: JSON.stringify(options.json) } : {},
			signal: options.signal,
			failureCode: "daemon_unavailable",
			policy: {
				timeoutMs: this.config.timeoutMs,
				retries: options.method === "GET" ? 2 : 0
			}
		});
		if (response.status === 401) throw new DifyMarketplaceError("daemon_rejected", "daemon rejected the configured server key");
		const envelope = await readJson(response, "daemon_rejected");
		if (envelope.code !== 0) throw new DifyMarketplaceError("daemon_rejected", `daemon answered code ${envelope.code} for ${route}: ${envelope.message}`);
		return envelope.data;
	}
	/** Issue one management request and unwrap its envelope. */
	async management(route, options) {
		const url = `${this.config.baseUrl}/plugin/${encodeURIComponent(this.config.tenantId)}/management/${route}`;
		const headers = {
			Accept: "application/json",
			[DAEMON_API_KEY_HEADER]: this.config.serverKey
		};
		if (options.json !== void 0) headers["Content-Type"] = "application/json";
		const response = await requestWithRetry(url, {
			method: options.method,
			headers,
			...options.json !== void 0 ? { body: JSON.stringify(options.json) } : {},
			...options.form !== void 0 ? { body: options.form } : {},
			signal: options.signal,
			failureCode: "daemon_unavailable",
			policy: {
				timeoutMs: options.timeoutMs ?? this.config.timeoutMs,
				retries: options.method === "GET" ? 2 : 0
			}
		});
		if (response.status === 401) throw new DifyMarketplaceError("daemon_rejected", "daemon rejected the configured server key");
		const envelope = await readJson(response, "daemon_rejected");
		if (envelope.code !== 0) throw new DifyMarketplaceError("daemon_rejected", `daemon answered code ${envelope.code} for ${route}: ${envelope.message}`);
		return envelope.data;
	}
	/** Parse one envelope line and unwrap it. */
	unwrapText(text, route) {
		let envelope;
		try {
			envelope = JSON.parse(text);
		} catch (error) {
			throw new DifyMarketplaceError("daemon_rejected", `expected a JSON envelope from ${route}, received: ${text.slice(0, 200)}`, { cause: error });
		}
		if (envelope.code !== 0) throw new DifyMarketplaceError("daemon_rejected", `daemon answered code ${envelope.code} for ${route}: ${envelope.message}`);
		return envelope.data;
	}
};
//#endregion
//#region lib/types/host/infrastructure/marketplace-client.js
/**
* Dify Marketplace HTTP client.
*
* Two request details are load-bearing and were established by capture rather
* than by documentation (see `fixtures/marketplace/` and
* `docs/specs/marketplace-api.md`):
*
* - The marketplace sits behind Cloudflare and answers requests that carry no
*   browser-shaped `User-Agent` with 403, so every request sends one.
* - `X-Dify-Version` is echoed by Dify's own clients and gates version-scoped
*   responses, so it is sent on every request as well.
*
* @module dsh-dify-marketplace/host/infrastructure/marketplace-client
*/
/** Read-only access to the public Dify Marketplace API. */
var MarketplaceClient = class {
	config;
	constructor(config) {
		this.config = config;
	}
	/** The configured marketplace origin. */
	get baseUrl() {
		return this.config.baseUrl;
	}
	/**
	* Probe reachability with the cheapest real call available.
	* @param signal - caller cancellation.
	* @returns true when the marketplace answered a well-formed response.
	*/
	async ping(signal) {
		return (await this.request("/api/v1/collections?page=1&page_size=1", {
			method: "GET",
			signal
		})).ok;
	}
	/**
	* Search plugins.
	* @param request - page, query, and filters.
	* @param signal - caller cancellation.
	* @returns the page of results and the unfiltered total.
	*/
	async searchPlugins(request, signal) {
		return this.postJson("/api/v1/plugins/search/advanced", request, signal);
	}
	/**
	* Search bundles. Bundles are plugin sets and share the plugin record shape.
	* @param request - page, query, and filters.
	* @param signal - caller cancellation.
	* @returns the page of bundles and the unfiltered total.
	*/
	async searchBundles(request, signal) {
		return this.postJson("/api/v1/bundles/search/advanced", request, signal);
	}
	/**
	* List curated collections.
	* @param signal - caller cancellation.
	* @returns every collection, highest priority first.
	*/
	async collections(signal) {
		const data = await this.getJson("/api/v1/collections?page=1&page_size=100", signal);
		return {
			collections: [...data.collections].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0)),
			total: data.total
		};
	}
	/**
	* List the plugins of one collection.
	* @param name - collection name, as returned by {@link collections}.
	* @param signal - caller cancellation.
	* @returns the collection's plugins.
	*/
	async collectionPlugins(name, signal) {
		const path = `/api/v1/collections/${encodeURIComponent(name)}/plugins`;
		return (await this.postJson(path, {}, signal)).plugins;
	}
	/**
	* Fetch one plugin's full record.
	* @param org - plugin organization.
	* @param name - plugin name.
	* @param signal - caller cancellation.
	* @returns the detail record.
	*/
	async pluginDetail(org, name, signal) {
		const path = `/api/v1/plugins/${encodeURIComponent(org)}/${encodeURIComponent(name)}`;
		return (await this.getJson(path, signal)).plugin;
	}
	/**
	* List one plugin's published versions, newest first.
	* @param org - plugin organization.
	* @param name - plugin name.
	* @param pageSize - how many versions to request.
	* @param signal - caller cancellation.
	* @returns the versions page.
	*/
	async pluginVersions(org, name, pageSize = 20, signal) {
		const path = `/api/v1/plugins/${encodeURIComponent(org)}/${encodeURIComponent(name)}/versions?page=1&page_size=${pageSize}`;
		return (await this.getJson(path, signal)).versions;
	}
	/**
	* Fetch manifests for many plugins in one call, used to annotate installed
	* plugins with their latest published version.
	* @param pluginIds - `<org>/<name>` ids.
	* @param signal - caller cancellation.
	* @returns the detail records the marketplace knows.
	*/
	async batchManifests(pluginIds, signal) {
		if (pluginIds.length === 0) return [];
		return (await this.postJson("/api/v1/plugins/batch", { plugin_ids: pluginIds }, signal)).plugins;
	}
	/**
	* Fetch one plugin's icon bytes, proxied to the browser by the bridge so the
	* Web face never issues a cross-origin marketplace request.
	* @param org - plugin organization.
	* @param name - plugin name.
	* @param signal - caller cancellation.
	* @returns the icon bytes and its content type.
	*/
	async pluginIcon(org, name, signal) {
		const path = `/api/v1/plugins/${encodeURIComponent(org)}/${encodeURIComponent(name)}/icon`;
		const response = await this.request(path, {
			method: "GET",
			signal
		});
		if (!response.ok) throw new DifyMarketplaceError("marketplace_rejected", `icon request failed with HTTP ${response.status}`);
		return {
			bytes: new Uint8Array(await response.arrayBuffer()),
			contentType: response.headers.get("content-type") ?? "application/octet-stream"
		};
	}
	/**
	* Download one plugin package.
	*
	* The download endpoint answers 302 with a presigned object-storage URL;
	* `fetch` follows it by default, so the package bytes arrive from this one
	* call. The response is validated as a ZIP container before it is handed to
	* the daemon, so a Cloudflare challenge page cannot be mistaken for a package.
	* @param uniqueIdentifier - `<org>/<name>:<version>@<checksum>`.
	* @param signal - caller cancellation.
	* @returns the package bytes.
	*/
	async downloadPackage(uniqueIdentifier, signal) {
		const path = `/api/v1/plugins/download-url?unique_identifier=${encodeURIComponent(uniqueIdentifier)}`;
		const response = await this.request(path, {
			method: "GET",
			signal,
			policy: { timeoutMs: 18e4 }
		});
		if (!response.ok) throw new DifyMarketplaceError("package_download_failed", `download of ${uniqueIdentifier} failed with HTTP ${response.status}`);
		const bytes = new Uint8Array(await response.arrayBuffer());
		assertZipContainer(bytes, uniqueIdentifier);
		return {
			uniqueIdentifier,
			bytes,
			contentType: response.headers.get("content-type") ?? "application/zip"
		};
	}
	/**
	* Best-effort install-count ping. A failure here must not fail the install:
	* the marketplace treats this as analytics, not as part of the install contract.
	* @param uniqueIdentifier - the installed package identifier.
	* @param signal - caller cancellation.
	* @returns true when the marketplace accepted the event.
	*/
	async recordInstallCount(uniqueIdentifier, signal) {
		try {
			await this.postJson("/api/v1/stats/plugins/install_count", { unique_identifier: uniqueIdentifier }, signal);
			return true;
		} catch {
			return false;
		}
	}
	/** Issue one request with the header set the marketplace requires. */
	async request(path, options) {
		const headers = {
			"Accept": options.body === void 0 ? "*/*" : "application/json",
			"User-Agent": this.config.userAgent,
			"X-Dify-Version": this.config.difyVersion
		};
		if (options.body !== void 0) headers["Content-Type"] = "application/json";
		return requestWithRetry(`${this.config.baseUrl}${path}`, {
			method: options.method,
			headers,
			...options.body === void 0 ? {} : { body: options.body },
			signal: options.signal,
			failureCode: "marketplace_unavailable",
			policy: { timeoutMs: options.policy?.timeoutMs ?? this.config.timeoutMs }
		});
	}
	/** GET one JSON endpoint and unwrap its envelope. */
	async getJson(path, signal) {
		const response = await this.request(path, {
			method: "GET",
			signal
		});
		return this.unwrap(response, path);
	}
	/** POST one JSON endpoint and unwrap its envelope. */
	async postJson(path, body, signal) {
		const response = await this.request(path, {
			method: "POST",
			body: JSON.stringify(body),
			signal
		});
		return this.unwrap(response, path);
	}
	/** Validate the HTTP status and the envelope's own `code` field. */
	async unwrap(response, path) {
		if (!response.ok) {
			const preview = (await response.text()).slice(0, 200);
			throw new DifyMarketplaceError("marketplace_rejected", `marketplace answered HTTP ${response.status} for ${path}: ${preview}`);
		}
		const envelope = await readJson(response, "marketplace_rejected");
		if (envelope.code !== 0) throw new DifyMarketplaceError("marketplace_rejected", `marketplace answered code ${envelope.code} for ${path}: ${envelope.msg}`);
		return envelope.data;
	}
};
/**
* Reject a downloaded body that is not a ZIP container.
*
* A `.difypkg` is a ZIP archive. Without this check, an HTML error page or a
* bot-protection challenge would be uploaded to the daemon and surface as an
* opaque decode failure far from its cause.
* @param bytes - the downloaded body.
* @param uniqueIdentifier - identifier used in the failure message.
*/
function assertZipContainer(bytes, uniqueIdentifier) {
	if (bytes.length > 4 && bytes[0] === 80 && bytes[1] === 75 && (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7)) return;
	throw new DifyMarketplaceError("package_download_failed", `download of ${uniqueIdentifier} returned ${bytes.length} bytes that are not a ZIP package`);
}
//#endregion
//#region lib/types/host/infrastructure/state-store.js
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
const EMPTY = {
	version: 1,
	plugins: []
};
/** Atomic, serialized JSON state for installed Dify plugins. */
var StateStore = class StateStore {
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
		return new StateStore(join(home, "storages", "dify-marketplace", "installed.json"));
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
		if (this.cache !== void 0) return this.cache;
		try {
			const text = await readFile(this.filePath, "utf8");
			const parsed = JSON.parse(text);
			const document = parsed.version === 1 && Array.isArray(parsed.plugins) ? parsed : { ...EMPTY };
			this.cache = document;
			return document;
		} catch (error) {
			if (error.code === "ENOENT") {
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
		return (await this.read()).plugins.find((plugin) => plugin.pluginId === pluginId);
	}
	/**
	* Insert or replace one record.
	* @param state - the record to persist.
	*/
	async upsert(state) {
		await this.mutate((document) => {
			return {
				version: 1,
				plugins: [...document.plugins.filter((plugin) => plugin.pluginId !== state.pluginId), state]
			};
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
			const remaining = document.plugins.filter((plugin) => plugin.pluginId !== pluginId);
			removed = remaining.length !== document.plugins.length;
			return {
				version: 1,
				plugins: remaining
			};
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
			return {
				version: 1,
				plugins: document.plugins.map((plugin) => {
					if (plugin.pluginId !== pluginId) return plugin;
					updated = {
						...plugin,
						...patch
					};
					return updated;
				})
			};
		});
		return updated;
	}
	/** Serialize one read-modify-write cycle and persist it atomically. */
	async mutate(update) {
		const run = this.queue.then(async () => {
			const next = update(await this.read());
			await mkdir(dirname(this.filePath), { recursive: true });
			const temp = `${this.filePath}.${process.pid}.tmp`;
			await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 384 });
			await rename(temp, this.filePath);
			this.cache = next;
		});
		this.queue = run.catch(() => void 0);
		await run;
	}
};
//#endregion
//#region lib/types/host/interfaces/http.js
/**
* Small HTTP helpers for Host `webServer` handlers.
*
* @module dsh-dify-marketplace/host/interfaces/http
*/
/**
* Read the full request body as JSON.
* @param req - incoming request.
*/
async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.from(chunk));
	if (chunks.length === 0) return {};
	const text = Buffer.concat(chunks).toString("utf8");
	if (text.trim() === "") return {};
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new DifyMarketplaceError("bad_request", "request body is not JSON", { cause: error });
	}
}
/**
* Read a query parameter.
* @param req - incoming request.
* @param name - parameter name.
*/
function queryParam(req, name) {
	const value = new URL(req.url ?? "/", "http://dsh.local").searchParams.get(name);
	return value === null ? void 0 : value;
}
/** Write a JSON response. */
function sendJson(res, status, body) {
	const payload = `${JSON.stringify(body)}\n`;
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(payload);
}
/** Write a classified error. */
function sendError(res, error, fallback) {
	const classified = asMarketplaceError(error, fallback);
	sendJson(res, classified.status, classified.toBridgeError());
}
/**
* Wrap an async handler so rejections become classified JSON.
* @param fallback - error code when the thrown value is unclassified.
* @param handler - async work.
*/
function handle(fallback, handler) {
	return (req, res) => {
		handler(req, res).catch((error) => {
			if (res.headersSent) {
				res.destroy();
				return;
			}
			sendError(res, error, fallback);
		});
	};
}
/** Require a string field on a JSON body. */
function requireString(body, field) {
	if (typeof body !== "object" || body === null || !hasOwn(body, field) || typeof body[field] !== "string" || body[field] === "") throw new DifyMarketplaceError("bad_request", `missing string field "${field}"`);
	return body[field];
}
function hasOwn(value, field) {
	return Object.hasOwn(value, field);
}
//#endregion
//#region lib/types/host/interfaces/backwards-invocation.js
/**
* Backwards-invocation adapter.
*
* Local daemon runtimes call Dify's inner API at `{DIFY_INNER_API_URL}/inner/api/...`
* (`calldify.difyPath` prepends `inner/api`). This plugin registers that tree
* under `/dify-marketplace/inner/api` and points the sidecar at
* `http://host.docker.internal:<port>/dify-marketplace`.
*
* The daemon streams with a length-prefixed framing (magic `0x0f`). Responses
* that are not streams use `{ data, error }`.
*
* Unsupported invoke types fail closed with an error string — they do not
* pretend to succeed.
*
* @module dsh-dify-marketplace/host/interfaces/backwards-invocation
*/
const PREFIX = "/dify-marketplace/inner/api";
const MAGIC = 15;
const HEADER_LENGTH = 10;
/**
* Register the inner-API routes the daemon calls back into.
* @param ctx - Host context.
* @param innerApiKey - expected `X-Inner-Api-Key`. Empty disables the adapter.
*/
function registerBackwardsInvocation(ctx, innerApiKey) {
	if (innerApiKey === "") return;
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: PREFIX,
		handler: handle("registration_failed", async (req, res) => {
			if (header(req, "x-inner-api-key") !== innerApiKey) {
				sendJson(res, 401, {
					error: "invalid inner API key",
					data: null
				});
				return;
			}
			await dispatch(ctx, new URL(req.url ?? "/", "http://dsh.local").pathname.slice(27).replace(/^\//, ""), await readJsonBody(req), res);
		})
	}), "dify-backwards-invocation");
}
async function dispatch(ctx, route, body, res) {
	if (route === "invoke/tool") {
		await invokeTool(ctx, body, res);
		return;
	}
	if (route === "invoke/llm" || route === "invoke/llm/structured-output") {
		writeStreamError(res, "Dify plugin requested a Harness LLM call; configure ctx.llm before using plugins that invoke the model");
		return;
	}
	sendJson(res, 200, {
		data: null,
		error: `unsupported backwards invocation "${route}"`
	});
}
async function invokeTool(ctx, body, res) {
	const payload = body;
	const name = payload.data?.tool;
	if (typeof name !== "string" || name === "") {
		sendJson(res, 200, {
			data: null,
			error: "tool name is required"
		});
		return;
	}
	try {
		const result = await ctx.tools.execute({
			callId: `dify-backwards-${Date.now()}`,
			name,
			arguments: payload.data?.tool_parameters ?? {},
			signal: AbortSignal.timeout(12e4)
		});
		writeStreamJson(res, {
			data: {
				type: "text",
				message: { text: JSON.stringify(result) }
			},
			error: ""
		});
	} catch (error) {
		writeStreamError(res, error instanceof Error ? error.message : String(error));
	}
}
function header(req, name) {
	const value = req.headers[name];
	return typeof value === "string" ? value : void 0;
}
function writeStreamError(res, message) {
	writeStreamJson(res, {
		data: null,
		error: message
	});
}
function writeStreamJson(res, payload) {
	const frame = encodeFrame(Buffer.from(JSON.stringify(payload), "utf8"));
	res.writeHead(200, { "content-type": "application/octet-stream" });
	res.end(frame);
}
/** Encode one length-prefixed daemon stream frame (magic 0x0f, header 0x0a). */
function encodeFrame(data) {
	const preamble = Buffer.alloc(4);
	preamble[0] = MAGIC;
	preamble[1] = 0;
	preamble.writeUInt16LE(HEADER_LENGTH, 2);
	const header = Buffer.alloc(HEADER_LENGTH);
	header.writeUInt32LE(data.length, 0);
	return Buffer.concat([
		preamble,
		header,
		data
	]);
}
//#endregion
//#region lib/types/shared/contracts/bridge.js
/**
* Host-to-client bridge contract.
*
* The Web face never talks to marketplace.dify.ai or to the plugin daemon
* directly: the browser cannot hold daemon credentials, and the marketplace
* refuses cross-origin browser calls. Instead the Host registers loopback HTTP
* routes on `ctx.webServer` and the client calls them same-origin, the pattern
* the published DSH market plugins use.
*
* Every type in this file is shared verbatim by both faces, so a route change
* cannot drift between them.
*
* @module dsh-dify-marketplace/shared/contracts/bridge
*/
/** Route prefix owned by this plugin on the Harness web server. */
const BRIDGE_ROUTE_PREFIX = "/dify-marketplace/api";
/** Bridge routes, appended to {@link BRIDGE_ROUTE_PREFIX}. */
const BRIDGE_ROUTES = {
	status: "/status",
	search: "/search",
	collections: "/collections",
	detail: "/detail",
	versions: "/versions",
	icon: "/icon",
	installed: "/installed",
	install: "/install",
	installTask: "/install-task",
	uninstall: "/uninstall",
	credentials: "/credentials",
	validateCredentials: "/credentials/validate"
};
//#endregion
//#region lib/types/host/interfaces/web-routes.js
/**
* Host HTTP bridge consumed by the Settings micro-frontend.
*
* @module dsh-dify-marketplace/host/interfaces/web-routes
*/
/**
* Register every bridge route on the Harness web server.
* @param ctx - Host context.
* @param services - catalog, install, and clients.
*/
function registerBridgeRoutes(ctx, services) {
	const prefix = BRIDGE_ROUTE_PREFIX;
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.status}`,
		handler: handle("marketplace_unavailable", async (_req, res) => {
			sendJson(res, 200, await status(services));
		})
	}), "bridge:status");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.search}`,
		handler: handle("marketplace_unavailable", async (req, res) => {
			const body = await readJsonBody(req);
			sendJson(res, 200, await services.catalog.search({
				query: typeof body.query === "string" ? body.query : "",
				page: typeof body.page === "number" ? body.page : 1,
				pageSize: typeof body.pageSize === "number" ? body.pageSize : 20,
				category: body.category ?? "",
				...body.tags === void 0 ? {} : { tags: body.tags },
				...body.sortBy === void 0 ? {} : { sortBy: body.sortBy },
				...body.sortOrder === void 0 ? {} : { sortOrder: body.sortOrder },
				...body.kind === void 0 ? {} : { kind: body.kind }
			}));
		})
	}), "bridge:search");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.collections}`,
		handler: handle("marketplace_unavailable", async (_req, res) => {
			sendJson(res, 200, await services.catalog.collections());
		})
	}), "bridge:collections");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.detail}`,
		handler: handle("marketplace_unavailable", async (req, res) => {
			const pluginId = queryParam(req, "pluginId");
			if (pluginId === void 0) throw new DifyMarketplaceError("bad_request", "pluginId is required");
			sendJson(res, 200, await services.catalog.detail(pluginId));
		})
	}), "bridge:detail");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.icon}`,
		handler: handle("marketplace_unavailable", async (req, res) => {
			const pluginId = queryParam(req, "pluginId");
			if (pluginId === void 0) throw new DifyMarketplaceError("bad_request", "pluginId is required");
			const icon = await services.catalog.icon(pluginId);
			res.writeHead(200, {
				"content-type": icon.contentType,
				"cache-control": "public, max-age=3600"
			});
			res.end(Buffer.from(icon.bytes));
		})
	}), "bridge:icon");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.installed}`,
		handler: handle("daemon_unavailable", async (_req, res) => {
			sendJson(res, 200, await requireInstall(services).installed());
		})
	}), "bridge:installed");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.install}`,
		handler: handle("install_failed", async (req, res) => {
			const uniqueIdentifier = requireString(await readJsonBody(req), "uniqueIdentifier");
			sendJson(res, 200, await requireInstall(services).install(uniqueIdentifier));
		})
	}), "bridge:install");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.installTask}`,
		handler: handle("install_failed", async (req, res) => {
			const taskId = queryParam(req, "taskId");
			if (taskId === void 0) throw new DifyMarketplaceError("bad_request", "taskId is required");
			sendJson(res, 200, await requireInstall(services).installTask(taskId));
		})
	}), "bridge:install-task");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.uninstall}`,
		handler: handle("daemon_unavailable", async (req, res) => {
			const pluginId = requireString(await readJsonBody(req), "pluginId");
			sendJson(res, 200, await requireInstall(services).uninstall(pluginId));
		})
	}), "bridge:uninstall");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: `${prefix}${BRIDGE_ROUTES.credentials}`,
		handler: handle("credentials_invalid", async (req, res) => {
			const body = await readJsonBody(req);
			const pluginId = requireString(body, "pluginId");
			if (body.credentials === void 0 || typeof body.credentials !== "object") throw new DifyMarketplaceError("bad_request", "credentials object is required");
			sendJson(res, 200, await requireInstall(services).saveCredentials(pluginId, body.credentials));
		})
	}), "bridge:credentials");
}
function requireInstall(services) {
	if (services.install === void 0) throw new DifyMarketplaceError("daemon_unconfigured", "plugin daemon is not configured");
	return services.install;
}
async function status(services) {
	let marketplaceReachable = false;
	let marketplaceError;
	try {
		marketplaceReachable = await services.marketplace.ping();
	} catch (error) {
		marketplaceError = error instanceof DifyMarketplaceError ? error.toBridgeError() : {
			code: "marketplace_unavailable",
			detail: String(error)
		};
	}
	const configured = daemonConfigured(services.config);
	let daemonReachable = false;
	let daemonError;
	if (configured && services.daemon !== void 0) try {
		daemonReachable = await services.daemon.health();
	} catch (error) {
		daemonError = error instanceof DifyMarketplaceError ? error.toBridgeError() : {
			code: "daemon_unavailable",
			detail: String(error)
		};
	}
	return {
		pluginVersion: services.version,
		marketplace: {
			baseUrl: services.config.marketplaceBaseUrl,
			reachable: marketplaceReachable,
			...marketplaceError === void 0 ? {} : { error: marketplaceError }
		},
		daemon: {
			configured,
			baseUrl: configured ? services.config.daemonBaseUrl : null,
			tenantId: configured ? services.config.daemonTenantId : null,
			reachable: daemonReachable,
			...daemonError === void 0 ? {} : { error: daemonError }
		},
		supportedCategories: supportedCategories()
	};
}
//#endregion
//#region lib/types/index.js
const inject = ["tools", "webServer"];
const VERSION = readPackageVersion();
/**
* Apply the Host plugin: bind clients, register HTTP, rehydrate child fibers.
* @param ctx - Host context.
* @param config - plugin config.
*/
function apply(ctx, config = {}) {
	const resolved = resolveConfig(config);
	const marketplace = new MarketplaceClient({
		baseUrl: resolved.marketplaceBaseUrl.replace(/\/$/, ""),
		difyVersion: resolved.difyVersion,
		userAgent: resolved.userAgent,
		timeoutMs: 3e4
	});
	const state = StateStore.inHarnessHome(resolved.harnessHome);
	const vault = CredentialVault.inHarnessHome(resolved.harnessHome);
	const catalog = new CatalogService({
		marketplace,
		state,
		vault
	});
	const daemon = daemonConfigured(resolved) ? new DaemonClient({
		baseUrl: resolved.daemonBaseUrl.replace(/\/$/, ""),
		serverKey: resolved.daemonServerKey,
		tenantId: resolved.daemonTenantId,
		userId: resolved.daemonUserId,
		timeoutMs: 12e4
	}) : void 0;
	const registry = daemon === void 0 ? void 0 : new PluginRegistry(ctx, {
		daemon,
		vault
	});
	registerBridgeRoutes(ctx, {
		config: resolved,
		marketplace,
		daemon,
		catalog,
		install: daemon === void 0 || registry === void 0 ? void 0 : new InstallService({
			marketplace,
			daemon,
			state,
			vault,
			registry,
			config: resolved
		}),
		version: VERSION
	});
	registerBackwardsInvocation(ctx, resolved.innerApiKey);
	if (registry !== void 0) ctx.effect(() => {
		state.list().then((records) => registry.rehydrate(records));
		return () => {
			registry.disposeAll();
		};
	}, "dify-marketplace:rehydrate");
}
function readPackageVersion() {
	const here = dirname(fileURLToPath(import.meta.url));
	for (const candidate of [join(here, "..", "package.json"), join(here, "..", "..", "package.json")]) try {
		const parsed = JSON.parse(readFileSync(candidate, "utf8"));
		if (parsed.name === "dsh-dify-marketplace") return parsed.version ?? "0.1.0";
	} catch {}
	return "0.1.0";
}
//#endregion
export { Config, apply, inject, name };

//# sourceMappingURL=index.js.map