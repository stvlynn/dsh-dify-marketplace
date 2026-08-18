# Capability mapping

Each installed Dify plugin is a standard DSH Loader child. Adapters call daemon dispatch; they are not stubs.

Implementation order: **tools → models → endpoints → agent-strategy → datasource → trigger**.

| Dify category | Live `category` string | DSH surface | Daemon |
|---|---|---|---|
| tool | `tool` | `ctx.tools.register` as `dify__<org>__<plugin>__<tool>` | `POST .../dispatch/tool/invoke` plus `validate_credentials` |
| model | `model` | `ctx.llm.registerAdapter` / `registerConfigurableProviders` | `POST .../dispatch/llm/invoke` and sibling model routes; credential validate |
| extension | `extension` (collection condition `category=endpoint`) | Host `webServer` proxy modeled on daemon `/e/:hook_id` | endpoint setup/enable/disable + `/e/:hook_id/*` |
| agent-strategy | `agent-strategy` (UI label "Agent") | Tool/pipeline extension; no dedicated rc.7 slot named agent-strategy | `POST .../dispatch/agent_strategy/invoke` |
| datasource | `datasource` | Knowledge/fs or dedicated tools | datasource dispatch routes |
| trigger | `trigger` | Host webhook + session bridge | trigger subscribe/dispatch/invoke_event |

## Tools

Mandatory `ToolDefinition.output` (`schema` + `render`). Map marketplace `tool.tools[].parameters` onto JSON Schema. Credentials stay on the Host and are sent to daemon invoke, not to the model.

## Models

There is no `settings.models` slot to occupy. Register an adapter that streams daemon LLM chunks into Harness `StreamChunk`. Settings UI for API keys uses this plugin's own section (or a `settings.plugin.item` card), not a patch of the shipped Models page.

Whether `registerConfigurableProviders` can describe a Dify-backed provider without forking ui-settings-models is an open question.

## Endpoints

Daemon serves plugin HTTP at `/e/:hook_id/*path`. Middleware allocates a DSH `webServer` prefix and forwards. Duplicate DSH paths throw (webServer contract).

## Backwards invocation

If a Dify plugin calls LLM/tools/app, implement the subset of `BackwardsInvocation` types actually required by installed plugins. Forward to `ctx.llm` / `ctx.tools`. Fail closed when the DSH service is missing.

## Bundles

Marketplace `POST /bundles/search/advanced` returned zero bundles in the live capture. Bundle install uses daemon `install/upload/bundle`. Product UI still shows the Bundles tab.
