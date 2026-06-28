import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import { assertFiniteDecimal } from './guards'

describe('assertFiniteDecimal (M11 overflow guard)', () => {
  it('passes for normal and legitimately-huge Decimals (no false positives)', () => {
    expect(() => assertFiniteDecimal(new Decimal(0), 'zero')).not.toThrow()
    expect(() => assertFiniteDecimal(new Decimal(1), 'one')).not.toThrow()
    expect(() => assertFiniteDecimal(new Decimal('1e500'), 'huge')).not.toThrow()
    expect(() => assertFiniteDecimal(new Decimal('1e308').times('1e308'), 'past-double-ceiling')).not.toThrow()
  })

  it('throws on a NaN mantissa', () => {
    const bad = new Decimal(1)
    bad.mantissa = NaN
    expect(() => assertFiniteDecimal(bad, 'nan-mantissa')).toThrow(/non-finite/)
  })

  it('throws on an Infinity exponent', () => {
    const bad = new Decimal(1)
    bad.exponent = Infinity
    expect(() => assertFiniteDecimal(bad, 'inf-exponent')).toThrow(/non-finite/)
  })
})
