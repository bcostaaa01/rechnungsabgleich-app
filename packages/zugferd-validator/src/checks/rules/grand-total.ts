import { add, formatEUR, round2 } from '../../money.js'
import { compareSeverity } from '../compare.js'
import type { Rule } from '../types.js'

// R-TOTAL-01 (BR-CO-15): TaxBasisTotal + TaxTotal = GrandTotal.
export const grandTotal: Rule = (invoice, ctx) => {
  const { taxBasisTotal, taxTotal, grandTotal: actual } = invoice.totals
  const expected = round2(add(taxBasisTotal, taxTotal))
  const severity = compareSeverity(expected, actual, ctx.tolerance)
  if (severity === null) return []

  return [
    {
      ruleId: 'R-TOTAL-01',
      severity,
      target: { kind: 'header' as const },
      messageDe: `Bruttobetrag stimmt nicht: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(actual)}.`,
      expected,
      actual,
      difference: expected.minus(actual).abs(),
    },
  ]
}
