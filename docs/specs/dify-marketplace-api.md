# Dify Marketplace HTTP API

Origin: `https://marketplace.dify.ai`. Homepage and JSON APIs send `X-Frame-Options: DENY`. Do not iframe the site.

Sources:

- Live capture in [`fixtures/marketplace/`](../../fixtures/marketplace/) (Playwright Chromium page + API, curl for bodies).
- [packages/contracts/marketplace.ts](https://github.com/langgenius/dify/blob/main/packages/contracts/marketplace.ts)
- [api/core/helper/marketplace.py](https://github.com/langgenius/dify/blob/main/api/core/helper/marketplace.py)
- Dify web `web/service/plugins.ts`, `web/app/components/plugins/marketplace/utils.ts`

## Headers

Anonymous Python urllib was Cloudflare 403. These headers succeed:

| Header | Value used in capture |
|---|---|
| `User-Agent` | Chrome 131 Macintosh Mozilla string |
| `X-Dify-Version` | `999.0.0` (Dify web marketplace client when `IS_MARKETPLACE`; Dify API uses `dify_config.project.version`) |
| `Accept` | `application/json` for API |
| `Content-Type` | `application/json` on POST |

## Envelope

Live JSON (except the dist snapshot) uses:

```ts
{ code: number, data: T, msg: string }
```

Success is `code: 0`, `msg: "ok"`. Failure example (`POST /stats/plugins/install_count` with a fake identifier): `code: -1`, `data: null`, `msg: "plugin not found"`.

`packages/contracts/marketplace.ts` types inner `data` shapes and does not declare this envelope.

## unique_identifier

Live versions and list cards use:

```text
org/name:version@<sha256 hex>
```

Example: `langgenius/tongyi:0.2.13@76feba79a09357673e1ebe24f1ec98123062d3f3198abe08551804def1fcd020`.

`plugin_tuple` on a version row is `org/name:version` without the checksum.

## Endpoints

Base path `/api/v1`.

### POST `/plugins/search/advanced`

Body used by Dify web (`getMarketplacePlugins`):

```json
{
  "page": 1,
  "page_size": 40,
  "query": "",
  "sort_by": "install_count",
  "sort_order": "DESC",
  "category": "",
  "tags": []
}
```

`category` is omitted or empty for All. Tab values: `model`, `tool`, `datasource`, `agent-strategy`, `trigger`, `extension`. Default sort is `install_count` / `DESC`.

Live list item fields (rc of capture): `type`, `org`, `name`, `plugin_id`, `icon`, `label`, `brief`, `category`, `repository`, `install_count`, `latest_version`, `latest_package_identifier`, `status`, `tags[]`, `badges`, `verification.authorized_category`, `plugins.{tools,models,...}`, `privacy_options`, `privacy_policy`, `index_id`, `version_updated_at`.

Fields in `marketplace.ts` but **absent** on live search cards: `version`, `verified`, `author`, `introduction`, `endpoint`, `from`, `description` (search uses `brief`).

### POST `/bundles/search/advanced`

Same body shape. Live capture returned `{ bundles: [], total: 0 }` with `code: 0`. The Bundles tab exists in the IA.

### GET `/collections?page=1&page_size=100`

Returns `{ collections: MarketplaceCollection[] }`. Live names: `partners`, `top20`, `search`, `image`, `featured`, `latest`, `data`. Extra live field: `priority`. `searchable` was `false` on captured rows. `rule` from `marketplace.ts` was **absent**.

Dify web only loads collections for All and Tools (`PLUGIN_CATEGORY_WITH_COLLECTIONS`).

### POST `/collections/{collectionId}/plugins`

Path uses collection `name` (example `partners`). Body is `CollectionsAndPluginsSearchParams` (`category`, `condition`, `exclude`, `type`). Empty body returns the collection's plugins.

### GET `/plugins/{org}/{name}`

Full plugin document under `data.plugin`. Includes `introduction` (markdown), `resource`, `plugins` file list, and category-specific objects:

- `tool.credentials_schema`, `tool.identity`, `tool.tools`, `tool.oauth_schema`
- `model` provider entity including `provider_credential_schema` / `model_credential_schema`
- `endpoint`, `agent_strategy`, `data_sources`, `triggers` (empty objects when unused)

Captured model example: `langgenius/tongyi`. Captured tool example: `langgenius/google` (`credentials_schema[0].type` = `secret-input`).

`marketplace.ts` `MarketplacePlugin` is a flattened list-card type and does not describe this detail document.

### GET `/plugins/{org}/{name}/versions?page=1&page_size=100`

`data.versions[]`: `plugin_org`, `plugin_name`, `version`, `plugin_tuple`, `change_log`, `checksum`, `created_at`, `unique_identifier`, `minimum_dify_version_*`, `status`.

`file_name` from Dify web `Version` type was **absent** on live rows.

### GET `/plugins/{org}/{name}/icon`

HTTP **307** to Cloudflare R2. Following the redirect yields the image (`image/png` for tongyi, `image/svg+xml` for google). Bundles use `/bundles/{org}/{name}/icon` (Dify `getPluginIconInMarketplace`).

### GET `/plugins/download-url?unique_identifier=`

HTTP **302** to R2 object `.../packages/{name}/versions/{version}.difypkg` with `response-content-type=application/zip`. Dify `get_plugin_pkg_url` uses this URL; `download_plugin_pkg` follows it. Do not persist signed query strings.

### GET `/plugins/identifier?unique_identifier=`

Dify `fetchManifestFromMarketPlace`. Live 200 JSON with plugin + version document (same family as detail).

### POST `/plugins/batch`

Body `{ "plugin_ids": ["org/name"] }`. Dify `batch_fetch_plugin_manifests`. Live 200 with `data.plugins`.

### GET `/dist/plugins/manifest.json`

Dify `fetch_global_plugin_manifest`. Live 200 `{ plugins: [], metadata: { snapshot_updated_at, plugin_count: 0 } }`. Snapshot was empty in this capture.

### POST `/stats/plugins/install_count`

Body `{ "unique_identifier": "..." }`. Dify `record_install_plugin_event` (no `X-Dify-Version` in that helper). Invalid identifier: 400 / `plugin not found`. Best-effort analytics; do not POST against real plugins from tests.

### GET `/bundles/{org}/{name}` and `/bundles/{org}/{name}/{version}`

Declared by Dify web (`fetchBundleInfoFromMarketPlace`). Not exercised with a live bundle because search returned zero bundles.

## Information architecture (live page)

Playwright Chromium loaded `https://marketplace.dify.ai/` (200, title `Dify Marketplace`). Visible tab labels:

`All` · `Models` · `Tools` · `Data Sources` · `Agent` · `Triggers` · `Extensions` · `Bundles`

Dify source maps UI "Agent" to category `agent-strategy`, and Extensions search `category` to `extension` while collection condition uses `category=endpoint`.

Tags are a client-side checklist (`tagKeys` in Dify `web/app/components/plugins/constants.ts`), passed as `tags: string[]` on search. There is no tags list HTTP API.

Search box + sort dropdown (`install_count` default) + collection carousels on All/Tools.

Detail is `/plugin/{org}/{name}` on the marketing site and `/plugins/{org}/{name}` on the API.

## Capture method

Playwright Chromium 140 loaded the document and JSON APIs (200). Request bodies and sanitized JSON were recorded with curl using the same User-Agent and `X-Dify-Version`. Signed R2 query strings are redacted in fixtures. Binary icons and `.difypkg` files are not stored.
