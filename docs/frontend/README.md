# Frontend

The Settings micro-frontend uses **Feature-Sliced Design** under `src/client/`.

## Documents

- [`fsd-overview.md`](fsd-overview.md)
- [`layers.md`](layers.md)
- [`slices.md`](slices.md)
- [`segments.md`](segments.md)
- [`public-api.md`](public-api.md)
- [`import-rules.md`](import-rules.md)
- [`ui-patterns.md`](ui-patterns.md)

## DSH constraints

- Entry is `src/client/index.ts`, bundled by tsdown into `lib/client.js`.
- Register UI through `ctx.slots`, not by patching DOM.
- Slot: `settings.section` id `dify-marketplace`.
- Copy in `en` / `zh` dictionaries. Dify payloads are i18n objects (`en_US`, `zh_Hans`, …).
- Primitives come from `@deepseek-ai/dsh-client-ui-primitives` (loader external). Guard missing exports like dsh-market `REQUIRED_PRIMITIVES`.
