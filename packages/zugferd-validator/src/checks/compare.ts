import { equalWithin } from '../money.js'
import type { Money } from '../money.js'

// Shared by every arithmetic rule instead of repeating the three-way branch:
// exact match -> no finding at all, within tolerance -> warning, else ->
// error. SPEC.md §6: "Differences within tolerance produce a warning, not
// an error -- that distinction is the product thinking."
export function compareSeverity(
  expected: Money,
  actual: Money,
  tolerance: Money,
): 'error' | 'warning' | null {
  if (expected.eq(actual)) return null
  if (equalWithin(expected, actual, tolerance)) return 'warning'
  return 'error'
}
