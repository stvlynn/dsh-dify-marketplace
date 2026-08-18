import { describe, expect, it } from 'vitest'
import { mapToolParameters } from '../../../src/runtime/parameters.ts'
import type { DifyToolParameter } from '../../../src/shared/contracts/marketplace.ts'

describe('mapToolParameters', () => {
  it('keeps llm-form fields and drops user-form fields', () => {
    const parameters: DifyToolParameter[] = [
      {
        name: 'query',
        type: 'string',
        required: true,
        form: 'llm',
        llm_description: 'search query',
      },
      {
        name: 'api_key',
        type: 'secret-input',
        form: 'form',
        label: { en_US: 'API Key' },
      },
    ]
    expect(mapToolParameters(parameters)).toEqual({
      query: { type: 'string', description: 'search query', required: true },
    })
  })

  it('uses a JSON input object when the tool declares no model-facing fields', () => {
    const schema = mapToolParameters([{ name: 'api_key', type: 'secret-input', form: 'form' }])
    expect(schema.input).toMatchObject({ type: 'json', required: true })
  })
})
