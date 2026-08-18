# Infrastructure

Implements domain ports:

- Marketplace HTTP client (`X-Dify-Version` + browser UA). Follow 302/307. Never log signed R2 URLs.
- Daemon HTTP client (`SERVER_KEY`, tenant id). Multipart upload. Task polling.
- Filesystem state under `$DSH_HOME/storages/dify-marketplace/`.
- Credential vault (file per plugin, mode 0600).
- Cordis `ctx.plugin` / Include adapter.
