// Public API. Anything not re-exported here (e.g. checks/compare.ts's
// compareSeverity) is package-internal, not part of the contract.

export type { Money, Quantity } from './money.js'
export {
  parseAmount,
  add,
  multiply,
  round2,
  equalWithin,
  formatEUR,
  formatQuantity,
} from './money.js'

export { isValidIban, formatIban } from './iban.js'

export type {
  ZugferdProfile,
  ProfileCapabilities,
  Party,
  InvoiceLine,
  VatBreakdownEntry,
  InvoiceTotals,
  Invoice,
} from './cii/types.js'
export { parseCiiXml } from './cii/parse.js'
export { detectProfile } from './cii/profile.js'
export { unitLabel } from './cii/units.js'

export type { Severity, FindingTarget, Finding, CheckContext, Rule } from './checks/types.js'
export { runChecks } from './checks/runner.js'
export { rules, type RuleEntry } from './checks/rules/index.js'
