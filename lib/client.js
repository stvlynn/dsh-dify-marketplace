window.__ModuleLoader__.load({ id: "dsh-dify-marketplace", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region lib/client-types/shared/localized.js
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
		//#region lib/client-types/shared/contracts/bridge.js
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
		//#region lib/client-types/client/shared/api.js
		/**
		* Same-origin client for the Host HTTP bridge.
		*
		* @module dsh-dify-marketplace/client/shared/api
		*/
		/** Fetch JSON from a bridge route. */
		async function bridgeJson(route, init = {}) {
			const { query, ...rest } = init;
			const url = new URL(`${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES[route]}`, window.location.origin);
			if (query !== void 0) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
			const response = await fetch(url, {
				...rest,
				headers: {
					accept: "application/json",
					...rest.headers ?? {}
				}
			});
			const text = await response.text();
			let parsed;
			try {
				parsed = JSON.parse(text);
			} catch {
				throw asBridgeError({
					code: "marketplace_unavailable",
					detail: text.slice(0, 200)
				});
			}
			if (!response.ok) throw asBridgeError(parsed);
			return parsed;
		}
		function asBridgeError(value) {
			const record = value;
			const error = new Error(record.detail ?? "bridge request failed");
			error.code = record.code ?? "marketplace_unavailable";
			error.detail = record.detail ?? error.message;
			return error;
		}
		const api = {
			status: () => bridgeJson("status"),
			search: (body) => bridgeJson("search", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			}),
			collections: () => bridgeJson("collections"),
			detail: (pluginId) => bridgeJson("detail", { query: { pluginId } }),
			iconUrl: (pluginId) => `${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES.icon}?pluginId=${encodeURIComponent(pluginId)}`,
			installed: () => bridgeJson("installed"),
			install: (uniqueIdentifier) => bridgeJson("install", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ uniqueIdentifier })
			}),
			installTask: (taskId) => bridgeJson("installTask", { query: { taskId } }),
			uninstall: (pluginId) => bridgeJson("uninstall", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ pluginId })
			}),
			saveCredentials: (pluginId, credentials) => bridgeJson("credentials", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					pluginId,
					credentials
				})
			})
		};
		//#endregion
		//#region lib/client-types/client/shared/locales.js
		/**
		* Locale dictionaries. User-facing copy lives here, never in components.
		*
		* @module dsh-dify-marketplace/client/shared/locales
		*/
		const en = {
			nav: "Dify Marketplace",
			searchPlaceholder: "Search plugins",
			search: "Search",
			tabAll: "All",
			tabModels: "Models",
			tabTools: "Tools",
			tabDatasources: "Data Sources",
			tabTriggers: "Triggers",
			tabAgent: "Agent",
			tabExtensions: "Extensions",
			tabBundles: "Bundles",
			tabInstalled: "Installed",
			collections: "Collections",
			marketplaceUp: "Marketplace reachable",
			marketplaceDown: "Marketplace unreachable",
			daemonUp: "Plugin daemon reachable",
			daemonDown: "Plugin daemon unreachable",
			daemonMissing: "Plugin daemon is not configured",
			install: "Install",
			installing: "Installing…",
			uninstall: "Uninstall",
			uninstalling: "Uninstalling…",
			installed: "Installed",
			upgrade: "Upgrade",
			credentials: "Save credentials",
			noResults: "No plugins in this view.",
			emptyBundles: "The marketplace returned no bundles.",
			failed: "Failed",
			pending: "Pending",
			needsCredentials: "Needs credentials",
			active: "Active",
			close: "Close",
			versions: "Versions",
			installCount: "{count} installs"
		};
		const zh = {
			nav: "Dify 插件市场",
			searchPlaceholder: "搜索插件",
			search: "搜索",
			tabAll: "全部",
			tabModels: "模型",
			tabTools: "工具",
			tabDatasources: "数据源",
			tabTriggers: "触发器",
			tabAgent: "Agent",
			tabExtensions: "扩展",
			tabBundles: "插件包",
			tabInstalled: "已安装",
			collections: "合集",
			marketplaceUp: "市场可访问",
			marketplaceDown: "市场不可访问",
			daemonUp: "插件守护进程可访问",
			daemonDown: "插件守护进程不可访问",
			daemonMissing: "尚未配置插件守护进程",
			install: "安装",
			installing: "正在安装…",
			uninstall: "卸载",
			uninstalling: "正在卸载…",
			installed: "已安装",
			upgrade: "升级",
			credentials: "保存凭证",
			noResults: "此视图没有插件。",
			emptyBundles: "市场未返回任何插件包。",
			failed: "失败",
			pending: "处理中",
			needsCredentials: "需要凭证",
			active: "已激活",
			close: "关闭",
			versions: "版本",
			installCount: "{count} 次安装"
		};
		const NS = "dsh-dify-marketplace";
		//#endregion
		//#region lib/client-types/client/shared/tabs.js
		/**
		* Marketplace section tabs. Labels come from the locale dictionaries; ids
		* match the live marketplace information architecture captured in
		* `fixtures/marketplace/playwright-ia.json`.
		*
		* @module dsh-dify-marketplace/client/shared/tabs
		*/
		/** Tabs the Settings section renders, in marketplace homepage order plus Installed. */
		const MARKETPLACE_TABS = [
			{
				id: "all",
				key: "tabAll",
				category: ""
			},
			{
				id: "model",
				key: "tabModels",
				category: "model"
			},
			{
				id: "tool",
				key: "tabTools",
				category: "tool"
			},
			{
				id: "datasource",
				key: "tabDatasources",
				category: "datasource"
			},
			{
				id: "agent-strategy",
				key: "tabAgent",
				category: "agent-strategy"
			},
			{
				id: "trigger",
				key: "tabTriggers",
				category: "trigger"
			},
			{
				id: "extension",
				key: "tabExtensions",
				category: "extension"
			},
			{
				id: "bundles",
				key: "tabBundles",
				category: ""
			},
			{
				id: "installed",
				key: "tabInstalled",
				category: ""
			}
		];
		//#endregion
		//#region lib/client-types/client/shared/primitives.js
		/**
		* Host primitive names this client requires. Missing names disable the section
		* instead of throwing during apply.
		*
		* @module dsh-dify-marketplace/client/shared/primitives
		*/
		const REQUIRED_PRIMITIVES = [
			"Button",
			"Input",
			"Pill",
			"StateDot"
		];
		/**
		* Names from `required` that are absent on the host primitives module.
		* @param mod - the loaded `@deepseek-ai/dsh-client-ui-primitives` module.
		* @param required - primitive export names this client uses.
		*/
		function missingPrimitives(mod, required = REQUIRED_PRIMITIVES) {
			return required.filter((name) => mod[name] === void 0);
		}
		//#endregion
		//#region \0dsh-css:/Users/stvlynn/code/dsh-dify-marketplace/src/client/shared/styles.module.css.mjs
		const css = ".MeAbFW_root{height:100%;min-height:0;color:var(--dsw-text,inherit);flex-direction:column;gap:12px;display:flex}.MeAbFW_banner{flex-wrap:wrap;gap:8px;font-size:12px;display:flex}.MeAbFW_status{align-items:center;gap:6px;display:inline-flex}.MeAbFW_toolbar{align-items:center;gap:8px;display:flex}.MeAbFW_search{flex:1}.MeAbFW_tabs{flex-wrap:wrap;gap:4px;display:flex}.MeAbFW_tab{appearance:none;border:1px solid var(--dsw-border,#444);color:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:4px 10px}.MeAbFW_tabActive{background:var(--dsw-fill,#333)}.MeAbFW_grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;display:grid;overflow:auto}.MeAbFW_card{border:1px solid var(--dsw-border,#444);cursor:pointer;text-align:left;color:inherit;background:0 0;border-radius:8px;flex-direction:column;gap:6px;padding:10px;display:flex}.MeAbFW_cardHeader{align-items:center;gap:8px;display:flex}.MeAbFW_icon{object-fit:cover;border-radius:6px;width:28px;height:28px}.MeAbFW_title{font-size:13px;font-weight:600}.MeAbFW_brief{opacity:.8;-webkit-line-clamp:3;-webkit-box-orient:vertical;font-size:12px;display:-webkit-box;overflow:hidden}.MeAbFW_meta{opacity:.7;font-size:11px}.MeAbFW_detail{border-top:1px solid var(--dsw-border,#444);flex-direction:column;gap:8px;padding-top:12px;display:flex;overflow:auto}.MeAbFW_actions{flex-wrap:wrap;gap:8px;display:flex}.MeAbFW_form{flex-direction:column;gap:8px;display:flex}.MeAbFW_field label{margin-bottom:4px;font-size:12px;display:block}.MeAbFW_error{color:var(--dsw-danger,#c44);font-size:12px}.MeAbFW_empty{opacity:.7;font-size:13px}.MeAbFW_collection{flex-direction:column;gap:8px;display:flex}.MeAbFW_collectionTitle{font-size:13px;font-weight:600}";
		const tagId = "dsh-dify-marketplace/styles.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-dify-marketplace";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var styles_module_css_default = {
			"detail": "MeAbFW_detail",
			"banner": "MeAbFW_banner",
			"search": "MeAbFW_search",
			"grid": "MeAbFW_grid",
			"cardHeader": "MeAbFW_cardHeader",
			"icon": "MeAbFW_icon",
			"status": "MeAbFW_status",
			"toolbar": "MeAbFW_toolbar",
			"tabs": "MeAbFW_tabs",
			"meta": "MeAbFW_meta",
			"empty": "MeAbFW_empty",
			"tabActive": "MeAbFW_tabActive",
			"form": "MeAbFW_form",
			"root": "MeAbFW_root",
			"field": "MeAbFW_field",
			"brief": "MeAbFW_brief",
			"error": "MeAbFW_error",
			"title": "MeAbFW_title",
			"collection": "MeAbFW_collection",
			"card": "MeAbFW_card",
			"collectionTitle": "MeAbFW_collectionTitle",
			"tab": "MeAbFW_tab",
			"actions": "MeAbFW_actions"
		};
		//#endregion
		//#region lib/client-types/client/pages/MarketplacePage.js
		/**
		* Settings section: Dify Marketplace browser, installer, and credential form.
		*
		* @module dsh-dify-marketplace/client/pages/marketplace
		*/
		/** Marketplace settings page. */
		function MarketplacePage({ t }) {
			const [status, setStatus] = (0, react.useState)();
			const [tab, setTab] = (0, react.useState)("all");
			const [query, setQuery] = (0, react.useState)("");
			const [search, setSearch] = (0, react.useState)();
			const [collections, setCollections] = (0, react.useState)();
			const [installed, setInstalled] = (0, react.useState)([]);
			const [selected, setSelected] = (0, react.useState)();
			const [detail, setDetail] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [busy, setBusy] = (0, react.useState)();
			const [credentialDraft, setCredentialDraft] = (0, react.useState)({});
			const loadStatus = (0, react.useCallback)(async () => {
				try {
					setStatus(await api.status());
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				}
			}, []);
			const loadList = (0, react.useCallback)(async () => {
				setError(void 0);
				try {
					if (tab === "installed") {
						setInstalled((await api.installed()).plugins);
						return;
					}
					if (tab === "all") setCollections(await api.collections());
					const category = MARKETPLACE_TABS.find((item) => item.id === tab)?.category ?? "";
					setSearch(await api.search({
						query,
						page: 1,
						pageSize: 20,
						category,
						kind: tab === "bundles" ? "bundles" : "plugins"
					}));
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				}
			}, [query, tab]);
			(0, react.useEffect)(() => {
				loadStatus();
			}, [loadStatus]);
			(0, react.useEffect)(() => {
				loadList();
			}, [loadList]);
			(0, react.useEffect)(() => {
				if (selected === void 0) {
					setDetail(void 0);
					return;
				}
				api.detail(selected).then((next) => {
					setDetail(next);
					setCredentialDraft({});
				}).catch((caught) => {
					setError(caught instanceof Error ? caught.message : String(caught));
				});
			}, [selected]);
			const items = (0, react.useMemo)(() => search?.plugins ?? [], [search]);
			async function onInstall(uniqueIdentifier) {
				setBusy("install");
				setError(void 0);
				try {
					const started = await api.install(uniqueIdentifier);
					if (started.taskId !== null) for (;;) {
						const task = await api.installTask(started.taskId);
						if (task.status === "success" || task.status === "failed") {
							if (task.status === "failed") setError(task.registration.error?.detail ?? t("failed"));
							break;
						}
						await new Promise((resolve) => setTimeout(resolve, 1e3));
					}
					await loadList();
					setDetail(await api.detail(started.pluginId));
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				} finally {
					setBusy(void 0);
				}
			}
			async function onUninstall(pluginId) {
				setBusy("uninstall");
				setError(void 0);
				try {
					await api.uninstall(pluginId);
					setSelected(void 0);
					await loadList();
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				} finally {
					setBusy(void 0);
				}
			}
			async function onCredentials(event) {
				event.preventDefault();
				if (detail === void 0) return;
				setBusy("credentials");
				setError(void 0);
				try {
					const result = await api.saveCredentials(detail.plugin.plugin_id, credentialDraft);
					if (result.error !== void 0) setError(result.error.detail);
					setDetail(await api.detail(detail.plugin.plugin_id));
					await loadList();
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				} finally {
					setBusy(void 0);
				}
			}
			return (0, react_jsx_runtime.jsxs)("div", {
				className: styles_module_css_default.root,
				children: [
					status !== void 0 && (0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.banner,
						children: [(0, react_jsx_runtime.jsxs)("span", {
							className: styles_module_css_default.status,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.marketplace.reachable ? "done" : "error" }), status.marketplace.reachable ? t("marketplaceUp") : t("marketplaceDown")]
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: styles_module_css_default.status,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.daemon.configured ? status.daemon.reachable ? "done" : "error" : "warning" }), !status.daemon.configured ? t("daemonMissing") : status.daemon.reachable ? t("daemonUp") : t("daemonDown")]
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.toolbar,
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: styles_module_css_default.search,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: query,
								placeholder: t("searchPlaceholder"),
								onChange: (event) => setQuery(event.target.value),
								onKeyDown: (event) => {
									if (event.key === "Enter") loadList();
								}
							})
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							onClick: () => {
								loadList();
							},
							children: t("search")
						})]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: styles_module_css_default.tabs,
						children: MARKETPLACE_TABS.map((item) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${styles_module_css_default.tab} ${tab === item.id ? styles_module_css_default.tabActive : ""}`,
							onClick: () => {
								setTab(item.id);
								setSelected(void 0);
							},
							children: t(item.key)
						}, item.id))
					}),
					error !== void 0 && (0, react_jsx_runtime.jsx)("div", {
						className: styles_module_css_default.error,
						children: error
					}),
					tab === "installed" ? (0, react_jsx_runtime.jsx)(InstalledList, {
						plugins: installed,
						t,
						onSelect: setSelected
					}) : tab === "all" && collections !== void 0 ? (0, react_jsx_runtime.jsxs)("div", { children: [collections.collections.map((entry) => (0, react_jsx_runtime.jsxs)("section", {
						className: styles_module_css_default.collection,
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: styles_module_css_default.collectionTitle,
							children: localized(entry.collection.label)
						}), (0, react_jsx_runtime.jsx)(PluginGrid, {
							items: entry.plugins,
							t,
							onSelect: setSelected
						})]
					}, entry.collection.name)), (0, react_jsx_runtime.jsx)(PluginGrid, {
						items,
						t,
						onSelect: setSelected
					})] }) : (0, react_jsx_runtime.jsx)(PluginGrid, {
						items,
						t,
						onSelect: setSelected,
						empty: tab === "bundles" ? t("emptyBundles") : t("noResults")
					}),
					detail !== void 0 && (0, react_jsx_runtime.jsx)(Detail, {
						detail,
						t,
						busy,
						credentialDraft,
						onCredentialChange: (name, value) => setCredentialDraft((current) => ({
							...current,
							[name]: value
						})),
						onInstall: () => {
							onInstall(detail.plugin.latest_package_identifier);
						},
						onUninstall: () => {
							onUninstall(detail.plugin.plugin_id);
						},
						onCredentials,
						onClose: () => setSelected(void 0)
					})
				]
			});
		}
		function PluginGrid(props) {
			if (props.items.length === 0) return (0, react_jsx_runtime.jsx)("div", {
				className: styles_module_css_default.empty,
				children: props.empty
			});
			return (0, react_jsx_runtime.jsx)("div", {
				className: styles_module_css_default.grid,
				children: props.items.map((item) => (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: styles_module_css_default.card,
					onClick: () => props.onSelect(item.plugin.plugin_id),
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: styles_module_css_default.cardHeader,
							children: [(0, react_jsx_runtime.jsx)("img", {
								className: styles_module_css_default.icon,
								src: api.iconUrl(item.plugin.plugin_id),
								alt: ""
							}), (0, react_jsx_runtime.jsx)("div", {
								className: styles_module_css_default.title,
								children: localized(item.plugin.label)
							})]
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: styles_module_css_default.brief,
							children: localized(item.plugin.brief)
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: styles_module_css_default.meta,
							children: [
								item.plugin.plugin_id,
								" · ",
								item.plugin.latest_version,
								item.installedVersion !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									" · ",
									props.t("installed"),
									" ",
									item.installedVersion
								] })
							]
						})
					]
				}, item.plugin.plugin_id))
			});
		}
		function InstalledList(props) {
			if (props.plugins.length === 0) return (0, react_jsx_runtime.jsx)("div", {
				className: styles_module_css_default.empty,
				children: props.t("noResults")
			});
			return (0, react_jsx_runtime.jsx)("div", {
				className: styles_module_css_default.grid,
				children: props.plugins.map((plugin) => (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: styles_module_css_default.card,
					onClick: () => props.onSelect(plugin.pluginId),
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.cardHeader,
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: styles_module_css_default.title,
							children: localized(plugin.label)
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: plugin.registration.status })]
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.meta,
						children: [
							plugin.pluginId,
							" · ",
							plugin.version
						]
					})]
				}, plugin.pluginId))
			});
		}
		function Detail(props) {
			const { detail, t } = props;
			const installed = detail.installedVersion !== null;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: styles_module_css_default.detail,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.cardHeader,
						children: [
							(0, react_jsx_runtime.jsx)("img", {
								className: styles_module_css_default.icon,
								src: api.iconUrl(detail.plugin.plugin_id),
								alt: ""
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: styles_module_css_default.title,
								children: localized(detail.plugin.label)
							}),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								onClick: props.onClose,
								children: t("close")
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: styles_module_css_default.brief,
						children: localized(detail.plugin.brief)
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.meta,
						children: [
							detail.plugin.plugin_id,
							" · ",
							detail.plugin.latest_version,
							" · ",
							detail.registration.surface
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.actions,
						children: [!installed && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							disabled: props.busy !== void 0,
							onClick: props.onInstall,
							children: props.busy === "install" ? t("installing") : t("install")
						}), installed && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							disabled: props.busy !== void 0,
							onClick: props.onUninstall,
							children: props.busy === "uninstall" ? t("uninstalling") : t("uninstall")
						})]
					}),
					detail.credentialFields.length > 0 && (0, react_jsx_runtime.jsxs)("form", {
						className: styles_module_css_default.form,
						onSubmit: props.onCredentials,
						children: [detail.credentialFields.map((field) => (0, react_jsx_runtime.jsxs)("div", {
							className: styles_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("label", {
								htmlFor: `cred-${field.name}`,
								children: localized(field.label) || field.name
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: `cred-${field.name}`,
								type: field.type === "secret-input" ? "password" : "text",
								value: props.credentialDraft[field.name] ?? "",
								placeholder: localized(field.placeholder ?? void 0),
								onChange: (event) => props.onCredentialChange(field.name, event.target.value)
							})]
						}, field.name)), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "submit",
							disabled: props.busy !== void 0,
							children: t("credentials")
						})]
					})
				]
			});
		}
		//#endregion
		//#region lib/client-types/client/index.js
		/**
		* Browser client entry.
		*
		* Slot contracts inspected in DeepSeek Harness dsh-v0.1.0-rc.7:
		* - `settings.section` (list, id + order + label, owner.close)
		* - `settings.plugin.item` (keyed; nested inject so older hosts omit the card)
		* - `shell.overlay` (list)
		*
		* Module-level inject is `slots` + `locale`. `settingsScope` is nested so hosts
		* before rc.7 omit the Plugins card instead of failing to mount.
		*/
		const name = "dsh-dify-marketplace";
		const inject = ["slots", "locale"];
		/**
		* Register the Dify Marketplace settings section.
		* @param ctx - client context.
		*/
		function apply(ctx) {
			const gaps = missingPrimitives(_deepseek_ai_dsh_client_ui_primitives);
			if (gaps.length > 0) {
				console.warn(`[dsh-dify-marketplace] host ui-primitives missing ${gaps.join(", ")} — section disabled`);
				return;
			}
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dify-marketplace:dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dify-marketplace",
				order: 55,
				label: () => t("nav"),
				locale: NS
			}, () => (0, react.createElement)(MarketplacePage, { t })));
			ctx.inject?.(["settingsScope"], (scoped) => {
				scoped.slots.inject("settings.plugin.item", () => scoped.slots.register({
					name: "settings.plugin.item",
					key: NS,
					locale: NS
				}, () => (0, react.createElement)(MarketplacePage, { t })));
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
return module.exports; } });
//# sourceMappingURL=client.js.map