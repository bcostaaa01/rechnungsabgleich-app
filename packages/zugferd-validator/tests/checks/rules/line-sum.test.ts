import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { lineSum } from '../../../src/checks/rules/line-sum.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-SUM-01 line sum', () => {
  it('produces no findings when the line totals sum to the header total', () => {
    expect(lineSum(makeInvoice(), ctx)).toEqual([])
  })

  it('flags a header total that is wrong beyond tolerance as an error', () => {
    const invoice = makeInvoice()
    invoice.totals.lineTotal = new Big('1.00')

    const findings = lineSum(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-SUM-01', severity: 'error', target: { kind: 'header' } })
  })

  it('flags a header total off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    invoice.totals.lineTotal = invoice.totals.lineTotal.plus('0.01')

    const findings = lineSum(invoice, ctx)
    expect(findings[0]?.severity).toBe('warning')
  })

  it('sums three or more lines correctly, not just two', () => {
    const invoice = makeInvoice()
    const template = invoice.lines[0]
    if (!template) throw new Error('fixture missing line')
    invoice.lines.push({ ...template, lineId: '3', lineTotal: new Big('50.00') })
    invoice.totals.lineTotal = new Big('2435.00')

    expect(lineSum(invoice, ctx)).toEqual([])
  })
})
