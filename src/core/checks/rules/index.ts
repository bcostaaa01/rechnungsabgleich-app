import type { Rule } from '@/core/checks/types'
import { lineTotal } from '@/core/checks/rules/line-total'
import { lineSum } from '@/core/checks/rules/line-sum'
import { taxBasis } from '@/core/checks/rules/tax-basis'
import { vatBasis, vatCalculated, vatTotal } from '@/core/checks/rules/vat-per-category'
import { grandTotal } from '@/core/checks/rules/grand-total'
import { duePayable } from '@/core/checks/rules/due-payable'
import { currencyConsistency } from '@/core/checks/rules/currency-consistency'
import { pdfGrandTotal, pdfInvoiceNumber, pdfIban } from '@/core/checks/rules/pdf-cross-check'
import { ibanChecksum } from '@/core/checks/rules/iban-checksum'

export interface RuleEntry {
  id: string
  rule: Rule
  // Plain-language German explanation of what the rule checks -- shown to
  // the user in FindingList.vue and the reference table on the Info page,
  // not just left in code comments.
  descriptionDe: string
  // EN 16931 business rule code, straight from SPEC.md §6's table.
  // Undefined for checks with no direct BR- equivalent.
  businessRule?: string
  // Profile gating (SPEC.md §6): runner.ts filters on these before running,
  // so a MINIMUM/BASIC WL invoice (no lines, and MINIMUM has no VAT
  // breakdown either) doesn't produce false errors from rules that assume
  // structure it doesn't have.
  requiresLineItems?: boolean
  requiresVatBreakdown?: boolean
}

export const rules: RuleEntry[] = [
  {
    id: 'R-LINE-01',
    rule: lineTotal,
    descriptionDe: 'Menge ÷ Basismenge × Einzelpreis muss dem Positions-Nettobetrag entsprechen.',
    requiresLineItems: true,
  },
  {
    id: 'R-SUM-01',
    rule: lineSum,
    descriptionDe: 'Die Summe aller Positions-Nettobeträge muss dem Rechnungs-Nettobetrag entsprechen.',
    businessRule: 'BR-CO-10',
    requiresLineItems: true,
  },
  {
    id: 'R-BASIS-01',
    rule: taxBasis,
    descriptionDe:
      'Nettobetrag minus Abschläge plus Zuschläge muss der Steuerbemessungsgrundlage entsprechen.',
    businessRule: 'BR-CO-13',
  },
  {
    id: 'R-VAT-01',
    rule: vatBasis,
    descriptionDe:
      'Je Steuersatz muss die Summe der zugehörigen Positions-Nettobeträge der angegebenen Bemessungsgrundlage entsprechen.',
    businessRule: 'BR-S-08',
    requiresLineItems: true,
    requiresVatBreakdown: true,
  },
  {
    id: 'R-VAT-02',
    rule: vatCalculated,
    descriptionDe:
      'Je Steuersatz muss Bemessungsgrundlage × Steuersatz ÷ 100 dem angegebenen Steuerbetrag entsprechen.',
    businessRule: 'BR-S-09',
    requiresVatBreakdown: true,
  },
  {
    id: 'R-VAT-03',
    rule: vatTotal,
    descriptionDe: 'Die Summe aller Steuerbeträge muss dem Steuergesamtbetrag entsprechen.',
    requiresVatBreakdown: true,
  },
  {
    id: 'R-TOTAL-01',
    rule: grandTotal,
    descriptionDe: 'Steuerbemessungsgrundlage plus Steuergesamtbetrag muss dem Bruttobetrag entsprechen.',
    businessRule: 'BR-CO-15',
  },
  {
    id: 'R-TOTAL-02',
    rule: duePayable,
    descriptionDe: 'Bruttobetrag minus bereits gezahlter Betrag muss dem Zahlbetrag entsprechen.',
    businessRule: 'BR-CO-16',
  },
  {
    id: 'R-CUR-01',
    rule: currencyConsistency,
    descriptionDe: 'Alle Beträge müssen dieselbe Währung verwenden.',
  },
  {
    id: 'R-PDF-01',
    rule: pdfGrandTotal,
    descriptionDe: 'Der Bruttobetrag muss im sichtbaren PDF-Text auffindbar sein.',
  },
  {
    id: 'R-PDF-02',
    rule: pdfInvoiceNumber,
    descriptionDe: 'Die Rechnungsnummer muss im sichtbaren PDF-Text auffindbar sein.',
  },
  {
    id: 'R-PDF-03',
    rule: pdfIban,
    descriptionDe: 'Die IBAN muss im sichtbaren PDF-Text auffindbar sein.',
  },
  {
    id: 'R-IBAN-01',
    rule: ibanChecksum,
    descriptionDe: 'Die IBAN muss eine gültige Prüfsumme (ISO 7064 MOD-97-10) haben.',
  },
]
