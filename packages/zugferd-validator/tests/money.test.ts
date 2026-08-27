import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { add, equalWithin, formatEUR, formatQuantity, multiply, parseAmount, round2 } from '../src/money.js'

describe('parseAmount', () => {
  it('parses a plain decimal string', () => {
    expect(parseAmount('98.00')?.eq(new Big('98'))).toBe(true)
  })

  it('parses a negative, four-decimal string (Gutschrift with BT-146-style precision)', () => {
    expect(parseAmount('-12.3456')?.eq(new Big('-12.3456'))).toBe(true)
  })

  it('returns null for undefined', () => {
    expect(parseAmount(undefined)).toBeNull()
  })

  it('returns null for an empty or whitespace-only string', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
  })

  it('returns null for unparseable text instead of throwing', () => {
    expect(parseAmount('not-a-number')).toBeNull()
  })

  it('treats "0" as a valid amount, not a missing one (zero quantity)', () => {
    const parsed = parseAmount('0')
    expect(parsed).not.toBeNull()
    expect(parsed?.eq(new Big('0'))).toBe(true)
  })
})

describe('add', () => {
  it('sums an arbitrary number of values at full precision', () => {
    const sum = add(new Big('1.5'), new Big('2.25'), new Big('0.005'))
    expect(sum.eq(new Big('3.755'))).toBe(true)
  })

  it('returns zero when called with no values', () => {
    expect(add().eq(new Big('0'))).toBe(true)
  })

  it('handles negative amounts (Gutschriften) correctly', () => {
    const sum = add(new Big('100.00'), new Big('-30.00'), new Big('-70.00'))
    expect(sum.eq(new Big('0'))).toBe(true)
  })
})

describe('multiply', () => {
  it('multiplies without rounding, preserving four-decimal precision', () => {
    const result = multiply(new Big('12.3456'), new Big('3'))
    expect(result.eq(new Big('37.0368'))).toBe(true)
  })

  it('handles a zero quantity', () => {
    expect(multiply(new Big('99.99'), new Big('0')).eq(new Big('0'))).toBe(true)
  })

  it('handles a BasisQuantity of 100 correctly (BilledQuantity ÷ BasisQuantity × ChargeAmount)', () => {
    // 250 pieces billed, price quoted per 100 pieces at 12.50
    const billedQuantity = new Big('250')
    const basisQuantity = new Big('100')
    const chargeAmount = new Big('12.50')
    const lineTotal = multiply(billedQuantity.div(basisQuantity), chargeAmount)
    expect(lineTotal.eq(new Big('31.25'))).toBe(true)
  })
})

describe('round2', () => {
  it('rounds the half-cent boundary up for positive values', () => {
    expect(round2(new Big('0.005')).eq(new Big('0.01'))).toBe(true)
  })

  it('rounds the half-cent boundary away from zero for negative values', () => {
    expect(round2(new Big('-0.005')).eq(new Big('-0.01'))).toBe(true)
  })

  it('rounds ordinary values half-up in both directions', () => {
    expect(round2(new Big('0.004')).eq(new Big('0.00'))).toBe(true)
    expect(round2(new Big('0.006')).eq(new Big('0.01'))).toBe(true)
  })

  it('demonstrates why rounding order matters: 100 x EUR 0,015 summed-then-rounded vs. rounded-then-summed', () => {
    const values = Array.from({ length: 100 }, () => new Big('0.015'))

    const summedThenRounded = round2(add(...values))
    const roundedThenSummed = add(...values.map((v) => round2(v)))

    // Big does exact decimal arithmetic, so the raw sum is exactly 1.5 --
    // no float drift -- but rounding each 0,015 up to 0,02 first before
    // summing 100 of them compounds the half-cent rounding into a full
    // euro of drift. This is exactly why money.ts rounds only at defined
    // boundaries instead of after every intermediate step.
    expect(summedThenRounded.eq(new Big('1.50'))).toBe(true)
    expect(roundedThenSummed.eq(new Big('2.00'))).toBe(true)
    expect(summedThenRounded.eq(roundedThenSummed)).toBe(false)
  })
})

describe('equalWithin', () => {
  it('is true when the difference is exactly the tolerance', () => {
    expect(equalWithin(new Big('10.00'), new Big('10.01'), new Big('0.01'))).toBe(true)
  })

  it('is false when the difference exceeds the tolerance', () => {
    expect(equalWithin(new Big('10.00'), new Big('10.02'), new Big('0.01'))).toBe(false)
  })

  it('is symmetric regardless of which value is larger', () => {
    expect(equalWithin(new Big('10.02'), new Big('10.00'), new Big('0.01'))).toBe(false)
  })
})

describe('formatEUR', () => {
  it('formats with a period thousands separator and comma decimal', () => {
    expect(formatEUR(new Big('1234.5'))).toBe('1.234,50 €')
  })

  it('formats large amounts with multiple thousand separators', () => {
    expect(formatEUR(new Big('1000000'))).toBe('1.000.000,00 €')
  })

  it('formats negative amounts with a leading minus', () => {
    expect(formatEUR(new Big('-42'))).toBe('-42,00 €')
  })

  it('formats zero without a sign', () => {
    expect(formatEUR(new Big('0'))).toBe('0,00 €')
  })

  it('does not show a negative sign for a value that rounds to zero', () => {
    expect(formatEUR(new Big('-0.001'))).toBe('0,00 €')
  })
})

describe('formatQuantity', () => {
  it('formats a whole number without a trailing decimal', () => {
    expect(formatQuantity(new Big('1'))).toBe('1')
  })

  it('formats a fractional quantity with a comma, no forced decimal places', () => {
    expect(formatQuantity(new Big('12.5'))).toBe('12,5')
  })

  it('preserves precision beyond two decimal places, unlike formatEUR', () => {
    expect(formatQuantity(new Big('0.375'))).toBe('0,375')
  })

  it('formats negative quantities with a leading minus', () => {
    expect(formatQuantity(new Big('-2.5'))).toBe('-2,5')
  })

  it('adds thousand separators to large quantities', () => {
    expect(formatQuantity(new Big('12500'))).toBe('12.500')
  })
})
