import type { Invoice } from '@/core/cii/types'
import type { Money } from '@/core/money'

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
