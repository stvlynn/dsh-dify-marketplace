# Project

dsh-dify-marketplace is an independently installable DeepSeek Harness plugin. It is not a Dify fork and not an official DeepSeek package.

## Goals

- Present Dify Marketplace inside DSH Settings as a first-class `settings.section`.
- Call the public marketplace HTTP API with browser-like headers.
- Install and invoke plugins through official `dify-plugin-daemon`.
- Mount each installed Dify plugin as a standard Cordis child fiber.

## Non-goals

- Listing on the third-party dsh.pub catalog in the first product cut (README describes the later submission steps).
- Impersonating `@deepseek-ai` or claiming official Dify/DeepSeek endorsement.
- Iframe of `https://marketplace.dify.ai`.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Package | `dsh-dify-marketplace`, `"type": "module"` | Independent Git plugin; reserved `@deepseek-ai` scope is not used |
| Host | Cordis `apply` + `inject: ['tools','webServer']` | Inspected on Harness rc.7 |
| Client | tsdown `__ModuleLoader__` factory bundle | Required by client-modules on rc.7 |
| UI slot | `settings.section` id `dify-marketplace` | Proven by dsh-market |
| Marketplace | `https://marketplace.dify.ai/api/v1/*` | Live capture + Dify `marketplace.ts` |
| Runtime | langgenius/dify-plugin-daemon | Official install/dispatch path |

## Documents

- [`architecture.md`](architecture.md)
