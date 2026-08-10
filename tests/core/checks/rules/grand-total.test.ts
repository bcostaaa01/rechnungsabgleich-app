import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { grandTotal } from '@/core/checks/rules/grand-total'
import { makeInvoice } from '../fixtures'

const ctx = { tolerance: new Big('0.01') }

describe('R-TOTAL-01 grand total', () => {
  it('produces no findings when TaxBasisTotal + TaxTotal = GrandTotal', () => {
    expect(grandTotal(makeInvoice(), ctx)).toEqual([])
  })

  it('flags a grand total wrong beyond tolerance as an error', () => {
    const invoice = makeInvoice()
    invoice.totals.grandTotal = new Big('1.00')

    const findings = grandTotal(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-TOTAL-01', severity: 'error', target: { kind: 'header' } })
  })

  it('flags a grand total off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    invoice.totals.grandTotal = invoice.totals.grandTotal.plus('0.01')

    expect(grandTotal(invoice, ctx)[0]?.severity).toBe('warning')
  })
})
