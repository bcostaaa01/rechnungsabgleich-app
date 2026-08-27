import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { vatBasis, vatCalculated, vatTotal } from '../../../src/checks/rules/vat-per-category.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-VAT-01 vat basis', () => {
  it('produces no findings for the mixed 20%/10% fixture (proves category+rate matching, not category alone)', () => {
    // If basis were grouped by category alone, both "S" entries would sum
    // to the same 2385.00 basis and neither would match its real 1225.00 /
    // 1160.00 basisAmount -- this default case would fail if that bug existed.
    expect(vatBasis(makeInvoice(), ctx)).toEqual([])
  })

  it('flags only the affected rate when one entry basis is wrong', () => {
    const invoice = makeInvoice()
    const twentyPercent = invoice.vatBreakdown.find((v) => v.ratePercent.eq(new Big('20')))
    if (!twentyPercent) throw new Error('fixture missing 20% entry')
    twentyPercent.basisAmount = new Big('1.00')

    const findings = vatBasis(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-VAT-01', severity: 'error', target: { kind: 'vat', category: 'S' } })
  })

  it('flags a basis off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    const entry = invoice.vatBreakdown[0]
    if (!entry) throw new Error('fixture missing entry')
    entry.basisAmount = entry.basisAmount.plus('0.01')

    expect(vatBasis(invoice, ctx)[0]?.severity).toBe('warning')
  })
})

describe('R-VAT-02 vat calculated', () => {
  it('produces no findings when calculated amounts match basis × rate for both rates', () => {
    expect(vatCalculated(makeInvoice(), ctx)).toEqual([])
  })

  it('flags a wrong calculated amount as an error', () => {
    const invoice = makeInvoice()
    const entry = invoice.vatBreakdown[0]
    if (!entry) throw new Error('fixture missing entry')
    entry.calculatedAmount = new Big('1.00')

    const findings = vatCalculated(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.ruleId).toBe('R-VAT-02')
  })

  it('flags a calculated amount off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    const entry = invoice.vatBreakdown[0]
    if (!entry) throw new Error('fixture missing entry')
    entry.calculatedAmount = entry.calculatedAmount.plus('0.01')

    expect(vatCalculated(invoice, ctx)[0]?.severity).toBe('warning')
  })
})

describe('R-VAT-03 vat total', () => {
  it('produces no findings when the calculated amounts sum to the header tax total', () => {
    expect(vatTotal(makeInvoice(), ctx)).toEqual([])
  })

  it('flags a header tax total wrong beyond tolerance as an error', () => {
    const invoice = makeInvoice()
    invoice.totals.taxTotal = new Big('1.00')

    const findings = vatTotal(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-VAT-03', severity: 'error', target: { kind: 'header' } })
  })

  it('flags a header tax total off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    invoice.totals.taxTotal = invoice.totals.taxTotal.plus('0.01')

    expect(vatTotal(invoice, ctx)[0]?.severity).toBe('warning')
  })
})
