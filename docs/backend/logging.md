# Logging

- Use Cordis `ctx.logger` when present.
- Never log API keys, `SERVER_KEY`, vault contents, or signed download URLs.
- Marketplace `x-trace-id` may be logged on failed HTTP to aid debugging.
- Daemon task ids are safe to log.
