import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { compareSeverity } from '../../src/checks/compare.js'

describe('compareSeverity', () => {
  it('returns null for an exact match', () => {
    expect(compareSeverity(new Big('10.00'), new Big('10.00'), new Big('0.01'))).toBeNull()
  })

  it('returns "warning" when the difference is exactly the tolerance', () => {
    expect(compareSeverity(new Big('10.00'), new Big('10.01'), new Big('0.01'))).toBe('warning')
  })

  it('returns "warning" when the difference is within the tolerance', () => {
    expect(compareSeverity(new Big('10.00'), new Big('10.005'), new Big('0.01'))).toBe('warning')
  })

  it('returns "error" when the difference exceeds the tolerance', () => {
    expect(compareSeverity(new Big('10.00'), new Big('10.02'), new Big('0.01'))).toBe('error')
  })

  it('treats negative differences the same as positive ones', () => {
    expect(compareSeverity(new Big('10.02'), new Big('10.00'), new Big('0.01'))).toBe('error')
  })
})
