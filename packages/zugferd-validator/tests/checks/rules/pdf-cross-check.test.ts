import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { pdfGrandTotal, pdfInvoiceNumber, pdfIban } from '../../../src/checks/rules/pdf-cross-check.js'
import { makeInvoice } from '../fixtures.js'

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

describe('R-PDF-03 pdf iban', () => {
  it('produces no findings when the IBAN is found in the PDF text, spaced and matched case-insensitively', () => {
    const invoice = { ...makeInvoice(), iban: 'DE89370400440532013000' }
    const ctx = { tolerance, pdfText: 'IBAN: de89 3704 0044 0532 0130 00' }
    expect(pdfIban(invoice, ctx)).toEqual([])
  })

  it('flags an IBAN missing from the PDF text', () => {
    const invoice = { ...makeInvoice(), iban: 'DE89370400440532013000' }
    const ctx = { tolerance, pdfText: 'IBAN: AT61 1904 3002 3457 3201' }

    const findings = pdfIban(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: 'R-PDF-03', severity: 'error' })
  })

  it('produces no findings when there is no PDF loaded at all', () => {
    const invoice = { ...makeInvoice(), iban: 'DE89370400440532013000' }
    const ctx = { tolerance }
    expect(pdfIban(invoice, ctx)).toEqual([])
  })

  it('produces no findings when the invoice has no IBAN', () => {
    const ctx = { tolerance, pdfText: 'IBAN: DE89 3704 0044 0532 0130 00' }
    expect(pdfIban(makeInvoice(), ctx)).toEqual([])
  })
})
