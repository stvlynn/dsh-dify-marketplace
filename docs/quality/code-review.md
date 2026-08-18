# Code review

- Contracts come from Harness rc.7, live marketplace captures, or Dify/daemon source. New fields need a fixture or a citation.
- No `workspace:` ranges. No `@deepseek-ai` publish name.
- Client bundle must call `window.__ModuleLoader__.load` with package name `dsh-dify-marketplace`.
- Secrets stay Host-side.
- Docs update in the same change as behavior.
