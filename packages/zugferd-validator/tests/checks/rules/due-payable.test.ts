import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { duePayable } from '../../../src/checks/rules/due-payable.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-TOTAL-02 due payable', () => {
  it('produces no findings when GrandTotal - TotalPrepaid = DuePayable with no prepayment', () => {
    expect(duePayable(makeInvoice(), ctx)).toEqual([])
  })

  it('accounts for a prepayment when present', () => {
    const invoice = makeInvoice()
    invoice.totals.totalPrepaid = new Big('746.00')
    invoice.totals.duePayable = new Big('2000.00')

    expect(duePayable(invoice, ctx)).toEqual([])
  })

  it('flags a due payable wrong beyond tolerance as an error', () => {
    const invoice = makeInvoice()
    invoice.totals.duePayable = new Big('1.00')

    const findings = duePayable(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-TOTAL-02', severity: 'error' })
  })

  it('flags a due payable off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    invoice.totals.duePayable = invoice.totals.duePayable.plus('0.01')

    expect(duePayable(invoice, ctx)[0]?.severity).toBe('warning')
  })
})
