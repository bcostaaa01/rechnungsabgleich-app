import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { lineTotal } from '../../../src/checks/rules/line-total.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-LINE-01 line total', () => {
  it('produces no findings when every line total matches', () => {
    expect(lineTotal(makeInvoice(), ctx)).toEqual([])
  })

  it('flags a line total that is wrong beyond tolerance as an error', () => {
    const invoice = makeInvoice()
    const line = invoice.lines[0]
    if (!line) throw new Error('fixture missing line')
    line.lineTotal = new Big('999.99')

    const findings = lineTotal(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: 'R-LINE-01',
      severity: 'error',
      target: { kind: 'line', lineId: '1' },
    })
  })

  it('flags a line total off by exactly the tolerance as a warning', () => {
    const invoice = makeInvoice()
    const line = invoice.lines[0]
    if (!line) throw new Error('fixture missing line')
    line.lineTotal = line.lineTotal.plus('0.01')

    const findings = lineTotal(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('warning')
  })

  it('reads an explicit BasisQuantity instead of assuming 1', () => {
    const invoice = makeInvoice()
    const line = invoice.lines[0]
    if (!line) throw new Error('fixture missing line')
    // 250 pieces billed, price quoted per 100 pieces at 98.00 -> 245.00
    line.billedQuantity = new Big('250')
    line.basisQuantity = new Big('100')
    line.netUnitPrice = new Big('98.00')
    line.lineTotal = new Big('245.00')

    expect(lineTotal(invoice, ctx)).toEqual([])
  })
})
