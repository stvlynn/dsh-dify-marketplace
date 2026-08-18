# Plugin daemon sidecar

Compose matching [dify-plugin-daemon 0.6.10](https://github.com/langgenius/dify-plugin-daemon) `.env.example` and the Dify docker service `plugin_daemon` (`langgenius/dify-plugin-daemon:0.6.10-local`).

```sh
pnpm daemon:up
pnpm daemon:down
```

The Host attaches with:

| Config | Compose default |
|---|---|
| `daemonBaseUrl` | `http://127.0.0.1:5002` |
| `daemonServerKey` | `SERVER_KEY` in `.env` |
| `daemonTenantId` | `00000000-0000-0000-0000-000000000001` |
| `innerApiKey` | `DIFY_INNER_API_KEY` |

`DIFY_INNER_API_URL` must point at the Harness web origin plus `/dify-marketplace`, because the daemon client prepends `/inner/api`. Example: `http://host.docker.internal:5714/dify-marketplace`.

`FORCE_VERIFYING_SIGNATURE` defaults to `false` in this sidecar so a locally packaged fixture `.difypkg` can be installed. Set it to `true` when only marketplace-signed packages should be accepted.

These keys are local-development values, not production secrets. Replace them before exposing the daemon beyond loopback.
