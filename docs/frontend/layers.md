# Layers

FSD uses six layers. Imports go only downward:

`app` → `pages` → `widgets` → `features` → `entities` → `shared`

## `app`

Plugin `apply`, locale registration, slot injection. No business logic.

## `pages`

The Marketplace section page: tab chrome, routing between list and detail. Thin. No HTTP.

## `widgets`

Search bar, collection carousel, plugin card grid, credential form chrome.

## `features`

Search, install, uninstall, credential submit. Own the Host HTTP calls and pending/failed state.

## `entities`

Plugin, collection, version, unique identifier. Types and pure functions. No UI, no fetch.

## `shared`

i18n helpers, HTTP client wrappers, UI primitives wrappers, constants (`MARKETPLACE_TABS`).
