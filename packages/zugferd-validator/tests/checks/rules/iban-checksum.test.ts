import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { ibanChecksum } from '../../../src/checks/rules/iban-checksum.js'
import { makeInvoice } from '../fixtures.js'

const ctx = { tolerance: new Big('0.01') }

describe('R-IBAN-01 iban checksum', () => {
  it('produces no findings for a checksum-valid IBAN', () => {
    const invoice = { ...makeInvoice(), iban: 'DE89370400440532013000' }
    expect(ibanChecksum(invoice, ctx)).toEqual([])
  })

  it('flags a checksum-invalid IBAN, carrying matchText/matchKind for the gutter', () => {
    const invoice = { ...makeInvoice(), iban: 'DE89370400440532013099' }

    const findings = ibanChecksum(invoice, ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: 'R-IBAN-01',
      severity: 'error',
      matchText: 'DE89370400440532013099',
      matchKind: 'iban',
    })
  })

  it('produces no findings when the invoice has no IBAN', () => {
    expect(ibanChecksum(makeInvoice(), ctx)).toEqual([])
  })
})
