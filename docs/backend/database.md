# Persistence

No SQL database in v1. Durable state is JSON files under `$DSH_HOME/dsh-dify-marketplace/`.

- Install records: one file per `plugin_id`, rewritten atomically (write temp + rename).
- Credentials: separate directory, never mixed into install records.
- Daemon Postgres/Redis belong to the sidecar, not this plugin.
