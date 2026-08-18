# Domain

Business rules with no HTTP, filesystem, or Cordis imports.

## Types

- `PluginId` (`org/name`), `UniqueIdentifier` (`org/name:version@checksum`)
- `InstallRecord`, `CredentialRef`, `DifyCategory`
- Errors: identifier parse, unsupported category, missing required DSH service

## Invariants

- A fiber id is `dify:<org>/<name>` and is stable across upgrades of the same plugin.
- Credentials never appear on a domain event payload that the client may read.
- Uninstall without a matching install record is a domain error, not a no-op that reports success.
