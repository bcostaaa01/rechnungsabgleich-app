import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { runChecks } from '@/core/checks/runner'
import { lineSum } from '@/core/checks/rules/line-sum'
import { vatTotal } from '@/core/checks/rules/vat-per-category'
import { makeInvoice } from './fixtures'

const ctx = { tolerance: new Big('0.01') }

describe('runChecks', () => {
  it('runs the full rule set and surfaces a real error on a normal EN16931 invoice', () => {
    const invoice = makeInvoice()
    invoice.lines[0]!.lineTotal = new Big('1.00') // wrong beyond tolerance

    const findings = runChecks(invoice, ctx)
    expect(findings.some((f) => f.ruleId === 'R-LINE-01')).toBe(true)
  })

  it('produces zero findings on a MINIMUM-shaped invoice, even with data that would otherwise mismatch (SPEC.md §6: "must not produce eleven false errors")', () => {
    const invoice = makeInvoice()
    invoice.capabilities = { hasLineItems: false, hasVatBreakdown: false, hasPaymentTerms: false }
    invoice.lines = []
    invoice.vatBreakdown = []
    // Deliberately inconsistent with the (now absent) line/VAT detail --
    // MINIMUM only carries totals, so this is the realistic shape, and
    // it's exactly the data that would trip up an ungated R-SUM-01/R-VAT-03.
    invoice.totals = {
      lineTotal: new Big('500.00'),
      allowanceTotal: null,
      chargeTotal: null,
      taxBasisTotal: new Big('500.00'),
      taxTotal: new Big('50.00'),
      taxTotalCurrencyId: 'EUR',
      grandTotal: new Big('550.00'),
      totalPrepaid: null,
      duePayable: new Big('550.00'),
    }

    expect(runChecks(invoice, ctx)).toEqual([])
  })

  it('proves the zero-findings result above is due to gating, not the rules degrading gracefully on their own', () => {
    const invoice = makeInvoice()
    invoice.lines = []
    invoice.vatBreakdown = []
    invoice.totals.lineTotal = new Big('500.00')
    invoice.totals.taxTotal = new Big('50.00')

    // Calling the same rules directly, ungated, against the same data:
    // both fire, because summing zero lines/VAT entries doesn't match
    // those non-zero header totals.
    expect(lineSum(invoice, ctx)).toHaveLength(1)
    expect(vatTotal(invoice, ctx)).toHaveLength(1)
  })
})
