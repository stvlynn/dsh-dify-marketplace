/**
 * Extension (endpoint) plugins are served through the Harness web server.
 *
 * The daemon exposes plugin HTTP at `/e/:hook_id/*`. This adapter registers a
 * prefix under `/dify-marketplace/e/<org>/<name>` and forwards.
 *
 * @module dsh-dify-marketplace/runtime/adapters/endpoint
 */
import type { CapabilityAdapter } from '../deps.ts';
/** Endpoint adapter. */
export declare const registerEndpointAdapter: CapabilityAdapter;
//# sourceMappingURL=endpoint.d.ts.map