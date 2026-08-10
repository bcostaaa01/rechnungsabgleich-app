import type { ProfileCapabilities, ZugferdProfile } from '@/core/cii/types'

// MINIMUM and BASIC WL carry no line items at all -- BASIC WL ("without
// lines") still has header VAT breakdown and payment terms, MINIMUM has
// neither. Everything else is treated as fully populated. UNKNOWN gets the
// same conservative shape as MINIMUM: parse defensively, run only
// universal checks (SPEC.md §6/§7) rather than raise false errors from
// assuming structure that might not be there.
const CAPABILITIES: Record<ZugferdProfile, ProfileCapabilities> = {
  MINIMUM: { hasLineItems: false, hasVatBreakdown: false, hasPaymentTerms: false },
  BASIC_WL: { hasLineItems: false, hasVatBreakdown: true, hasPaymentTerms: true },
  BASIC: { hasLineItems: true, hasVatBreakdown: true, hasPaymentTerms: true },
  EN16931: { hasLineItems: true, hasVatBreakdown: true, hasPaymentTerms: true },
  EXTENDED: { hasLineItems: true, hasVatBreakdown: true, hasPaymentTerms: true },
  XRECHNUNG: { hasLineItems: true, hasVatBreakdown: true, hasPaymentTerms: true },
  UNKNOWN: { hasLineItems: false, hasVatBreakdown: false, hasPaymentTerms: false },
}

export function detectProfile(guidelineId: string | undefined): {
  profile: ZugferdProfile
  capabilities: ProfileCapabilities
} {
  const profile = classify(guidelineId)
  return { profile, capabilities: CAPABILITIES[profile] }
}

function classify(guidelineId: string | undefined): ZugferdProfile {
  if (!guidelineId) return 'UNKNOWN'
  const id = guidelineId.toLowerCase()

  // Order matters: the Factur-X extended/basic guideline URNs layer their
  // own profile on top of the EN 16931 base guideline, e.g.
  // "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended" --
  // that string contains "en16931" too, so the more specific profiles have
  // to be checked before the generic EN16931 fallback or they'd all
  // misdetect as plain EN16931.
  if (id.includes('xrechnung')) return 'XRECHNUNG'
  if (id.includes('minimum')) return 'MINIMUM'
  if (id.includes('basicwl') || id.includes('basic-wl') || id.includes('basic_wl')) {
    return 'BASIC_WL'
  }
  if (id.includes('basic')) return 'BASIC'
  if (id.includes('extended')) return 'EXTENDED'
  if (id.includes('en16931')) return 'EN16931'
  return 'UNKNOWN'
}
