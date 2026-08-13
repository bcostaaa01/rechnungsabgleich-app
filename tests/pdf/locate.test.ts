import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { amountSearchText, locateIban, locateText } from '@/pdf/locate'
import type { PositionedTextItem } from '@/pdf/textLayer'

function item(str: string, x: number, y: number, width: number, height: number): PositionedTextItem {
  return { str, x, y, width, height }
}

describe('amountSearchText', () => {
  it('formats the amount and strips the trailing currency symbol', () => {
    expect(amountSearchText(new Big('1234.5'))).toBe('1.234,50')
  })

  it('keeps the leading minus for negative amounts', () => {
    expect(amountSearchText(new Big('-42'))).toBe('-42,00')
  })
})

describe('locateText', () => {
  it('returns null for an empty search string', () => {
    expect(locateText([[item('1.234,56', 0, 0, 10, 5)]], '')).toBeNull()
  })

  it('returns null when nothing matches', () => {
    const pages = [[item('Rechnungsnummer 2024-0815', 0, 0, 100, 5)]]
    expect(locateText(pages, '999,99')).toBeNull()
  })

  it('matches a value fully contained in a single item', () => {
    const pages = [[item('Gesamtbetrag: 1.234,56 EUR', 10, 20, 100, 8)]]

    const match = locateText(pages, '1.234,56')

    expect(match).not.toBeNull()
    expect(match?.page).toBe(1)
    expect(match?.rects).toEqual([{ x: 10, y: 20, width: 100, height: 8 }])
  })

  it('matches a search string spanning two adjacent items and unions their rects', () => {
    // Mirrors the currency-symbol quirk pdf-cross-check.ts documents: the
    // amount and the € sign land in separate text runs, joined by our own
    // single space (not necessarily present in the source PDF).
    const pages = [[item('1.234,56', 0, 0, 40, 10), item('€', 45, 2, 6, 8)]]

    const match = locateText(pages, '1.234,56 €')

    expect(match).not.toBeNull()
    expect(match?.rects).toEqual([{ x: 0, y: 0, width: 51, height: 10 }])
  })

  it('finds only the first page with any match', () => {
    const pages = [
      [item('Zwischensumme: 100,00', 0, 0, 50, 5)],
      [item('Gesamtbetrag: 999,00', 0, 0, 50, 5)],
    ]

    const match = locateText(pages, '999,00')

    expect(match?.page).toBe(2)
  })

  it('collects every non-overlapping occurrence on the matched page', () => {
    const pages = [
      [
        item('Position 1: 50,00 EUR', 0, 0, 80, 5),
        item('Position 2: 50,00 EUR', 0, 10, 80, 5),
        item('Summe: 100,00 EUR', 0, 20, 80, 5),
      ],
    ]

    const match = locateText(pages, '50,00')

    expect(match?.page).toBe(1)
    expect(match?.rects).toHaveLength(2)
    expect(match?.rects[0]).toEqual({ x: 0, y: 0, width: 80, height: 5 })
    expect(match?.rects[1]).toEqual({ x: 0, y: 10, width: 80, height: 5 })
  })
})

describe('locateIban', () => {
  it('returns null for an empty search string', () => {
    expect(locateIban([[item('IBAN: DE89 3704 0044 0532 0130 00', 0, 0, 100, 10)]], '')).toBeNull()
  })

  it('returns null for an empty page', () => {
    expect(locateIban([[]], 'DE89370400440532013000')).toBeNull()
  })

  it('returns null when nothing matches', () => {
    const pages = [[item('IBAN: AT61 1904 3002 3457 3201', 0, 0, 100, 10)]]
    expect(locateIban(pages, 'DE89370400440532013000')).toBeNull()
  })

  it('matches a spaced IBAN in the PDF text against a compact XML IBAN, case-insensitively', () => {
    const pages = [[item('iban: de89 3704 0044 0532 0130 00', 0, 0, 100, 10)]]

    const match = locateIban(pages, 'DE89370400440532013000')

    expect(match).not.toBeNull()
    expect(match?.page).toBe(1)
    expect(match?.rects).toEqual([{ x: 0, y: 0, width: 100, height: 10 }])
  })

  it('unions the rects of two items when the match spans them exactly at a stripped-space boundary', () => {
    // The join-inserted space between the two items lands exactly where a
    // real space already sits inside the printed IBAN ("...0044" | "0532...")
    // -- proving the match is correct by construction (range-mapping refers
    // to original, unstripped positions), not by coincidence of layout.
    const pages = [
      [
        item('IBAN: DE89 3704 0044', 0, 0, 100, 10),
        item('0532 0130 00', 110, 0, 60, 10),
      ],
    ]

    const match = locateIban(pages, 'DE89370400440532013000')

    expect(match).not.toBeNull()
    expect(match?.rects).toEqual([{ x: 0, y: 0, width: 170, height: 10 }])
  })

  it('finds only the first page with any match', () => {
    const pages = [
      [item('IBAN: AT61 1904 3002 3457 3201', 0, 0, 100, 5)],
      [item('IBAN: DE89 3704 0044 0532 0130 00', 0, 0, 100, 5)],
    ]

    const match = locateIban(pages, 'DE89370400440532013000')

    expect(match?.page).toBe(2)
  })
})
