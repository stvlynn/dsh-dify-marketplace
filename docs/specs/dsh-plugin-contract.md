# DSH plugin contract

Pinned to DeepSeek Harness **dsh-v0.1.0-rc.7**, commit [`99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`](https://github.com/deepseek-ai/deepseek-harness/tree/99f6f02fecdb7dff40c3fbc9470f5907c29f74ca).

No local `dsh` binary was present. Contracts below are from that tag (scratch clone) plus published peers:

- [dsh-market/dsh-market](https://github.com/dsh-market/dsh-market) `2fad14a7dc98bf17bd001d2515b7e5519ca67869` — `dshmarket@1.14.0-beta.2`, peer `@deepseek-ai/cordis@^4.0.1`, `@deepseek-ai/dsh-settings@^0.1.0-rc.7`, client inject rc.7 packages, tsdown factory bundle.
- [bradeGithub/DSH-Plugins-Marketplace](https://github.com/bradeGithub/DSH-Plugins-Marketplace) `861842b889ca87d49608fa20b4bbb819f5aebd01` — `dsh-plugin-marketplace@1.5.3`, `dsh.client.inject` runtime + ui-settings, `immediately: true`, Host `inject: [webServer]`.

dsh.pub develop-plugin.md is still pinned to rc.5 (`47f943859bef60e4160492346772ded9b24f765a`). Where they differ, **rc.7 source wins**.

## Package identity

- npm/Git name: `dsh-dify-marketplace` (not `@deepseek-ai`)
- `"type": "module"`
- `exports["."]` → `lib/index.js`
- `exports["./client"]` → `lib/client.js`
- `exports["./cordis.patch.yml"]`, `exports["./package.json"]`
- `dsh.bundle.patch` → `./cordis.patch.yml`
- No `workspace:` ranges

Patch:

```yaml
- insert:
    - id: dsh-dify-marketplace
      name: dsh-dify-marketplace
      inject: [tools, webServer]
```

## Client factory bundle

Harness `packages/client/tsdown.client.ts` emits:

```js
window.__ModuleLoader__.load({ id: "<package name>", factory: (require) => {
  var module = { exports: {} }; var exports = module.exports;
  // ...
  return module.exports;
} });
```

`client-modules` fetches `exports["./client"]` as a classic script. Raw ESM is not a valid client artifact.

Harness `clientBundle()` is monorepo-internal (not a published helper). This repo vendors an audited equivalent: `tsdown.config.ts` + `scripts/normalize-client-banner.mjs`.

Externals are exactly the frozen loader module table, `PLATFORM_MODULES` in `packages/client/web/src/platform.ts`, plus the documented client-runtime exemption:

`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-web-react`, `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-attachment`, `@deepseek-ai/dsh-client-schema-form`, `@deepseek-ai/dsh-client-runtime/client`.

Everything else inlines. A `require()` the table cannot answer throws at materialization, so the externals list must not be widened beyond this set.

`dsh.client.inject` (manifest, informational):

`@deepseek-ai/dsh-client-connection`, `@deepseek-ai/dsh-client-runtime`, `@deepseek-ai/dsh-client-locale`, `@deepseek-ai/dsh-client-ui-settings`, `@deepseek-ai/dsh-client-ui-theme`

Module `export const inject` (service names): `['slots', 'locale']`. Nested `ctx.inject(['settingsScope'], ...)` for the Plugins card, matching dsh-market (older hosts omit the card).

## Slots (rc.7 `slot-catalog.ts` / `ui-settings` / `ui-layout`)

### `settings.section`

- kind `list`, scope `root`
- register: `id` required, `order` optional, `label` string or thunk
- owner: `{ close: () => void }`
- declared while `sidebar.settings` is mounted
- occupants include general, models (`id: 'models'`), plugins (`id: 'plugins'`)
- this plugin: `id: 'dify-marketplace'`

### `settings.plugin.item`

- kind `keyed`, scope `root`
- register: `key` = settings namespace
- declared by the configurable Plugins tab
- owner props empty

### `shell.overlay`

- kind `list`, scope `root`
- register: `id` required
- click-through until an entry opts into pointer events
- dsh-market uses this for install toast

There is **no** `settings.models` slot. Models is a `settings.section` occupant. Provider registration is `ctx.llm.registerAdapter` / `registerConfigurableProviders` (`packages/llm/llm/src/index.ts`).

## `ctx.tools.register`

`ToolDefinition` extends `ToolSchema` (`name`, `description`, `parameters`) and **requires** `output: ToolOutputDefinition` (`schema` + `render`). `execute(args, exec)` returns the canonical JSON value. Optional: `finalizeContent`, `timeoutMs`, `isConcurrencySafe`, `presentCall`, `presentResult`.

`defineTool()` compiles parameter/output schemas and wraps execute with validation (`packages/core/tools/src/schema.ts`).

MCP client public names: `mcp__<server>__<raw>`. This plugin's planned tool names: `dify__<org>__<plugin>__<tool>` (normalize to `[A-Za-z0-9_]`).

## `ctx.plugin(child, config)`

Cordis `Context.plugin` (`vendor/cordis/src/registry.ts`) starts a child fiber and returns a thenable `Fiber`. `inject` is resolved before `apply`. `ctx.effect` disposers run on unload.

dsh-market `src/hot.ts` dynamically imports `@deepseek-ai/cordis-plugin-include`, subclasses `Include`, suppresses `write()`, and mounts a runtime-only YAML tree via `ctx.plugin(hotTree, config)`. If Include is missing, it falls back to process restart. `@deepseek-ai/cordis-plugin-include` is vendored unpublished in Harness (`vendor/include`); out-of-tree code must import it at runtime from the profile, not typecheck it as a registry dependency.

## `ctx.webServer`

`packages/host/webserver`: `register({ kind: 'exact'|'prefix', path, handler })`, `registerUpgrade`, `registerFallback`, `tapIndex`. Duplicate paths throw. Match order: exact, then longest prefix, then fallback. Exists in Web-shaped profiles; Electron does not use this HTTP server.

## Host → client Remote

Three inspected patterns (do not mix casually):

1. **Typert `ctx.remote`** — generated `/remote` modules, `ctx.remote.$mount`, `ctx.remote.$on`. Used by built-in Settings/models. Generator is in-tree.
2. **`harness.handle` / `host.call`** — cordis-host-runner / cordis-client-runner. Client→Host only, JSON args.
3. **Loopback HTTP** — `ctx.webServer.register` + `fetch` from the browser. Used by both community marketplaces.

## Client inject names vs Host inject names

Manifest `dsh.client.inject` is package names. Module `export const inject` is Cordis service names (`slots`, `locale`, `theme`, `settingsScope`, `connection`, `remote`). They are different lists.
