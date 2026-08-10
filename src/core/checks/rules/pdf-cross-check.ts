import { formatEUR } from '@/core/money'
import type { Rule } from '@/core/checks/types'

// R-PDF-01/02 are the only checks crossing the PDF/XML boundary -- a
// mismatch here means the visible document says something different from
// the data a system will book, the exact failure mode this app is named
// after (SPEC.md §6). Existence checks only, no coordinates -- bounding-box
// location for the click-to-highlight gutter is M4 (pdf/textLayer.ts,
// pdf/locate.ts). Neither rule produces a finding when there's no PDF
// loaded at all (ctx.pdfText undefined -- e.g. standalone XRechnung XML).

// R-PDF-01: does the formatted GrandTotal appear in the PDF's extracted text?
export const pdfGrandTotal: Rule = (invoice, ctx) => {
  if (ctx.pdfText === undefined) return []

  // Strip the trailing " €": pdf.js text extraction commonly puts the
  // currency symbol in a separate text run with different spacing, so
  // matching just the numeric portion is the realistic heuristic --
  // SPEC.md's own documented limitation that this matching is heuristic.
  const formatted = formatEUR(invoice.totals.grandTotal).replace(' €', '')
  if (ctx.pdfText.includes(formatted)) return []

  return [
    {
      ruleId: 'R-PDF-01',
      severity: 'error' as const,
      target: { kind: 'header' as const },
      messageDe: `Bruttobetrag ${formatEUR(invoice.totals.grandTotal)} wurde im PDF-Text nicht gefunden.`,
      expected: invoice.totals.grandTotal,
    },
  ]
}

// R-PDF-02: does the invoice number appear in the PDF's extracted text?
export const pdfInvoiceNumber: Rule = (invoice, ctx) => {
  if (ctx.pdfText === undefined) return []
  if (ctx.pdfText.includes(invoice.invoiceNumber)) return []

  return [
    {
      ruleId: 'R-PDF-02',
      severity: 'error' as const,
      target: { kind: 'header' as const },
      messageDe: `Rechnungsnummer ${invoice.invoiceNumber} wurde im PDF-Text nicht gefunden.`,
    },
  ]
}
