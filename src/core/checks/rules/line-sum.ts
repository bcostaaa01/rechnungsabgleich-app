import { add, formatEUR, round2 } from '@/core/money'
import { compareSeverity } from '@/core/checks/compare'
import type { Rule } from '@/core/checks/types'

// R-SUM-01 (BR-CO-10): Σ line totals = header LineTotalAmount.
export const lineSum: Rule = (invoice, ctx) => {
  const expected = round2(add(...invoice.lines.map((line) => line.lineTotal)))
  const actual = invoice.totals.lineTotal
  const severity = compareSeverity(expected, actual, ctx.tolerance)
  if (severity === null) return []

  return [
    {
      ruleId: 'R-SUM-01',
      severity,
      target: { kind: 'header' as const },
      messageDe: `Summe der Positionsbeträge stimmt nicht mit dem Rechnungsbetrag überein: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(actual)}.`,
      expected,
      actual,
      difference: expected.minus(actual).abs(),
    },
  ]
}
