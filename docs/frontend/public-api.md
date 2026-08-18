# Public API

Each slice exports only through `index.ts`. Importers depend on that barrel, not on `ui/Button.tsx` inside the slice.

`src/client/index.ts` is the Cordis client module public API (`name`, `inject`, `apply`). It must not re-export Host types.
