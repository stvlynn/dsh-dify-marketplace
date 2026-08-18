# Import rules

- Downward only: `app` → `pages` → `widgets` → `features` → `entities` → `shared`.
- No cross-imports between sibling slices except through a lower layer.
- No Host Node modules in client files (`node:fs`, daemon client, vault).
- No value imports of `@deepseek-ai/dsh-*` except loader externals (`react`, `react/jsx-runtime`, `dsh-client-ui-primitives`). Type-only imports are erased and never reach the tsdown purity gate.
- Cross-plugin collaboration is Cordis services (`ctx.slots`, `ctx.locale`), not value imports.
