import type { Invoice } from '../cii/types.js'
import type { Money } from '../money.js'

export type Severity = 'error' | 'warning' | 'info'

export type FindingTarget =
  | { kind: 'line'; lineId: string }
  | { kind: 'header' }
  | { kind: 'vat'; category: string }

export interface Finding {
  ruleId: string
  severity: Severity
  target: FindingTarget
  messageDe: string
  expected?: Money
  actual?: Money
  difference?: Money
  // What the click-to-highlight gutter should search the PDF for, when the
  // value isn't itself a Money amount (e.g. R-IBAN-01's printed IBAN).
  // Defaults to 'exact' -- an IBAN needs whitespace-tolerant matching
  // (locateIban in pdf/locate.ts), a plain amount doesn't.
  matchText?: string
  matchKind?: 'exact' | 'iban'
}

export interface CheckContext {
  tolerance: Money
  // Plain concatenated PDF page text, no coordinates -- just enough for
  // R-PDF-01/02's existence checks. Bounding-box location for the
  // click-to-highlight gutter is M4 (pdf/textLayer.ts, pdf/locate.ts).
  // Undefined when there's no PDF loaded at all (standalone XRechnung XML).
  pdfText?: string
}

export type Rule = (invoice: Invoice, ctx: CheckContext) => Finding[]
