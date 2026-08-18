# FSD overview

Feature-Sliced Design organizes UI by **scope of change**. A feature contains the UI, state, and API that belong to one user scenario so changes do not leak across unrelated files.

This plugin applies FSD only to `src/client/`. The Host is DDD (`src/host/`).
