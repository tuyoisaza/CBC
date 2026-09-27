import { describe, expect, it } from 'vitest'
import { isValidCheckoutRfc, normalizeCheckoutRfc } from '../checkout-validation'

describe('checkout RFC format', () => {
  it.each(['ABCD900101AB1', 'ABC900101AB1', 'XAXX010101000', 'Ñ&A900101AB1'])('accepts a formatted RFC: %s', value => {
    expect(isValidCheckoutRfc(value)).toBe(true)
  })

  it('normalizes surrounding whitespace and lowercase without changing the identifier', () => {
    expect(normalizeCheckoutRfc(' abcd900101ab1 ')).toBe('ABCD900101AB1')
    expect(isValidCheckoutRfc(' abcd900101ab1 ')).toBe(true)
  })

  it.each(['ABCD900101AB12', 'ABC900101AB', '1234567890123', 'ABCDABCDEF123', 'ABCD-900101AB1', 'ABCD 900101AB1', ''])('rejects malformed input: %s', value => {
    expect(isValidCheckoutRfc(value)).toBe(false)
  })
})
