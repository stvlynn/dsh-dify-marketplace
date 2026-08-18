# Testing

## Unit (always)

Identifier parsing, tool name normalization, patch/fiber id stability, credential schema mapping, error taxonomy, fixture envelope checks, Settings tab IA (`pnpm test`).

Fixtures under `fixtures/marketplace/` are sanitized live captures. Do not invent payloads.

## Integration

- Marketplace HTTP client against **live** `marketplace.dify.ai` (search/detail/category). Use browser UA + `X-Dify-Version`.
- Daemon client against **real Compose** (upload + install + list + uninstall). Start with `pnpm daemon:up`. A missing daemon fails the daemon file instead of skipping it.

```sh
pnpm test:integration
pnpm daemon:up && pnpm test:integration:daemon
```

## E2E Playwright

Config: `playwright.config.ts`.

```sh
pnpm test:e2e          # live marketplace.dify.ai information architecture
DSH_WEB_URL=http://127.0.0.1:<port> pnpm test:e2e:dsh
```

Journeys:

1. Live marketplace homepage title and tabs match `fixtures/marketplace/playwright-ia.json`; search API returns unique identifiers.
2. DSH web profile with this plugin; Settings → Dify Marketplace lists live plugins and search works (`test:e2e:dsh`).
3. Install the repo-authored `.difypkg` through the daemon (`pnpm package:fixture` then `pnpm test:integration`).
4. Uninstall removes the daemon installation.

CI: unit + marketplace fixture tests always. Daemon and DSH e2e require Docker / a web profile and are separate jobs.

## Commands

```sh
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm package:fixture
```
