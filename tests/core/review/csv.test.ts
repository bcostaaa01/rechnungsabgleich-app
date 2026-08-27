import { describe, expect, it } from 'vitest'
import { korrekturblattToCsv } from '@/core/review/csv'
import { buildKorrekturblatt } from '@/core/review/korrekturblatt'
import { makeInvoice } from './fixtures'

describe('korrekturblattToCsv', () => {
  it('semicolon-delimits and never breaks on the decimal comma in formatted amounts', () => {
    const csv = korrekturblattToCsv(buildKorrekturblatt(makeInvoice(), [], {}))
    const lines = csv.split('\r\n')
    const dataRow = lines.find((line) => line.startsWith('1;'))

    expect(dataRow).toBeDefined()
    // formatEUR renders "1.225,00 €" -- the comma must survive unescaped
    // and unsplit inside its semicolon-delimited field.
    expect(dataRow).toContain('1.225,00 €')
    expect(dataRow?.split(';')).toHaveLength(9)
  })

  it('quotes and escapes a field containing the delimiter', () => {
    const blatt = buildKorrekturblatt(makeInvoice(), [], {
      '1': { status: null, note: 'Rückfrage; bitte prüfen' },
    })
    const csv = korrekturblattToCsv(blatt)

    expect(csv).toContain('"Rückfrage; bitte prüfen"')
  })

  it('quotes and doubles internal quotes in a field containing a double quote', () => {
    const blatt = buildKorrekturblatt(makeInvoice(), [], {
      '1': { status: null, note: 'Lieferant nennt es "Sonderposten"' },
    })
    const csv = korrekturblattToCsv(blatt)

    expect(csv).toContain('"Lieferant nennt es ""Sonderposten"""')
  })

  it('includes invoice metadata and header findings before the line table', () => {
    const blatt = buildKorrekturblatt(
      makeInvoice(),
      [{ ruleId: 'R-TOTAL-01', severity: 'error', target: { kind: 'header' }, messageDe: 'Summe falsch' }],
      {},
    )
    const csv = korrekturblattToCsv(blatt)

    expect(csv).toContain('Rechnungsnummer;2024-0815')
    expect(csv).toContain('Prüfungshinweis (Kopf);Summe falsch')
    expect(csv).toContain('Pos;Bezeichnung;Menge;Einheit;Einzelpreis;Nettobetrag;Status;Notiz;Prüfungshinweise')
  })
})
