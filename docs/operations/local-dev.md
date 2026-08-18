# Local development

## Requirements

- Node `^22.19.0 || >=24.0.0`
- pnpm
- DeepSeek Harness `dsh-v0.1.0-rc.7` for runtime install checks
- Docker for the plugin-daemon sidecar

## Commands

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Verify the client factory banner:

```sh
head -c 80 lib/client.js
# must start with window.__ModuleLoader__.load({ id: "dsh-dify-marketplace"
```

## Plugin daemon

```sh
cp deploy/plugin-daemon/.env.example deploy/plugin-daemon/.env
# Point DIFY_INNER_API_URL at the Harness web origin plus /dify-marketplace.
pnpm daemon:up
pnpm daemon:down
```

Package the hello fixture:

```sh
pnpm package:fixture
```

## Marketplace recapture

Use Playwright or curl with a browser User-Agent and `X-Dify-Version: 999.0.0`. Sanitize signed URLs. Do not commit `.difypkg` bytes. See `fixtures/marketplace/README.md`.
