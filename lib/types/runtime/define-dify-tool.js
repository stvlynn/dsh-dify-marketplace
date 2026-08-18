/**
 * Shared `defineTool` wrapper for Dify-backed operations.
 *
 * @module dsh-dify-marketplace/runtime/define-dify-tool
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
/**
 * Define a tool whose canonical value is a JSON object and whose model-facing
 * content is a text dump of that object.
 * @param options - name, parameters, and execute.
 */
export function defineDifyTool(options) {
    return defineTool({
        name: options.name,
        description: options.description,
        parameters: options.parameters,
        timeoutMs: options.timeoutMs ?? 120_000,
        output: {
            schema: { type: 'object', additionalProperties: true },
            render(_args, value) {
                return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
            },
        },
        async execute(args, exec) {
            const value = await options.execute(args, exec.signal);
            const wrapped = value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : { result: value };
            return JSON.parse(JSON.stringify(wrapped));
        },
    });
}
/**
 * Drain a daemon dispatch stream into one JSON value.
 * @param chunks - async iterable of daemon payloads.
 */
export async function collectChunks(chunks) {
    const collected = [];
    for await (const chunk of chunks)
        collected.push(chunk);
    return { chunks: collected };
}
//# sourceMappingURL=define-dify-tool.js.map