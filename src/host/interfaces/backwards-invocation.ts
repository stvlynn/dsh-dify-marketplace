/**
 * Backwards-invocation adapter.
 *
 * Local daemon runtimes call Dify's inner API at `{DIFY_INNER_API_URL}/inner/api/...`
 * (`calldify.difyPath` prepends `inner/api`). This plugin registers that tree
 * under `/dify-marketplace/inner/api` and points the sidecar at
 * `http://host.docker.internal:<port>/dify-marketplace`.
 *
 * The daemon streams with a length-prefixed framing (magic `0x0f`). Responses
 * that are not streams use `{ data, error }`.
 *
 * Unsupported invoke types fail closed with an error string — they do not
 * pretend to succeed.
 *
 * @module dsh-dify-marketplace/host/interfaces/backwards-invocation
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { CallId } from '@deepseek-ai/dsh-llm/brand'
import { handle, readJsonBody, sendJson } from './http.ts'

const PREFIX = '/dify-marketplace/inner/api'
const MAGIC = 0x0f
const HEADER_LENGTH = 0x0a

/**
 * Register the inner-API routes the daemon calls back into.
 * @param ctx - Host context.
 * @param innerApiKey - expected `X-Inner-Api-Key`. Empty disables the adapter.
 */
export function registerBackwardsInvocation(ctx: Context, innerApiKey: string): void {
  if (innerApiKey === '') return
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: PREFIX,
    handler: handle('registration_failed', async (req, res) => {
      const provided = header(req, 'x-inner-api-key')
      if (provided !== innerApiKey) {
        sendJson(res, 401, { error: 'invalid inner API key', data: null })
        return
      }
      const url = new URL(req.url ?? '/', 'http://dsh.local')
      const route = url.pathname.slice(PREFIX.length).replace(/^\//, '')
      const body = await readJsonBody(req)
      await dispatch(ctx, route, body, res)
    }),
  }), 'dify-backwards-invocation')
}

async function dispatch(ctx: Context, route: string, body: unknown, res: ServerResponse): Promise<void> {
  if (route === 'invoke/tool') {
    await invokeTool(ctx, body, res)
    return
  }
  if (route === 'invoke/llm' || route === 'invoke/llm/structured-output') {
    writeStreamError(res, 'Dify plugin requested a Harness LLM call; configure ctx.llm before using plugins that invoke the model')
    return
  }
  sendJson(res, 200, {
    data: null,
    error: `unsupported backwards invocation "${route}"`,
  })
}

async function invokeTool(ctx: Context, body: unknown, res: ServerResponse): Promise<void> {
  const payload = body as { data?: { tool?: string, tool_parameters?: unknown } }
  const name = payload.data?.tool
  if (typeof name !== 'string' || name === '') {
    sendJson(res, 200, { data: null, error: 'tool name is required' })
    return
  }
  try {
    const result = await ctx.tools.execute({
      callId: `dify-backwards-${Date.now()}` as CallId,
      name,
      arguments: payload.data?.tool_parameters ?? {},
      signal: AbortSignal.timeout(120_000),
    })
    writeStreamJson(res, { data: { type: 'text', message: { text: JSON.stringify(result) } }, error: '' })
  } catch (error) {
    writeStreamError(res, error instanceof Error ? error.message : String(error))
  }
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  return typeof value === 'string' ? value : undefined
}

function writeStreamError(res: ServerResponse, message: string): void {
  writeStreamJson(res, { data: null, error: message })
}

function writeStreamJson(res: ServerResponse, payload: unknown): void {
  const data = Buffer.from(JSON.stringify(payload), 'utf8')
  const frame = encodeFrame(data)
  res.writeHead(200, { 'content-type': 'application/octet-stream' })
  res.end(frame)
}

/** Encode one length-prefixed daemon stream frame (magic 0x0f, header 0x0a). */
export function encodeFrame(data: Buffer): Buffer {
  const preamble = Buffer.alloc(4)
  preamble[0] = MAGIC
  preamble[1] = 0
  preamble.writeUInt16LE(HEADER_LENGTH, 2)
  const header = Buffer.alloc(HEADER_LENGTH)
  header.writeUInt32LE(data.length, 0)
  return Buffer.concat([preamble, header, data])
}
