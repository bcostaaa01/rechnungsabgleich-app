import type { Rule } from '../types.js'

// R-CUR-01: the TaxTotalAmount currencyID must match the header
// InvoiceCurrencyCode. No finding when the attribute is absent -- it's
// optional in CII generally (only mandatory for cross-currency VAT
// scenarios), so absence isn't itself an inconsistency.
export const currencyConsistency: Rule = (invoice) => {
  const { taxTotalCurrencyId } = invoice.totals
  if (taxTotalCurrencyId === undefined || taxTotalCurrencyId === invoice.currency) return []

  return [
    {
      ruleId: 'R-CUR-01',
      severity: 'error',
      target: { kind: 'header' as const },
      messageDe: `Währung uneinheitlich: Rechnungswährung ${invoice.currency}, Steuerbetrag in ${taxTotalCurrencyId} angegeben.`,
    },
  ]
}
