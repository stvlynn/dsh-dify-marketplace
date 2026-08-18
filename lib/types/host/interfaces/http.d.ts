/**
 * Small HTTP helpers for Host `webServer` handlers.
 *
 * @module dsh-dify-marketplace/host/interfaces/http
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BridgeErrorCode } from '../../shared/contracts/bridge.ts';
/**
 * Read the full request body as JSON.
 * @param req - incoming request.
 */
export declare function readJsonBody(req: IncomingMessage): Promise<unknown>;
/**
 * Read a query parameter.
 * @param req - incoming request.
 * @param name - parameter name.
 */
export declare function queryParam(req: IncomingMessage, name: string): string | undefined;
/** Write a JSON response. */
export declare function sendJson(res: ServerResponse, status: number, body: unknown): void;
/** Write a classified error. */
export declare function sendError(res: ServerResponse, error: unknown, fallback: BridgeErrorCode): void;
/**
 * Wrap an async handler so rejections become classified JSON.
 * @param fallback - error code when the thrown value is unclassified.
 * @param handler - async work.
 */
export declare function handle(fallback: BridgeErrorCode, handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>): (req: IncomingMessage, res: ServerResponse) => void;
/** Require a string field on a JSON body. */
export declare function requireString(body: unknown, field: string): string;
//# sourceMappingURL=http.d.ts.map