# Install, disable, uninstall

This plugin is a Git-root DSH bundle. It is not published under `@deepseek-ai`.

## Add

```sh
dsh plugin --profile web add ./
dsh --profile web --dump-config
```

Confirm a bundle layer for `dsh-dify-marketplace` and a row id `dsh-dify-marketplace`.

From a public commit:

```sh
dsh plugin --profile web add github:<owner>/dsh-dify-marketplace#<40-character-commit>
```

## Activate

```sh
dsh --profile web
```

Open Settings. The Dify Marketplace section exists only in Web-capable profiles.

## Daemon

Either start `deploy/plugin-daemon` Compose or set `daemonBaseUrl`, `daemonServerKey`, and `daemonTenantId` on the Cordis row.

## Disable

Remove or comment the insert row in the profile patch, or uninstall the bundle with `dsh plugin`. Individual Dify plugins uninstall from the Settings section.

## Uninstall the marketplace plugin

`dsh plugin --profile web` remove / unlink this package, then delete `$DSH_HOME/storages/dify-marketplace/` if you also want local state and credentials gone.

## dsh.pub

dsh.pub is a third-party plugin catalog, not an official DeepSeek Harness site. First-version listing is out of scope for v1. Submission later follows https://dsh.pub/en/submit/ without claiming security review.
