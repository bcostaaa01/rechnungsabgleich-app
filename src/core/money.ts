import Big from 'big.js'

// The only module that imports big.js (SPEC.md §5). Amounts and quantities
// from the XML are never plain `number` -- unit prices may carry four
// decimal places (BT-146) and integer cents can't represent a price like
// EUR 0,0375 per piece without a second scaling concept, so everything
// money-shaped is parsed to Big and stays Big until formatted for display.

export type Money = Big
export type Quantity = Big

export function parseAmount(raw: string | undefined): Money | null {
  if (raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  try {
    return new Big(trimmed)
  } catch {
    return null
  }
}

export function add(...values: Money[]): Money {
  return values.reduce<Money>((sum, value) => sum.plus(value), new Big(0))
}

export function multiply(a: Money, b: Quantity): Money {
  return a.times(b)
}

// Half-up, rounding away from zero on ties -- "kaufmaennisch". EN 16931
// doesn't mandate a rounding method, which is exactly why tolerances exist;
// this is a documented choice, not an assumption.
export function round2(value: Money): Money {
  return value.round(2, Big.roundHalfUp)
}

export function equalWithin(a: Money, b: Money, tolerance: Money): boolean {
  return a.minus(b).abs().lte(tolerance)
}

export function formatEUR(value: Money): string {
  const rounded = round2(value)
  const negative = rounded.lt(0)
  const [intPart, decPart] = rounded.abs().toFixed(2).split('.') as [string, string]
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}${withThousands},${decPart} €`
}
