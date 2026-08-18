# Application

Use cases orchestrate domain ports:

- Search marketplace / load collections / load detail / list versions
- Install / upgrade / uninstall
- Save credentials / validate credentials
- Invoke tool (and later model/endpoint/…)
- Rehydrate fibers on boot

A use case depends on ports (`MarketplacePort`, `DaemonPort`, `VaultPort`, `FiberPort`). It does not import `node:http` or gin paths.
