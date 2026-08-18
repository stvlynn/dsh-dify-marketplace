# Marketplace fixtures

Sanitized live captures of `https://marketplace.dify.ai`. Nothing here is
hand-written: every file is the recorded result of a real request.

## How they were taken

- `homepage.json`, `ia.json`, `playwright-ia.json` record the site's information
  architecture. Playwright Chromium opened the homepage (HTTP 200, title
  `Dify Marketplace`) and read the tab list the Web UI has to reproduce:
  All, Models, Tools, Data Sources, Agent, Triggers, Extensions, Bundles.
- Every other file is an API capture written by `scripts/capture-marketplace.mjs`
  (`npm run capture:marketplace`), which is also the script that regenerates
  them. `index.json` lists each capture with the status it returned.

The marketplace sits behind Cloudflare. Anonymous requests that send no
browser-shaped `User-Agent` are answered with 403, so the capture script and the
Host client both send one, plus `X-Dify-Version`. The page itself cannot be
embedded: it answers with `X-Frame-Options: DENY`, which is why the Web face
reproduces the marketplace UI instead of framing it.

## Capture envelope

API captures share one shape, so a fixture documents the request that produced
it as well as the response:

```json
{
  "request": { "method": "POST", "path": "/api/v1/...", "headers": {}, "body": {} },
  "response": { "status": 200, "contentType": "application/json", "body": {} }
}
```

## Facts these captures establish

- Successful JSON is wrapped in `{ code, data, msg }` with `code: 0`.
- A missing plugin answers HTTP 404, and `/stats/plugins/install_count` rejects
  an unknown identifier with HTTP 400 — both with `code: -1` and
  `msg: "plugin not found"`. Status alone is not a sufficient success test, and
  neither is `code` alone.
- The Extensions tab filters on `category: "extension"`. `endpoint` returns an
  empty page even though a plugin manifest spells the same capability
  `endpoint`, and `agent-strategy` must be hyphenated.
- `unique_identifier` is `<org>/<name>:<version>@<sha256>` and equals
  `<plugin_tuple>@<checksum>`.
- `download-url` answers HTTP 302 with a presigned object-storage URL rather
  than package bytes.
- `bundles/search/advanced` and `dist/plugins/manifest.json` currently return
  empty results (`total: 0`, `plugin_count: 0`). Recorded as observed; the Web
  UI must render an empty Bundles tab without treating it as an error.

## Sanitization

- Presigned object-storage query parameters are redacted; they expire anyway.
- Binary bodies (icons, packages) are not stored — only status, content type,
  and byte length.
- The plugin list in the global manifest snapshot is truncated to three entries.

## Do not

- Invent or hand-edit payloads. Re-run the capture script instead.
- POST `/stats/plugins/install_count` with a real identifier from tests; the
  capture deliberately uses an invalid one so no counter is incremented.
- Commit live signatures or credentials.
