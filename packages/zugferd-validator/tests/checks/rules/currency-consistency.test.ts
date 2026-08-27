import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { currencyConsistency } from '../../../src/checks/rules/currency-consistency.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-CUR-01 currency consistency', () => {
  it('produces no findings when the tax total currency matches the header currency', () => {
    expect(currencyConsistency(makeInvoice(), ctx)).toEqual([])
  })

  it('produces no findings when the tax total currency attribute is absent', () => {
    const invoice = makeInvoice()
    invoice.totals.taxTotalCurrencyId = undefined

    expect(currencyConsistency(invoice, ctx)).toEqual([])
  })

  it('flags a mismatched tax total currency as an error', () => {
    const invoice = makeInvoice()
    invoice.totals.taxTotalCurrencyId = 'USD'

    const findings = currencyConsistency(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-CUR-01', severity: 'error', target: { kind: 'header' } })
  })
})
