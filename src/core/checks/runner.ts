import type { Invoice } from '@/core/cii/types'
import type { CheckContext, Finding } from '@/core/checks/types'
import { rules } from '@/core/checks/rules'

export function runChecks(invoice: Invoice, ctx: CheckContext): Finding[] {
  return rules
    .filter((entry) => {
      if (entry.requiresLineItems && !invoice.capabilities.hasLineItems) return false
      if (entry.requiresVatBreakdown && !invoice.capabilities.hasVatBreakdown) return false
      return true
    })
    .flatMap((entry) => entry.rule(invoice, ctx))
}
