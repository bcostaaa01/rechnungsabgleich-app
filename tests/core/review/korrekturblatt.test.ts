import { describe, expect, it } from 'vitest'
import { buildKorrekturblatt } from '@/core/review/korrekturblatt'
import type { PositionReview } from '@/core/review/types'
import type { Finding } from '@/core/checks/types'
import { makeInvoice } from '../checks/fixtures'

describe('buildKorrekturblatt', () => {
  it('defaults every line to unentschieden with no note when there are no decisions', () => {
    const blatt = buildKorrekturblatt(makeInvoice(), [], {})

    expect(blatt.lines).toHaveLength(2)
    expect(blatt.lines[0]).toMatchObject({ status: 'unentschieden', note: '', findings: [] })
    expect(blatt.lines[1]).toMatchObject({ status: 'unentschieden', note: '', findings: [] })
  })

  it('maps accepted/flagged decisions and carries the note through', () => {
    const decisions: Record<string, PositionReview> = {
      '1': { status: 'accepted', note: '' },
      '2': { status: 'flagged', note: 'Preis mit Lieferant klären' },
    }
    const blatt = buildKorrekturblatt(makeInvoice(), [], decisions)

    expect(blatt.lines[0]).toMatchObject({ lineId: '1', status: 'akzeptiert' })
    expect(blatt.lines[1]).toMatchObject({
      lineId: '2',
      status: 'geflaggt',
      note: 'Preis mit Lieferant klären',
    })
  })

  it('sorts findings onto the line they target, and the rest into headerFindings', () => {
    const findings: Finding[] = [
      { ruleId: 'R-LINE-01', severity: 'error', target: { kind: 'line', lineId: '1' }, messageDe: 'Zeile 1 falsch' },
      { ruleId: 'R-TOTAL-01', severity: 'error', target: { kind: 'header' }, messageDe: 'Summe falsch' },
      { ruleId: 'R-VAT-01', severity: 'warning', target: { kind: 'vat', category: 'S' }, messageDe: 'USt. weicht ab' },
    ]
    const blatt = buildKorrekturblatt(makeInvoice(), findings, {})

    expect(blatt.lines[0]?.findings).toEqual(['Zeile 1 falsch'])
    expect(blatt.lines[1]?.findings).toEqual([])
    expect(blatt.headerFindings).toEqual(['Summe falsch', 'USt. weicht ab'])
  })

  it('carries invoice header fields through as plain, formatted strings', () => {
    const blatt = buildKorrekturblatt(makeInvoice(), [], {})

    expect(blatt.invoiceNumber).toBe('2024-0815')
    expect(blatt.seller).toBe('Egger Bau GmbH')
    expect(blatt.profile).toBe('EN16931')
    expect(blatt.issueDate).toBe('2024-08-15')
  })
})
