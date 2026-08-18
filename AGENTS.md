# Agentic Coding Guidelines

Read this file first. Then follow the documentation map before writing any code.

This is a DeepSeek Harness plugin repository (Host + Web UI). Layout is plugin-shaped, not a generic web app: Host DDD lives under `src/host/`, the Settings micro-frontend uses Feature-Sliced Design under `src/client/`, and the installable package is the Git root.

## Before you start

1. Read the docs first. Do not assume conventions.
2. Ask when boundaries are unclear.
3. Check logs and docs before inventing workarounds. Do not add fallback logic to bypass a problem you have not understood.

## DeepSeek Harness plugin development

Before changing plugin code, read https://dsh.pub/develop-plugin.md completely. Follow the pinned runtime contract and verification boundaries there; this repository's own security, testing, and release rules remain authoritative.

Target Harness for this repository: **dsh-v0.1.0-rc.7** commit `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`. Slot names, Remote APIs, and `ctx.llm` registration are taken from that checkout. See [`docs/specs/dsh-plugin-contract.md`](docs/specs/dsh-plugin-contract.md).

## Documentation map

### Understand the project

- [`docs/README.md`](docs/README.md) — top-level index.
- [`docs/project/README.md`](docs/project/README.md) — overview and boundaries.
- [`docs/project/architecture.md`](docs/project/architecture.md) — ownership and data flow.

### Specs

- [`docs/specs/dify-marketplace-api.md`](docs/specs/dify-marketplace-api.md)
- [`docs/specs/dify-plugin-manifest.md`](docs/specs/dify-plugin-manifest.md)
- [`docs/specs/plugin-daemon.md`](docs/specs/plugin-daemon.md)
- [`docs/specs/dsh-plugin-contract.md`](docs/specs/dsh-plugin-contract.md)
- [`docs/specs/middleware.md`](docs/specs/middleware.md)
- [`docs/specs/capability-mapping.md`](docs/specs/capability-mapping.md)

### Write frontend code

- [`docs/frontend/README.md`](docs/frontend/README.md) — Feature-Sliced Design for `src/client/`.

### Write backend code

- [`docs/backend/README.md`](docs/backend/README.md) — Domain-Driven Design for `src/host/`.

### Operations and quality

- [`docs/operations/README.md`](docs/operations/README.md)
- [`docs/quality/README.md`](docs/quality/README.md)
- [`docs/decisions/README.md`](docs/decisions/README.md)

## Language and quality rules

- All source code, comments, commit messages, and internal identifiers are English.
- User-facing copy lives in locale dictionaries (`en` / `zh`). No hardcoded UI strings.
- No redundant UI copy.
- No duplicated implementations.
- No fallback/clever bypass logic that hides a root cause.
- Durable secrets stay on the Host under `$DSH_HOME/dsh-dify-marketplace/`. Never put credentials in the client bundle.
- Do not iframe `marketplace.dify.ai` (`X-Frame-Options: DENY`).
- Do not ship `workspace:` dependency ranges. Do not publish under `@deepseek-ai`.
- Marketplace and daemon I/O use real HTTP. Do not mock those backends in integration or e2e tests.

## Frontend: Feature-Sliced Design (FSD)

Imports go only downward: `app` → `pages` → `widgets` → `features` → `entities` → `shared`. Each slice exposes a public API through `index.ts`.

The Settings page is presentation only. Mutations go through Host remotes or Host HTTP. The UI must show pending, rejected, disconnected, and failed states. Never report local optimistic success as durable.

## Backend: Domain-Driven Design (DDD)

- `domain/` — business rules. No frameworks, HTTP, or filesystem.
- `application/` — use cases. Depends on domain ports.
- `infrastructure/` — marketplace client, daemon client, vault, filesystem.
- `interfaces/` — webServer routes, tool registration, Cordis `apply`.

Dependencies point inward. Controllers stay thin.

## Self-evolution rule

After completing a task, update the documentation if the task changed product behavior, architecture, runtime configuration, testing gates, or coding conventions. Keep docs factual. Avoid future dates, day estimates, and speculative language.

## Commit conventions

Use Conventional Commits: `type(scope): subject`.
