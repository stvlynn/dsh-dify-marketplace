/**
 * Shared `defineTool` wrapper for Dify-backed operations.
 *
 * @module dsh-dify-marketplace/runtime/define-dify-tool
 */
import { type ParameterSchemaSpec, type ToolDefinition } from '@deepseek-ai/dsh-tools';
/** Options for one Dify-backed tool. */
export interface DifyToolOptions {
    name: string;
    description: string;
    parameters: ParameterSchemaSpec;
    timeoutMs?: number;
    execute: (args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
}
/**
 * Define a tool whose canonical value is a JSON object and whose model-facing
 * content is a text dump of that object.
 * @param options - name, parameters, and execute.
 */
export declare function defineDifyTool(options: DifyToolOptions): ToolDefinition;
/**
 * Drain a daemon dispatch stream into one JSON value.
 * @param chunks - async iterable of daemon payloads.
 */
export declare function collectChunks(chunks: AsyncIterable<unknown>): Promise<{
    chunks: unknown[];
}>;
//# sourceMappingURL=define-dify-tool.d.ts.map