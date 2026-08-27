import { add, formatEUR, multiply, round2 } from '../../money.js'
import { compareSeverity } from '../compare.js'
import type { Rule } from '../types.js'

// R-VAT-01 (BR-S-08): per category+rate, Σ line nets at that rate = BasisAmount.
// Matched on category AND rate, not category alone -- the same category
// (e.g. "S") commonly appears at multiple rates in one invoice (mixed
// 20%/10% construction invoices, SPEC.md §8), and grouping by category
// only would conflate them.
export const vatBasis: Rule = (invoice, ctx) => {
  return invoice.vatBreakdown.flatMap((entry) => {
    const matchingLines = invoice.lines.filter(
      (line) => line.vatCategory === entry.category && line.vatRate.eq(entry.ratePercent),
    )
    const expected = round2(add(...matchingLines.map((line) => line.lineTotal)))
    const severity = compareSeverity(expected, entry.basisAmount, ctx.tolerance)
    if (severity === null) return []

    return [
      {
        ruleId: 'R-VAT-01',
        severity,
        target: { kind: 'vat' as const, category: entry.category },
        messageDe: `Steuerbemessungsgrundlage für ${entry.category} ${entry.ratePercent.toString()}% stimmt nicht: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(entry.basisAmount)}.`,
        expected,
        actual: entry.basisAmount,
        difference: expected.minus(entry.basisAmount).abs(),
      },
    ]
  })
}

// R-VAT-02 (BR-S-09): per category+rate, BasisAmount × Rate ÷ 100 = CalculatedAmount.
export const vatCalculated: Rule = (invoice, ctx) => {
  return invoice.vatBreakdown.flatMap((entry) => {
    const expected = round2(multiply(entry.basisAmount, entry.ratePercent).div(100))
    const severity = compareSeverity(expected, entry.calculatedAmount, ctx.tolerance)
    if (severity === null) return []

    return [
      {
        ruleId: 'R-VAT-02',
        severity,
        target: { kind: 'vat' as const, category: entry.category },
        messageDe: `Steuerbetrag für ${entry.category} ${entry.ratePercent.toString()}% stimmt nicht: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(entry.calculatedAmount)}.`,
        expected,
        actual: entry.calculatedAmount,
        difference: expected.minus(entry.calculatedAmount).abs(),
      },
    ]
  })
}

// R-VAT-03: Σ CalculatedAmount across all VAT breakdown entries = header TaxTotalAmount.
export const vatTotal: Rule = (invoice, ctx) => {
  const expected = round2(add(...invoice.vatBreakdown.map((entry) => entry.calculatedAmount)))
  const actual = invoice.totals.taxTotal
  const severity = compareSeverity(expected, actual, ctx.tolerance)
  if (severity === null) return []

  return [
    {
      ruleId: 'R-VAT-03',
      severity,
      target: { kind: 'header' as const },
      messageDe: `Summe der Steuerbeträge stimmt nicht mit dem Steuergesamtbetrag überein: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(actual)}.`,
      expected,
      actual,
      difference: expected.minus(actual).abs(),
    },
  ]
}
