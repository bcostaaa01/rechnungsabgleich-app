import { isValidIban } from '../../iban.js'
import type { Rule } from '../types.js'

// R-IBAN-01: structural/checksum validity of the invoice's IBAN (ISO 7064
// MOD-97-10 + ISO 13616 shape), independent of the PDF -- catches typos and
// data corruption even when the printed and XML values agree with each
// other. Unlike R-PDF-03, a checksum-invalid IBAN is still presumably
// *printed* somewhere (bad data, not absent data), so this finding carries
// matchText/matchKind so a reviewer can click through and visually compare
// the printed value against a real bank statement.
export const ibanChecksum: Rule = (invoice) => {
  if (invoice.iban === undefined) return []
  if (isValidIban(invoice.iban)) return []

  return [
    {
      ruleId: 'R-IBAN-01',
      severity: 'error' as const,
      target: { kind: 'header' as const },
      messageDe: `IBAN ${invoice.iban} ist ungültig (Prüfsumme stimmt nicht).`,
      matchText: invoice.iban,
      matchKind: 'iban' as const,
    },
  ]
}
