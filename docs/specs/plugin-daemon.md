# Dify plugin daemon

Inspected from [langgenius/dify-plugin-daemon](https://github.com/langgenius/dify-plugin-daemon) `internal/server/http_server.go` + generated `http_server.gen.go`, and Dify `PluginInstaller` in `api/core/plugin/impl/plugin.py`.

Latest daemon release tag at inspection: `0.6.10`. Default branch commit inspected via GitHub contents API (not a local clone of the daemon).

All plugin management and dispatch routes sit under `/plugin/:tenant_id` and require `CheckingKey(config.ServerKey)` (`SERVER_KEY`).

## Health and misc

| Method | Path | Notes |
|---|---|---|
| GET | `/health/check` | |
| GET | `/metrics/` | When Prometheus enabled |
| GET | `/e/:hook_id/*path` plus HEAD/POST/PUT/DELETE/OPTIONS | Endpoint proxy when `PluginEndpointEnabled` |
| POST | `/backwards-invocation/transaction` | Serverless platform only |
| GET | `/debug/pprof/*` | When PPROF enabled, keyed |
| POST | `/admin/plugin/serverless/*` | When admin API enabled |

## Management (`/plugin/:tenant_id/management`)

Mapped 1:1 from `pluginManagementGroup` and `PluginInstaller` methods:

| Method | Path | PluginInstaller |
|---|---|---|
| POST | `/install/upload/package` | `upload_pkg` multipart `dify_pkg` |
| POST | `/install/upload/bundle` | `upload_bundle` |
| POST | `/install/identifiers` | `install_from_identifiers` JSON `plugin_unique_identifiers`, `source`, `metas` |
| POST | `/install/upgrade` | `upgrade_plugin` |
| GET | `/install/tasks/:id` | `fetch_plugin_installation_task` |
| GET | `/install/tasks` | `fetch_plugin_installation_tasks` |
| POST | `/install/tasks/delete_all` | `delete_all_plugin_installation_task_items` |
| POST | `/install/tasks/:id/delete` | `delete_plugin_installation_task` |
| POST | `/install/tasks/:id/delete/*identifier` | `delete_plugin_installation_task_item` |
| GET | `/decode/from_identifier` | `decode_plugin_from_identifier` |
| GET | `/fetch/manifest` | `fetch_plugin_manifest` |
| GET | `/fetch/identifier` | `fetch_plugin_by_identifier` |
| GET | `/fetch/readme` | `fetch_plugin_readme` |
| POST | `/uninstall` | `uninstall` JSON `plugin_installation_id` |
| GET | `/list` | `list_plugins` / `list_plugins_with_total` |
| GET | `/installation/ids` | `list_installed_plugin_ids` |
| GET | `/:category/list` | `list_plugins_by_category` |
| POST | `/installation/fetch/batch` | `fetch_plugin_installation_by_ids` |
| POST | `/installation/missing` | `fetch_missing_dependencies` |
| GET | `/models`, `/models/bindings` | |
| GET | `/tools`, `/tool` | |
| POST | `/tools/check_existence` | `check_tools_existence` |
| GET | `/triggers`, `/trigger` | |
| GET | `/agent_strategies`, `/agent_strategy` | |
| GET | `/datasources`, `/datasource` | |

## Endpoint management (`/plugin/:tenant_id/endpoint`)

POST `/setup`, `/remove`, `/update`, `/enable`, `/disable`; GET `/list`, `/list/plugin`.

## Assets

GET `/plugin/:tenant_id/asset/:id`, GET `/plugin/:tenant_id/extract-asset/`.

## Dispatch (`/plugin/:tenant_id/dispatch`)

From `pluginDispatchGroup` + `setupGeneratedRoutes`:

| POST path |
|---|
| `/agent_strategy/invoke` |
| `/model/polling/start`, `/model/polling/check` |
| `/tool/invoke`, `/tool/validate_credentials`, `/tool/get_runtime_parameters` |
| `/llm/invoke`, `/llm/num_tokens` |
| `/text_embedding/invoke`, `/text_embedding/num_tokens` |
| `/multimodal_embedding/invoke` |
| `/rerank/invoke`, `/multimodal_rerank/invoke` |
| `/tts/invoke`, `/tts/model/voices` |
| `/speech2text/invoke` |
| `/moderation/invoke` |
| `/model/validate_provider_credentials`, `/model/validate_model_credentials`, `/model/schema` |
| `/oauth/get_authorization_url`, `/oauth/get_credentials`, `/oauth/refresh_credentials` |
| `/dynamic_select/fetch_parameter_options` |
| `/datasource/validate_credentials`, `/datasource/get_website_crawl`, `/datasource/get_online_document_pages`, `/datasource/get_online_document_page_content`, `/datasource/online_drive_browse_files`, `/datasource/online_drive_download_file` |
| `/trigger/invoke_event`, `/trigger/validate_credentials`, `/trigger/dispatch_event`, `/trigger/subscribe`, `/trigger/unsubscribe`, `/trigger/refresh` |

Duplicate dispatch tree exists under `/v2/invoke/dispatch` with `FetchPluginDirect`.

## Backwards invocation

Daemon plugins call back into the host through `BackwardsInvocation` (`internal/core/dify_invocation`). Invoke types in `types.go`:

`llm`, `llm_structured_output`, `text_embedding`, `multimodal_embedding`, `rerank`, `multimodal_rerank`, `tts`, `speech2text`, `moderation`, `tool`, `node_parameter_extractor`, `node_question_classifier`, `app`, `storage`, `encrypt`, `system_summary`, `upload_file`, `fetch_app`.

Local/remote runtimes multiplex this over the session stream. HTTP `POST /backwards-invocation/transaction` is the serverless platform path only.

Which HTTP URLs a **local** daemon uses to reach Dify (or this middleware) is owned by `dify_invocation` implementations (`calldify`). Phase 2 must read that package before implementing the adapter. Fail closed when a required DSH service is missing.

## Sidecar

Ship Compose matching daemon `.env.example` (Postgres, Redis, Python/uv). Host either supervises Compose or attaches with `daemonBaseUrl` + `serverKey` + `tenantId`. No in-process fake daemon.
