/**
 * Shared `defineTool` wrapper for Dify-backed operations.
 *
 * @module dsh-dify-marketplace/runtime/define-dify-tool
 */

import { defineTool, type ParameterSchemaSpec, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'

/** Options for one Dify-backed tool. */
export interface DifyToolOptions {
  name: string
  description: string
  parameters: ParameterSchemaSpec
  timeoutMs?: number
  execute: (args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>
}

/**
 * Define a tool whose canonical value is a JSON object and whose model-facing
 * content is a text dump of that object.
 * @param options - name, parameters, and execute.
 */
export function defineDifyTool(options: DifyToolOptions): ToolDefinition {
  return defineTool({
    name: options.name,
    description: options.description,
    parameters: options.parameters,
    timeoutMs: options.timeoutMs ?? 120_000,
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value): ContentBlock[] {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute(args, exec) {
      const value = await options.execute(args as Record<string, unknown>, exec.signal)
      const wrapped = value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { result: value }
      return JSON.parse(JSON.stringify(wrapped)) as Record<string, never>
    },
  })
}

/**
 * Drain a daemon dispatch stream into one JSON value.
 * @param chunks - async iterable of daemon payloads.
 */
export async function collectChunks(chunks: AsyncIterable<unknown>): Promise<{ chunks: unknown[] }> {
  const collected: unknown[] = []
  for await (const chunk of chunks) collected.push(chunk)
  return { chunks: collected }
}
