/**
 * Map Dify tool parameters onto the `defineTool` parameter schema.
 *
 * @module dsh-dify-marketplace/runtime/parameters
 */
import type { ParameterSchemaSpec } from '@deepseek-ai/dsh-tools';
import type { DifyToolParameter } from '../shared/contracts/marketplace.ts';
/**
 * Convert one plugin's tool parameters into a DSH parameter schema.
 *
 * Only `form: llm` parameters (or parameters with no form) are model-facing.
 * User-form fields belong in the Host credential vault, not in the tool schema.
 * @param parameters - Dify tool parameters.
 */
export declare function mapToolParameters(parameters: DifyToolParameter[]): ParameterSchemaSpec;
//# sourceMappingURL=parameters.d.ts.map