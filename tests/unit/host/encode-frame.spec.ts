import { describe, expect, it } from 'vitest'
import { encodeFrame } from '../../../src/host/interfaces/backwards-invocation.ts'

describe('encodeFrame', () => {
  it('writes magic 0x0f, header length 0x0a, and the payload length', () => {
    const payload = Buffer.from('{"data":null}', 'utf8')
    const frame = encodeFrame(payload)
    expect(frame[0]).toBe(0x0f)
    expect(frame.readUInt16LE(2)).toBe(0x0a)
    expect(frame.readUInt32LE(4)).toBe(payload.length)
    expect(frame.subarray(4 + 0x0a)).toEqual(payload)
  })
})
