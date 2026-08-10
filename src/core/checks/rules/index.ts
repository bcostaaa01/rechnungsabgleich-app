import type { Rule } from '@/core/checks/types'
import { lineTotal } from '@/core/checks/rules/line-total'
import { lineSum } from '@/core/checks/rules/line-sum'
import { taxBasis } from '@/core/checks/rules/tax-basis'
import { vatBasis, vatCalculated, vatTotal } from '@/core/checks/rules/vat-per-category'
import { grandTotal } from '@/core/checks/rules/grand-total'
import { duePayable } from '@/core/checks/rules/due-payable'
import { currencyConsistency } from '@/core/checks/rules/currency-consistency'
import { pdfGrandTotal, pdfInvoiceNumber } from '@/core/checks/rules/pdf-cross-check'

export interface RuleEntry {
  id: string
  rule: Rule
  // Profile gating (SPEC.md §6): runner.ts filters on these before running,
  // so a MINIMUM/BASIC WL invoice (no lines, and MINIMUM has no VAT
  // breakdown either) doesn't produce false errors from rules that assume
  // structure it doesn't have.
  requiresLineItems?: boolean
  requiresVatBreakdown?: boolean
}

export const rules: RuleEntry[] = [
  { id: 'R-LINE-01', rule: lineTotal, requiresLineItems: true },
  { id: 'R-SUM-01', rule: lineSum, requiresLineItems: true },
  { id: 'R-BASIS-01', rule: taxBasis },
  { id: 'R-VAT-01', rule: vatBasis, requiresLineItems: true, requiresVatBreakdown: true },
  { id: 'R-VAT-02', rule: vatCalculated, requiresVatBreakdown: true },
  { id: 'R-VAT-03', rule: vatTotal, requiresVatBreakdown: true },
  { id: 'R-TOTAL-01', rule: grandTotal },
  { id: 'R-TOTAL-02', rule: duePayable },
  { id: 'R-CUR-01', rule: currencyConsistency },
  { id: 'R-PDF-01', rule: pdfGrandTotal },
  { id: 'R-PDF-02', rule: pdfInvoiceNumber },
]
