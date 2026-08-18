# Install through official dify-plugin-daemon

## Status

Accepted

## Context

`.difypkg` plugins run as Python processes with a documented install/dispatch protocol.

## Decision

Use langgenius/dify-plugin-daemon as a sidecar. Reproduce `PluginInstaller` (upload → identifiers → poll tasks → dispatch). No in-process fake daemon.

## Consequences

Docker/Compose is required for install/invoke tests. Local Python 3.12/uv must match daemon runner metadata.

## Alternatives considered

Reimplementing a Python runner inside the Harness process — rejected: unsigned compatibility and security surface.

## References

`docs/specs/plugin-daemon.md`, daemon `http_server.go`, Dify `PluginInstaller`.
