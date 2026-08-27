import Big from 'big.js'
import { formatEUR, round2 } from '../../money.js'
import { compareSeverity } from '../compare.js'
import type { Rule } from '../types.js'

// R-BASIS-01 (BR-CO-13): LineTotal − AllowanceTotal + ChargeTotal = TaxBasisTotal.
// Operates purely on header totals, not lines -- runs even on MINIMUM,
// which has no line items but does have these totals.
export const taxBasis: Rule = (invoice, ctx) => {
  const { lineTotal, allowanceTotal, chargeTotal, taxBasisTotal } = invoice.totals
  const expected = round2(lineTotal.minus(allowanceTotal ?? new Big(0)).plus(chargeTotal ?? new Big(0)))
  const severity = compareSeverity(expected, taxBasisTotal, ctx.tolerance)
  if (severity === null) return []

  return [
    {
      ruleId: 'R-BASIS-01',
      severity,
      target: { kind: 'header' as const },
      messageDe: `Steuerbemessungsgrundlage stimmt nicht: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(taxBasisTotal)}.`,
      expected,
      actual: taxBasisTotal,
      difference: expected.minus(taxBasisTotal).abs(),
    },
  ]
}
