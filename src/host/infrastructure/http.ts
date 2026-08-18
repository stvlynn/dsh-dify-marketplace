/**
 * Shared HTTP helpers for the two outbound clients.
 *
 * Both the marketplace and the daemon are remote systems that fail in ordinary
 * ways — timeouts, transient 5xx, connection resets — so retry and deadline
 * policy lives here once instead of in each call site.
 *
 * @module dsh-dify-marketplace/host/infrastructure/http
 */

import type { BridgeErrorCode } from '../../shared/contracts/bridge.ts'
import { DifyMarketplaceError } from '../domain/errors.ts'

/** Retry and deadline policy for one outbound request. */
export interface RequestPolicy {
  /** Per-attempt deadline in milliseconds. */
  timeoutMs: number
  /** Attempts after the first. Zero disables retry. */
  retries: number
  /** Base delay for exponential backoff, in milliseconds. */
  backoffMs: number
}

/** Default policy: one retry pair, short backoff, 30s per attempt. */
export const DEFAULT_POLICY: RequestPolicy = { timeoutMs: 30_000, retries: 2, backoffMs: 400 }

/** Options for {@link requestWithRetry}. */
export interface RequestOptions extends RequestInit {
  policy?: Partial<RequestPolicy>
  /** Error code used when every attempt fails. */
  failureCode: BridgeErrorCode
  /** Caller cancellation, composed with the per-attempt deadline. */
  signal?: AbortSignal | undefined
}

/** Statuses worth retrying: transient server and rate-limit responses. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

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
export async function requestWithRetry(url: string, options: RequestOptions): Promise<Response> {
  const policy = { ...DEFAULT_POLICY, ...options.policy }
  const { policy: _policy, failureCode, signal: callerSignal, ...init } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= policy.retries; attempt += 1) {
    if (callerSignal?.aborted === true) {
      throw new DifyMarketplaceError(failureCode, `request to ${url} was cancelled`)
    }
    const timeout = AbortSignal.timeout(policy.timeoutMs)
    const signal = callerSignal === undefined ? timeout : AbortSignal.any([callerSignal, timeout])
    try {
      const response = await fetch(url, { ...init, signal })
      if (!RETRYABLE_STATUS.has(response.status) || attempt === policy.retries) return response
      lastError = new Error(`HTTP ${response.status}`)
      // Drain the retryable body so the socket can be reused.
      await response.arrayBuffer().catch(() => undefined)
    } catch (error) {
      lastError = error
      if (attempt === policy.retries) break
    }
    await delay(policy.backoffMs * 2 ** attempt)
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError)
  throw new DifyMarketplaceError(failureCode, `request to ${url} failed after ${policy.retries + 1} attempts: ${detail}`, {
    cause: lastError,
  })
}

/**
 * Read a JSON body, classifying a malformed payload as a client failure rather
 * than letting a `SyntaxError` escape.
 * @param response - the response to read.
 * @param failureCode - code used when the body is not JSON.
 * @returns the parsed body.
 */
export async function readJson<T>(response: Response, failureCode: BridgeErrorCode): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch (error) {
    const preview = text.slice(0, 200)
    throw new DifyMarketplaceError(failureCode, `expected JSON from ${response.url}, received: ${preview}`, {
      cause: error,
    })
  }
}

/** Sleep, used only for retry backoff. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}
