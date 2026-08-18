# Dify plugin manifest

Source: [Dify Manifest](https://docs.dify.ai/en/develop-plugin/features-and-specs/plugin-types/plugin-info-by-manifest) and the Google tool plugin example linked from that page.

The plugin package is a `.difypkg` (zip). Marketplace `unique_identifier` points at one versioned package.

## `manifest.yaml`

| Field | Meaning |
|---|---|
| `version` | Plugin version |
| `type` | Currently `plugin`. Bundle support is documented as planned |
| `author` | Organization name in the Marketplace |
| `name` | Plugin name |
| `label` | Multilingual display name |
| `created_at` | RFC3339. Marketplace requires it not later than now |
| `icon` | Path inside the package |
| `resource.memory` | Max memory bytes (Lambda-related on Dify Cloud) |
| `resource.permission.tool.enabled` | Reverse-invoke tools |
| `resource.permission.model.*` | Reverse-invoke models (`llm`, embedding, rerank, tts, speech2text, moderation) |
| `resource.permission.endpoint.enabled` | Register HTTP endpoints |
| `resource.permission.app.enabled` | Reverse-invoke apps |
| `resource.permission.storage` | Persistent storage + size |
| `plugins.tools` / `models` / `endpoints` / agent-strategy | YAML paths inside the package |
| `meta.version` | Manifest format version (`0.0.1` initial) |
| `meta.arch` | `amd64`, `arm64` |
| `meta.runner` | `language: python`, `version: "3.12"`, `entrypoint: main` |
| `privacy` | Path or URL. Required for Marketplace listing |

Illegal combinations documented by Dify: tools+models together, models+endpoints together, or no extensions. Each extension type supports one provider in the current rules.

Marketplace list/detail `plugins` object mirrors those lists (`tools`, `models`, `endpoints`, `agent_strategies`, `datasources`, `triggers`).

## Relation to daemon install

Upload of the `.difypkg` is `POST /plugin/:tenant/management/install/upload/package` (multipart field `dify_pkg`). The daemon decodes the package and returns the unique identifier used in `install/identifiers`.
