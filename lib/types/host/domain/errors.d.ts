/**
 * Failure taxonomy. Every outward-facing failure in this plugin is one
 * {@link DifyMarketplaceError} carrying a {@link BridgeErrorCode}, so the Web UI
 * and the model-facing tools present the same classification and neither has to
 * pattern-match on message text.
 *
 * @module dsh-dify-marketplace/host/domain/errors
 */
import type { BridgeError, BridgeErrorCode } from '../../shared/contracts/bridge.ts';
/** A classified failure with an operator-facing detail string. */
export declare class DifyMarketplaceError extends Error {
    readonly code: BridgeErrorCode;
    /** HTTP status the bridge answers with. */
    readonly status: number;
    constructor(code: BridgeErrorCode, detail: string, options?: {
        status?: number;
        cause?: unknown;
    });
    /** Project onto the wire shape the bridge returns. */
    toBridgeError(): BridgeError;
}
/**
 * Coerce an unknown thrown value into a classified error.
 * @param error - the caught value.
 * @param fallback - code to use when the value carries no classification.
 * @returns a classified error.
 */
export declare function asMarketplaceError(error: unknown, fallback: BridgeErrorCode): DifyMarketplaceError;
//# sourceMappingURL=errors.d.ts.map