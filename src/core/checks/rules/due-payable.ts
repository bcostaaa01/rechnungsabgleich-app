import Big from 'big.js'
import { formatEUR, round2 } from '@/core/money'
import { compareSeverity } from '@/core/checks/compare'
import type { Rule } from '@/core/checks/types'

// R-TOTAL-02 (BR-CO-16): GrandTotal − TotalPrepaid = DuePayable.
export const duePayable: Rule = (invoice, ctx) => {
  const { grandTotal, totalPrepaid, duePayable: actual } = invoice.totals
  const expected = round2(grandTotal.minus(totalPrepaid ?? new Big(0)))
  const severity = compareSeverity(expected, actual, ctx.tolerance)
  if (severity === null) return []

  return [
    {
      ruleId: 'R-TOTAL-02',
      severity,
      target: { kind: 'header' as const },
      messageDe: `Zahlbetrag stimmt nicht: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(actual)}.`,
      expected,
      actual,
      difference: expected.minus(actual).abs(),
    },
  ]
}
