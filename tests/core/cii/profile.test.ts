import { describe, expect, it } from 'vitest'
import { detectProfile } from '@/core/cii/profile'

describe('detectProfile', () => {
  it('detects MINIMUM and reports no capabilities at all', () => {
    const { profile, capabilities } = detectProfile('urn:factur-x.eu:1p0:minimum')
    expect(profile).toBe('MINIMUM')
    expect(capabilities).toEqual({
      hasLineItems: false,
      hasVatBreakdown: false,
      hasPaymentTerms: false,
    })
  })

  it('detects BASIC WL, which has VAT breakdown and payment terms but no line items', () => {
    const { profile, capabilities } = detectProfile('urn:factur-x.eu:1p0:basicwl')
    expect(profile).toBe('BASIC_WL')
    expect(capabilities).toEqual({
      hasLineItems: false,
      hasVatBreakdown: true,
      hasPaymentTerms: true,
    })
  })

  it('detects BASIC and does not misclassify it as EN16931 even though the URN contains "en16931"', () => {
    const { profile, capabilities } = detectProfile(
      'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic',
    )
    expect(profile).toBe('BASIC')
    expect(capabilities.hasLineItems).toBe(true)
  })

  it('detects plain EN16931', () => {
    const { profile } = detectProfile('urn:cen.eu:en16931:2017')
    expect(profile).toBe('EN16931')
  })

  it('detects EXTENDED and does not misclassify it as EN16931 even though the URN contains "en16931"', () => {
    const { profile } = detectProfile(
      'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended',
    )
    expect(profile).toBe('EXTENDED')
  })

  it('detects XRECHNUNG-as-ZUGFeRD variants', () => {
    const { profile } = detectProfile(
      'urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0',
    )
    expect(profile).toBe('XRECHNUNG')
  })

  it('falls back to UNKNOWN with the conservative capability set for an unrecognized guideline', () => {
    const { profile, capabilities } = detectProfile('urn:something:unrecognized:1.0')
    expect(profile).toBe('UNKNOWN')
    expect(capabilities).toEqual({
      hasLineItems: false,
      hasVatBreakdown: false,
      hasPaymentTerms: false,
    })
  })

  it('falls back to UNKNOWN when the guideline is missing entirely', () => {
    expect(detectProfile(undefined).profile).toBe('UNKNOWN')
  })

  it('matches case-insensitively', () => {
    expect(detectProfile('URN:FACTUR-X.EU:1P0:MINIMUM').profile).toBe('MINIMUM')
  })
})
