import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { taxBasis } from '../../../src/checks/rules/tax-basis.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-BASIS-01 tax basis', () => {
  it('produces no findings when allowance/charge are both absent and totals already match', () => {
    expect(taxBasis(makeInvoice(), ctx)).toEqual([])
  })

  it('accounts for both an allowance and a charge when present', () => {
    const invoice = makeInvoice()
    invoice.totals.allowanceTotal = new Big('100.00')
    invoice.totals.chargeTotal = new Big('50.00')
    // 2385.00 - 100.00 + 50.00 = 2335.00
    invoice.totals.taxBasisTotal = new Big('2335.00')

    expect(taxBasis(invoice, ctx)).toEqual([])
  })

  it('flags a tax basis total wrong beyond tolerance as an error', () => {
    const invoice = makeInvoice()
    invoice.totals.taxBasisTotal = new Big('1.00')

    const findings = taxBasis(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-BASIS-01', severity: 'error' })
  })

  it('flags a tax basis total off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    invoice.totals.taxBasisTotal = invoice.totals.taxBasisTotal.plus('0.01')

    expect(taxBasis(invoice, ctx)[0]?.severity).toBe('warning')
  })

  it('still runs when there are no line items at all (MINIMUM-shaped totals)', () => {
    const invoice = makeInvoice()
    invoice.lines = []
    invoice.totals.lineTotal = new Big('500.00')
    invoice.totals.taxBasisTotal = new Big('500.00')

    expect(taxBasis(invoice, ctx)).toEqual([])
  })
})
