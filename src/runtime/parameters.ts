/**
 * Map Dify tool parameters onto the `defineTool` parameter schema.
 *
 * @module dsh-dify-marketplace/runtime/parameters
 */

import type { ParameterSchemaSpec, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import type { DifyToolParameter } from '../shared/contracts/marketplace.ts'
import { localized } from '../shared/localized.ts'

/**
 * Convert one plugin's tool parameters into a DSH parameter schema.
 *
 * Only `form: llm` parameters (or parameters with no form) are model-facing.
 * User-form fields belong in the Host credential vault, not in the tool schema.
 * @param parameters - Dify tool parameters.
 */
export function mapToolParameters(parameters: DifyToolParameter[]): ParameterSchemaSpec {
  const schema: ParameterSchemaSpec = {}
  for (const parameter of parameters) {
    if (parameter.form !== undefined && parameter.form !== 'llm') continue
    const spec = mapType(parameter)
    spec.description = parameter.llm_description || localized(parameter.human_description) || localized(parameter.label)
    if (parameter.required === true) {
      schema[parameter.name] = { ...spec, required: true }
    } else {
      schema[parameter.name] = spec
    }
  }
  if (Object.keys(schema).length === 0) {
    schema.input = {
      type: 'json',
      description: 'Arguments for this Dify tool, as a JSON object.',
      required: true,
    }
  }
  return schema
}

/** Map one Dify parameter type onto a DSH value schema. */
function mapType(parameter: DifyToolParameter): ValueSchemaSpec {
  switch (parameter.type) {
    case 'number':
      return { type: 'number' }
    case 'integer':
      return { type: 'integer' }
    case 'boolean':
    case 'checkbox':
      return { type: 'boolean' }
    case 'array':
    case 'files':
      return { type: 'array', items: { type: 'string' } }
    case 'object':
      return { type: 'object', additionalProperties: true }
    case 'select': {
      const values = (parameter.options ?? [])
        .map(option => option.value)
        .filter((value): value is string => typeof value === 'string')
      return values.length > 0 ? { type: 'string', enum: values } : { type: 'string' }
    }
    default:
      return { type: 'string' }
  }
}
