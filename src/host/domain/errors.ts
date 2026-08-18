/**
 * Failure taxonomy. Every outward-facing failure in this plugin is one
 * {@link DifyMarketplaceError} carrying a {@link BridgeErrorCode}, so the Web UI
 * and the model-facing tools present the same classification and neither has to
 * pattern-match on message text.
 *
 * @module dsh-dify-marketplace/host/domain/errors
 */

import type { BridgeError, BridgeErrorCode } from '../../shared/contracts/bridge.ts'

/** A classified failure with an operator-facing detail string. */
export class DifyMarketplaceError extends Error {
  readonly code: BridgeErrorCode
  /** HTTP status the bridge answers with. */
  readonly status: number

  constructor(code: BridgeErrorCode, detail: string, options: { status?: number, cause?: unknown } = {}) {
    super(detail, options.cause === undefined ? {} : { cause: options.cause })
    this.name = 'DifyMarketplaceError'
    this.code = code
    this.status = options.status ?? defaultStatus(code)
  }

  /** Project onto the wire shape the bridge returns. */
  toBridgeError(): BridgeError {
    return { code: this.code, detail: this.message }
  }
}

/** Map a code onto the HTTP status the bridge answers with. */
function defaultStatus(code: BridgeErrorCode): number {
  switch (code) {
    case 'bad_request':
      return 400
    case 'credentials_invalid':
      return 400
    case 'plugin_not_installed':
      return 404
    case 'capability_unsupported':
      return 501
    case 'daemon_unconfigured':
      return 503
    case 'daemon_unavailable':
    case 'marketplace_unavailable':
      return 502
    default:
      return 500
  }
}

/**
 * Coerce an unknown thrown value into a classified error.
 * @param error - the caught value.
 * @param fallback - code to use when the value carries no classification.
 * @returns a classified error.
 */
export function asMarketplaceError(error: unknown, fallback: BridgeErrorCode): DifyMarketplaceError {
  if (error instanceof DifyMarketplaceError) return error
  const detail = error instanceof Error ? error.message : String(error)
  return new DifyMarketplaceError(fallback, detail, { cause: error })
}
