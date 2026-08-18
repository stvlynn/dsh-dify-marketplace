# Interfaces

Adapters facing the outside:

- Cordis `apply` / `inject`
- `ctx.webServer` route handlers (same-origin, JSON)
- `ctx.tools.register` wrappers
- Optional nested `ctx.llm` registration
- Backwards-invocation HTTP if the local daemon requires it

Keep handlers thin: parse, call a use case, serialize. Validate at the boundary.
