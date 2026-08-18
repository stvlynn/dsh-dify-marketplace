/**
 * Host-to-client bridge contract.
 *
 * The Web face never talks to marketplace.dify.ai or to the plugin daemon
 * directly: the browser cannot hold daemon credentials, and the marketplace
 * refuses cross-origin browser calls. Instead the Host registers loopback HTTP
 * routes on `ctx.webServer` and the client calls them same-origin, the pattern
 * the published DSH market plugins use.
 *
 * Every type in this file is shared verbatim by both faces, so a route change
 * cannot drift between them.
 *
 * @module dsh-dify-marketplace/shared/contracts/bridge
 */
/** Route prefix owned by this plugin on the Harness web server. */
export const BRIDGE_ROUTE_PREFIX = '/dify-marketplace/api';
/** Bridge routes, appended to {@link BRIDGE_ROUTE_PREFIX}. */
export const BRIDGE_ROUTES = {
    status: '/status',
    search: '/search',
    collections: '/collections',
    detail: '/detail',
    versions: '/versions',
    icon: '/icon',
    installed: '/installed',
    install: '/install',
    installTask: '/install-task',
    uninstall: '/uninstall',
    credentials: '/credentials',
    validateCredentials: '/credentials/validate',
};
/** Build the absolute bridge URL for one route. */
export function bridgeUrl(route) {
    return `${BRIDGE_ROUTE_PREFIX}${BRIDGE_ROUTES[route]}`;
}
//# sourceMappingURL=bridge.js.map