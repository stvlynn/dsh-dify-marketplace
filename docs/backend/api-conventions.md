# API conventions (Host loopback)

JSON responses from this plugin's webServer routes:

```ts
{ ok: true, data: T } | { ok: false, error: { code: string, message: string } }
```

Do not copy the marketplace `{code,msg,data}` envelope onto DSH loopback routes.

- Same-origin only for mutating routes (see dsh-market `sameOrigin`).
- No secrets in responses. Credential submit is write-only; reads return schema + "configured" booleans.
- Errors use stable codes: `MARKETPLACE_HTTP`, `DAEMON_HTTP`, `INSTALL_FAILED`, `NOT_INSTALLED`, `MISSING_SERVICE`.
