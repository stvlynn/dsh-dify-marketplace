# dsh-dify-marketplace

A DeepSeek Harness plugin that embeds a Dify Marketplace micro-frontend in Settings, talks to the public `marketplace.dify.ai` HTTP APIs, installs `.difypkg` packages through the official [dify-plugin-daemon](https://github.com/langgenius/dify-plugin-daemon), and mounts each installed Dify plugin as a Cordis child fiber.

This is not an official Dify or DeepSeek product.

## Compatibility

| Surface | Pin |
|---|---|
| DeepSeek Harness | `dsh-v0.1.0-rc.7` (`99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`) |
| Package name | `dsh-dify-marketplace` (not `@deepseek-ai`) |
| Delivery track | Host + Web UI |

No `dsh` CLI was installed on the machine that bootstrapped this repository. Develop against the Harness tag above.

## What this plugin does

- Browse and search Dify Marketplace plugins (All / Models / Tools / Data Sources / Agent Strategies / Triggers / Extensions / Bundles).
- Show collections, tags, and plugin detail including credential schemas.
- Download `.difypkg` via the marketplace download-url redirect and install through the daemon.
- Register Dify tools on `ctx.tools` under `dify__<org>__<plugin>__<tool>` after a successful install.
- Store credentials on the Host. The browser never holds secrets.

## Install (after a release commit exists)

```sh
dsh plugin --profile web add ./
dsh --profile web --dump-config
dsh --profile web
```

From a public commit:

```sh
dsh plugin --profile web add github:<owner>/dsh-dify-marketplace#<40-character-commit>
```

Disable: remove the bundle row from the profile or uninstall the package with `dsh plugin`. Uninstall of an individual Dify plugin is a product flow inside Settings, not `dsh plugin remove`.

## Configure

Host config (Cordis row):

| Field | Meaning |
|---|---|
| `marketplaceBaseUrl` | Defaults to `https://marketplace.dify.ai` |
| `daemonBaseUrl` | Attach to a running daemon instead of supervising Compose |
| `daemonServerKey` | Daemon `SERVER_KEY` |
| `daemonTenantId` | Tenant path segment (`/plugin/:tenant_id/...`) |

Secrets live under `$DSH_HOME/storages/dify-marketplace/` (`installed.json` and `credentials/`).

## Verify

```sh
pnpm typecheck
pnpm test
pnpm test:e2e
```

`pnpm test:e2e` is the live marketplace information-architecture journey. The Settings journey needs a running web profile: `DSH_WEB_URL=http://127.0.0.1:<port> pnpm test:e2e:dsh`. Daemon install tests need Compose: `pnpm daemon:up && pnpm test:integration`.

## Documentation

Start at [`docs/README.md`](docs/README.md). Plugin authors should also read [dsh.pub/develop-plugin.md](https://dsh.pub/develop-plugin.md).

## License

MIT. See [`LICENSE`](LICENSE).
