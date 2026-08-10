import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { pdfGrandTotal, pdfInvoiceNumber } from '@/core/checks/rules/pdf-cross-check'
import { makeInvoice } from '../fixtures'

const tolerance = new Big('0.01')

describe('R-PDF-01 pdf grand total', () => {
  it('produces no findings when the formatted grand total is found in the PDF text', () => {
    const ctx = { tolerance, pdfText: 'RECHNUNG 2024-0815 ... Bruttobetrag: 2.746,00 EUR' }
    expect(pdfGrandTotal(makeInvoice(), ctx)).toEqual([])
  })

  it('flags a grand total missing from the PDF text -- the whole product thesis', () => {
    const ctx = { tolerance, pdfText: 'RECHNUNG 2024-0815 ... Bruttobetrag: 1.999,00 EUR' }

    const findings = pdfGrandTotal(makeInvoice(), ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-PDF-01', severity: 'error' })
  })

  it('produces no findings when there is no PDF loaded at all', () => {
    const ctx = { tolerance }
    expect(pdfGrandTotal(makeInvoice(), ctx)).toEqual([])
  })
})

describe('R-PDF-02 pdf invoice number', () => {
  it('produces no findings when the invoice number is found in the PDF text', () => {
    const ctx = { tolerance, pdfText: 'RECHNUNG 2024-0815 -- Egger Bau GmbH' }
    expect(pdfInvoiceNumber(makeInvoice(), ctx)).toEqual([])
  })

  it('flags an invoice number missing from the PDF text', () => {
    const ctx = { tolerance, pdfText: 'RECHNUNG 2024-9999 -- Egger Bau GmbH' }

    const findings = pdfInvoiceNumber(makeInvoice(), ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-PDF-02', severity: 'error' })
  })

  it('produces no findings when there is no PDF loaded at all', () => {
    const ctx = { tolerance }
    expect(pdfInvoiceNumber(makeInvoice(), ctx)).toEqual([])
  })
})
