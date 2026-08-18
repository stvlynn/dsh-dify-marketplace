# UI patterns

- Semantic styling. Prefer primitives from `@deepseek-ai/dsh-client-ui-primitives`.
- No hardcoded user-facing strings. Use locale dictionaries.
- No redundant copy that repeats a title, icon, or selected state.
- Pending, rejected, disconnected, and failed mutations are visible. Never paint "installed" from a local guess.
- Dify `label` / `brief` objects are keyed `en_US` / `zh_Hans`. Map them through the active locale with English fallback.
