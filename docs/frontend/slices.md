# Slices

A slice is one domain topic inside a layer (for example `features/install`, `entities/plugin`).

- One slice, one public `index.ts`.
- Do not import another slice's internals.
- Split a slice when two teams would otherwise edit the same files for unrelated reasons.
