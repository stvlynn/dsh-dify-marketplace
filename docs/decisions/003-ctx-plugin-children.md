# Mount installed Dify plugins as ctx.plugin children

## Status

Accepted

## Context

Installed plugins must appear as standard DSH Loader rows, not a private catalog.

## Decision

`ctx.plugin(runtimeChild, config)` per install. Fiber id `dify:<org>/<name>`. Optional Include-based hot mount at runtime, following dsh-market, with visible failure if activation cannot complete.

## Consequences

Unload is fiber.dispose. Boot rehydrates from durable state. Include is unpublished and must be imported from the running profile.

## Alternatives considered

A fake in-memory catalog — rejected: it would not show up in dump-config or interact with `ctx.tools` lifecycle.

## References

Cordis `registry.ts` `plugin()`, dsh-market `src/hot.ts`.
