# E2E

Playwright config lives at `/playwright.config.ts`.

- `pnpm test:e2e` — live `marketplace.dify.ai` information architecture (`e2e/marketplace-ia.spec.ts`).
- `DSH_WEB_URL=... pnpm test:e2e:dsh` — Settings section against a running Harness web profile (`e2e/dsh-settings.spec.ts`).
