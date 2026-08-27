import type { Invoice } from '../cii/types.js'
import type { CheckContext, Finding } from './types.js'
import { rules } from './rules/index.js'

export function runChecks(invoice: Invoice, ctx: CheckContext): Finding[] {
  return rules
    .filter((entry) => {
      if (entry.requiresLineItems && !invoice.capabilities.hasLineItems) return false
      if (entry.requiresVatBreakdown && !invoice.capabilities.hasVatBreakdown) return false
      return true
    })
    .flatMap((entry) => entry.rule(invoice, ctx))
}
