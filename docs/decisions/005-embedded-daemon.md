# Daemon stays external; plugin may supervise it later

## Status

Accepted

## Context

Installing the marketplace plugin today requires the user to separately start the `deploy/plugin-daemon` Compose stack (Postgres + Redis + daemon). We researched whether `dsh plugin add` could instead leave the daemon installed and managed inside this plugin.

Findings from dify-plugin-daemon 0.6.10 sources and releases:

- The GitHub release binaries (`dify-plugin-*`) are the plugin dev CLI, not the server. The daemon server (`cmd/server`) ships only as the Docker image `langgenius/dify-plugin-daemon:*-local`. Self-building for darwin/linux is possible (pure Go, CGO_ENABLED=0) but unofficial.
- PostgreSQL (or MySQL) is mandatory — `internal/db/init.go` panics on any other `DB_TYPE`; there is no SQLite path.
- Redis is mandatory — the manager pings it at startup and panics on failure; used for cluster coordination, locks, and plugin state. No disable switch.
- Running local plugins requires Python ≥ 3.11 and `uv` on the host; the daemon builds a per-plugin venv at launch (`uv venv` + `uv sync`).
- The `dify-plugin-slim` binary has a local mode without DB/Redis, but it only invokes one already-installed plugin one-shot. It exposes no install/management API, so it cannot back the marketplace install flow.
- Cordis places no sandbox restrictions on the Host: the plugin could spawn and supervise processes from `apply`, with teardown via `ctx.effect` disposers. `$DSH_HOME/storages/dify-marketplace/` is the established data directory.

## Decision

Keep the daemon as an external sidecar for v1. The existing `daemonConfigured()` seam (`daemonBaseUrl`/`daemonServerKey`/`daemonTenantId`) already supports a degraded mode when the daemon is absent.

A later "managed sidecar" enhancement may let the plugin run `docker compose up -d` on `deploy/plugin-daemon` at `apply` time and stop it on dispose. That removes the manual step but keeps Docker as the delivery mechanism. Shipping self-built daemon binaries plus plugin-managed Postgres/Redis/Python is rejected.

## Consequences

- Users still need Docker (or an externally provisioned daemon) for install/invoke; marketplace browsing works without it.
- No multi-hundred-MB binary downloads, no unsigned Go builds, no embedded database lifecycle to support on user machines.
- If managed sidecar is added later, `DIFY_INNER_API_URL` and `innerApiKey` wiring must move from Compose env into plugin-generated daemon env, and the generated `SERVER_KEY` must be persisted under `$DSH_HOME/storages/dify-marketplace/`.

## Alternatives considered

- Bundle self-built `cmd/server` binaries per platform and manage Postgres/Redis as child processes — rejected: unofficial build surface, two stateful services to embed, Python/uv bootstrap still required, large downloads.
- Use `dify-plugin-slim` local mode — rejected: no management/install API, Linux-only release assets.
- Ship an all-in-one Docker image — rejected: same Docker requirement as Compose with more maintenance.

## References

`docs/specs/plugin-daemon.md`, [dify-plugin-daemon 0.6.10 release](https://github.com/langgenius/dify-plugin-daemon/releases/tag/0.6.10), `internal/db/init.go`, `internal/core/plugin_manager/manager.go`, `internal/core/local_runtime/setup_python_environment.go`, `deploy/plugin-daemon/docker-compose.yml`.
