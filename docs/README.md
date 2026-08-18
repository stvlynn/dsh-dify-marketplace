# Documentation

This directory is the source of truth for how this plugin is built and evolved.

## Domain map

- [`project/`](project/README.md) — overview, architecture, boundaries.
- [`specs/`](specs/dify-marketplace-api.md) — marketplace API, daemon, DSH contract, middleware, mapping.
- [`frontend/`](frontend/README.md) — Feature-Sliced Design for `src/client/`.
- [`backend/`](backend/README.md) — Domain-Driven Design for `src/host/`.
- [`operations/`](operations/README.md) — local development, daemon sidecar, `dsh plugin add`.
- [`quality/`](quality/README.md) — testing and review.
- [`decisions/`](decisions/README.md) — ADRs.

## How to use this documentation

1. Read [`project/README.md`](project/README.md) and [`project/architecture.md`](project/architecture.md).
2. Before writing client code, read [`frontend/README.md`](frontend/README.md) and [`specs/dsh-plugin-contract.md`](specs/dsh-plugin-contract.md).
3. Before writing Host code, read [`backend/README.md`](backend/README.md) and the specs for marketplace and daemon.
4. If you change behavior, architecture, or conventions, update the relevant doc in the same change set.
