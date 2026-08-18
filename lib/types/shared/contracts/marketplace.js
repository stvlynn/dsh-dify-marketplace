/**
 * Dify Marketplace wire contract.
 *
 * Every type here is derived from live responses captured into
 * `fixtures/marketplace/` and reconciled with the manually maintained contract
 * in `langgenius/dify` at `packages/contracts/marketplace.ts`. Divergences
 * between the two are called out inline; the live payload wins, because that is
 * what the Host client actually parses.
 *
 * @module dsh-dify-marketplace/shared/contracts/marketplace
 */
/** Sort fields the search endpoint accepts. */
export const MARKETPLACE_SORT_FIELDS = ['install_count', 'version_updated_at', 'created_at'];
/**
 * Category filter values used by the marketplace tabs.
 *
 * Each value was probed against the live search endpoint rather than inferred
 * from the plugin manifest vocabulary, because the two differ: a manifest
 * declares its extension capability under `endpoint`, but the search filter only
 * matches `extension` (`endpoint` returns an empty page). `agent-strategy` must
 * be hyphenated for the same reason.
 */
export const MARKETPLACE_CATEGORY_FILTERS = {
    all: '',
    model: 'model',
    tool: 'tool',
    datasource: 'datasource',
    trigger: 'trigger',
    'agent-strategy': 'agent-strategy',
    extension: 'extension',
};
//# sourceMappingURL=marketplace.js.map