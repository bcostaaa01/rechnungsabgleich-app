import { formatEUR, multiply, round2 } from '@/core/money'
import { compareSeverity } from '@/core/checks/compare'
import type { Rule } from '@/core/checks/types'

// R-LINE-01: BilledQuantity ÷ BasisQuantity × NetUnitPrice = LineTotal.
// The BasisQuantity trap (SPEC.md §3): a unit price may be quoted per N
// units, so dividing by basisQuantity before multiplying is required, not
// optional -- it defaults to 1 in parse.ts, so this reads correctly either
// way.
export const lineTotal: Rule = (invoice, ctx) => {
  return invoice.lines.flatMap((line) => {
    const expected = round2(multiply(line.billedQuantity.div(line.basisQuantity), line.netUnitPrice))
    const actual = line.lineTotal
    const severity = compareSeverity(expected, actual, ctx.tolerance)
    if (severity === null) return []

    return [
      {
        ruleId: 'R-LINE-01',
        severity,
        target: { kind: 'line' as const, lineId: line.lineId },
        messageDe: `Positionsbetrag stimmt nicht: erwartet ${formatEUR(expected)}, angegeben ${formatEUR(actual)}.`,
        expected,
        actual,
        difference: expected.minus(actual).abs(),
      },
    ]
  })
}
