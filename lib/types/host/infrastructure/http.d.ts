/**
 * Shared HTTP helpers for the two outbound clients.
 *
 * Both the marketplace and the daemon are remote systems that fail in ordinary
 * ways — timeouts, transient 5xx, connection resets — so retry and deadline
 * policy lives here once instead of in each call site.
 *
 * @module dsh-dify-marketplace/host/infrastructure/http
 */
import type { BridgeErrorCode } from '../../shared/contracts/bridge.ts';
/** Retry and deadline policy for one outbound request. */
export interface RequestPolicy {
    /** Per-attempt deadline in milliseconds. */
    timeoutMs: number;
    /** Attempts after the first. Zero disables retry. */
    retries: number;
    /** Base delay for exponential backoff, in milliseconds. */
    backoffMs: number;
}
/** Default policy: one retry pair, short backoff, 30s per attempt. */
export declare const DEFAULT_POLICY: RequestPolicy;
/** Options for {@link requestWithRetry}. */
export interface RequestOptions extends RequestInit {
    policy?: Partial<RequestPolicy>;
    /** Error code used when every attempt fails. */
    failureCode: BridgeErrorCode;
    /** Caller cancellation, composed with the per-attempt deadline. */
    signal?: AbortSignal | undefined;
}
/**
 * Perform one HTTP request with deadline and bounded retry.
 *
 * A non-retryable status is returned to the caller rather than thrown, because
 * both clients need the body of a 4xx to classify it.
 * @param url - absolute request URL.
 * @param options - fetch options plus policy and failure classification.
 * @returns the response of the first attempt that is not retryable.
 * @throws DifyMarketplaceError when every attempt fails to produce a response.
 */
export declare function requestWithRetry(url: string, options: RequestOptions): Promise<Response>;
/**
 * Read a JSON body, classifying a malformed payload as a client failure rather
 * than letting a `SyntaxError` escape.
 * @param response - the response to read.
 * @param failureCode - code used when the body is not JSON.
 * @returns the parsed body.
 */
export declare function readJson<T>(response: Response, failureCode: BridgeErrorCode): Promise<T>;
//# sourceMappingURL=http.d.ts.map