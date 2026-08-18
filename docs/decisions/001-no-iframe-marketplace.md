# Do not iframe marketplace.dify.ai

## Status

Accepted

## Context

A micro-frontend could have been an iframe of the official Marketplace.

## Decision

Call the public HTTP API and render our own Settings UI.

## Consequences

We own IA, i18n, and install UX. We must track API drift with fixtures.

## Alternatives considered

Iframe — rejected: live responses include `X-Frame-Options: DENY`.

## References

`fixtures/marketplace/homepage.json`, `docs/specs/dify-marketplace-api.md`.
