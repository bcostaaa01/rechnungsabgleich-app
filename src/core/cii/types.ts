import type { Money, Quantity } from '@/core/money'
import type Big from 'big.js'

export type ZugferdProfile =
  | 'MINIMUM'
  | 'BASIC_WL'
  | 'BASIC'
  | 'EN16931'
  | 'EXTENDED'
  | 'XRECHNUNG'
  | 'UNKNOWN'

export interface ProfileCapabilities {
  hasLineItems: boolean
  hasVatBreakdown: boolean
  hasPaymentTerms: boolean
}

// Minimal on purpose -- only what's actually read from the XML so far.
// Extend with address/VAT-ID fields when the UI needs them.
export interface Party {
  name: string
}

export interface InvoiceLine {
  lineId: string
  sellerAssignedId?: string
  name: string
  billedQuantity: Quantity
  unitCode: string
  netUnitPrice: Money
  basisQuantity: Quantity // defaults to 1
  vatRate: Big // percent
  vatCategory: string // S, AE, Z, E, K, G, O …
  lineTotal: Money
}

export interface VatBreakdownEntry {
  category: string
  ratePercent: Big
  basisAmount: Money
  calculatedAmount: Money
}

export interface InvoiceTotals {
  lineTotal: Money
  allowanceTotal: Money | null
  chargeTotal: Money | null
  taxBasisTotal: Money
  taxTotal: Money
  grandTotal: Money
  totalPrepaid: Money | null
  duePayable: Money
}

export interface Invoice {
  profile: ZugferdProfile
  capabilities: ProfileCapabilities
  invoiceNumber: string
  issueDate: Date
  currency: string
  seller: Party
  buyer: Party
  lines: InvoiceLine[] // empty for MINIMUM / BASIC WL
  vatBreakdown: VatBreakdownEntry[]
  totals: InvoiceTotals
  paymentTermsText?: string
}
