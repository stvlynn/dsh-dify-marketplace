import { describe, expect, it } from 'vitest'
import { localized } from '../../../src/shared/localized.ts'

describe('localized', () => {
  it('prefers the requested locale then English', () => {
    expect(localized({ zh_Hans: '你好', en_US: 'Hello' }, 'en_US')).toBe('Hello')
    expect(localized({ zh_Hans: '你好', en_US: 'Hello' }, 'zh')).toBe('你好')
  })

  it('returns an empty string for a missing map', () => {
    expect(localized(undefined)).toBe('')
  })
})
