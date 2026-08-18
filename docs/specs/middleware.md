# Middleware

Host middleware turns a Marketplace install into a live DSH plugin. Implementation is a later phase; this spec is the contract.

## Install

1. Resolve `latest_package_identifier` (or a chosen version's `unique_identifier`).
2. GET marketplace download-url; follow 302; store bytes Host-side.
3. POST daemon `install/upload/package`.
4. POST daemon `install/identifiers` with `source: marketplace` and metas.
5. Poll `install/tasks/:id` until success or failure.
6. Persist install record under `$DSH_HOME/dsh-dify-marketplace/state/`.
7. `ctx.plugin(runtimeChild, { pluginUniqueIdentifier, category })`.
8. If the child cannot activate, surface the error and do not claim success.
9. Optionally POST marketplace `stats/plugins/install_count` (best-effort).

UI stays pending until step 7 succeeds.

## Uninstall

1. Dispose the child fiber (unregister tools, drop effects).
2. POST daemon `uninstall` with `plugin_installation_id`.
3. Delete credentials for that plugin.
4. Delete the durable state record.

## Upgrade

Daemon `POST /install/upgrade` with original and new unique identifiers. Replace the fiber after the task succeeds.

## Boot rehydrate

On Host `apply`, read durable state and remount each fiber. Missing daemon or missing package is a failed row, not a silent skip.

## Credentials

Collected in the client from marketplace detail (`tool.credentials_schema` or model credential schemas). Submitted through Host HTTP/Remote. Validated with daemon `tool/validate_credentials` or `model/validate_*`. Stored only under `$DSH_HOME/dsh-dify-marketplace/credentials/`.

## Naming

| Kind | Pattern |
|---|---|
| Fiber id | `dify:<org>/<name>` |
| Package name on the Loader row | `dsh-dify-marketplace` |
| Tool public name | `dify__<org>__<plugin>__<tool>` after `[A-Za-z0-9_]` normalization |

## Teardown

Every `ctx.tools.register`, `ctx.plugin`, `webServer.register`, and vault handle must return a disposer held by `ctx.effect`. Unload/reload must not leak slots or tools.

## Dynamic Include

Optional hot-mount via `@deepseek-ai/cordis-plugin-include` (runtime import from the Harness profile), same idea as dsh-market `hot.ts`. If Include cannot load, fail the activation visibly; do not pretend the plugin is installed.
