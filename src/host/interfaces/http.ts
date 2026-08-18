/**
 * Small HTTP helpers for Host `webServer` handlers.
 *
 * @module dsh-dify-marketplace/host/interfaces/http
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { DifyMarketplaceError, asMarketplaceError } from '../domain/errors.ts'
import type { BridgeErrorCode } from '../../shared/contracts/bridge.ts'

/**
 * Read the full request body as JSON.
 * @param req - incoming request.
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new DifyMarketplaceError('bad_request', 'request body is not JSON', { cause: error })
  }
}

/**
 * Read a query parameter.
 * @param req - incoming request.
 * @param name - parameter name.
 */
export function queryParam(req: IncomingMessage, name: string): string | undefined {
  const url = new URL(req.url ?? '/', 'http://dsh.local')
  const value = url.searchParams.get(name)
  return value === null ? undefined : value
}

/** Write a JSON response. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = `${JSON.stringify(body)}\n`
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/** Write a classified error. */
export function sendError(res: ServerResponse, error: unknown, fallback: BridgeErrorCode): void {
  const classified = asMarketplaceError(error, fallback)
  sendJson(res, classified.status, classified.toBridgeError())
}

/**
 * Wrap an async handler so rejections become classified JSON.
 * @param fallback - error code when the thrown value is unclassified.
 * @param handler - async work.
 */
export function handle(
  fallback: BridgeErrorCode,
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      if (res.headersSent) {
        res.destroy()
        return
      }
      sendError(res, error, fallback)
    })
  }
}

/** Require a string field on a JSON body. */
export function requireString(body: unknown, field: string): string {
  if (typeof body !== 'object' || body === null || !hasOwn(body, field) || typeof body[field] !== 'string' || body[field] === '') {
    throw new DifyMarketplaceError('bad_request', `missing string field "${field}"`)
  }
  return body[field]
}

function hasOwn(value: object, field: string): value is Record<string, unknown> {
  return Object.hasOwn(value, field)
}
