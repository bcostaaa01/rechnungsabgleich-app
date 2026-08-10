import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { parseCiiXml } from '@/core/cii/parse'

const sampleXml = readFileSync(resolve('tests/fixtures/en16931-sample.xml'), 'utf-8')

describe('parseCiiXml', () => {
  it('parses header fields and detects the profile', () => {
    const invoice = parseCiiXml(sampleXml)

    expect(invoice.profile).toBe('EN16931')
    expect(invoice.capabilities.hasLineItems).toBe(true)
    expect(invoice.invoiceNumber).toBe('2024-0815')
    expect(invoice.currency).toBe('EUR')
    expect(invoice.seller.name).toBe('Egger Bau GmbH')
    expect(invoice.buyer.name).toBe('Muster Bautraeger AG')
    expect(invoice.issueDate.toISOString().slice(0, 10)).toBe('2024-08-15')
  })

  it('parses both line items with correct quantities, units, and totals', () => {
    const invoice = parseCiiXml(sampleXml)

    expect(invoice.lines).toHaveLength(2)

    const [beton, stahl] = invoice.lines
    expect(beton?.name).toBe('Beton C25/30')
    expect(beton?.billedQuantity.eq(new Big('12.5'))).toBe(true)
    expect(beton?.unitCode).toBe('MTQ')
    expect(beton?.netUnitPrice.eq(new Big('98.00'))).toBe(true)
    expect(beton?.basisQuantity.eq(new Big(1))).toBe(true)
    expect(beton?.vatRate.eq(new Big('20'))).toBe(true)
    expect(beton?.lineTotal.eq(new Big('1225.00'))).toBe(true)

    expect(stahl?.name).toBe('Bewehrungsstahl')
    expect(stahl?.vatRate.eq(new Big('10'))).toBe(true)
  })

  it('reads an explicit BasisQuantity instead of ignoring it (SPEC.md §3 trap)', () => {
    const xml = sampleXml.replace(
      '<ram:ChargeAmount>98.00</ram:ChargeAmount>',
      '<ram:ChargeAmount>98.00</ram:ChargeAmount><ram:BasisQuantity>100</ram:BasisQuantity>',
    )
    const invoice = parseCiiXml(xml)
    expect(invoice.lines[0]?.basisQuantity.eq(new Big('100'))).toBe(true)
  })

  it('parses the VAT breakdown for both rates', () => {
    const invoice = parseCiiXml(sampleXml)

    expect(invoice.vatBreakdown).toHaveLength(2)
    const twenty = invoice.vatBreakdown.find((v) => v.ratePercent.eq(new Big('20')))
    expect(twenty?.basisAmount.eq(new Big('1225.00'))).toBe(true)
    expect(twenty?.calculatedAmount.eq(new Big('245.00'))).toBe(true)
  })

  it('parses totals', () => {
    const invoice = parseCiiXml(sampleXml)

    expect(invoice.totals.lineTotal.eq(new Big('2385.00'))).toBe(true)
    expect(invoice.totals.taxBasisTotal.eq(new Big('2385.00'))).toBe(true)
    expect(invoice.totals.taxTotal.eq(new Big('361.00'))).toBe(true)
    expect(invoice.totals.taxTotalCurrencyId).toBe('EUR')
    expect(invoice.totals.grandTotal.eq(new Big('2746.00'))).toBe(true)
    expect(invoice.totals.duePayable.eq(new Big('2746.00'))).toBe(true)
    expect(invoice.totals.allowanceTotal).toBeNull()
    expect(invoice.totals.totalPrepaid).toBeNull()
  })

  it('parses the payment terms free text', () => {
    const invoice = parseCiiXml(sampleXml)
    expect(invoice.paymentTermsText).toContain('Skonto')
  })

  it('throws a descriptive error for XML missing the CII root element', () => {
    expect(() => parseCiiXml('<foo>bar</foo>')).toThrow(/CrossIndustryInvoice/)
  })

  it('throws a descriptive error for XML missing a required field', () => {
    const broken = sampleXml.replace('<ram:ID>2024-0815</ram:ID>', '')
    expect(() => parseCiiXml(broken)).toThrow(/ram:ID/)
  })
})
