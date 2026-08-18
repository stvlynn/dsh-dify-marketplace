# Namespacing Dify tools and fibers

## Status

Accepted

## Context

Many Dify plugins expose a tool named `search` or similar. MCP client already namespaces as `mcp__server__tool`.

## Decision

Public tool names: `dify__<org>__<plugin>__<tool>` after `[A-Za-z0-9_]` normalization. Fiber ids: `dify:<org>/<name>`. Package name on the Loader row stays `dsh-dify-marketplace`.

## Consequences

Models see unique names. Collisions with other plugins using the `dify__` prefix are still possible; treat as an install-time error.

## Alternatives considered

Raw Dify tool names — rejected: collisions. MCP-style `mcp__` prefix — rejected: these are not MCP servers.
