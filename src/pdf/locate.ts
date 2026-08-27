import { formatEUR } from 'zugferd-validator'
import type { Money } from 'zugferd-validator'
import type { PositionedTextItem } from '@/pdf/textLayer'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface LocateMatch {
  page: number // 1-indexed
  rects: Rect[]
}

// Strips the trailing " €" formatEUR always appends -- pdf.js text
// extraction commonly puts the currency symbol in a separate text run with
// different spacing than the amount itself (see pdf-cross-check.ts's own
// heuristic), so searching for the numeric portion alone is what actually
// matches real documents.
export function amountSearchText(amount: Money): string {
  return formatEUR(amount).replace(' €', '')
}

interface ItemRange {
  item: PositionedTextItem
  start: number
  end: number
}

// Same join-with-space + per-item [start,end) convention as
// layersToPlainText, so an item's position in the joined string can be
// mapped back to its geometry.
function buildRanges(items: PositionedTextItem[]): { text: string; ranges: ItemRange[] } {
  let text = ''
  const ranges: ItemRange[] = []

  for (const item of items) {
    if (text.length > 0) text += ' '
    const start = text.length
    text += item.str
    ranges.push({ item, start, end: text.length })
  }

  return { text, ranges }
}

// Bounding box covering every item a single occurrence touches -- a match
// split across adjacent items (the same currency-symbol-style quirk
// pdf-cross-check.ts documents) still needs one coherent box, not one box
// per fragment.
function unionRect(items: PositionedTextItem[]): Rect {
  const left = Math.min(...items.map((item) => item.x))
  const top = Math.min(...items.map((item) => item.y))
  const right = Math.max(...items.map((item) => item.x + item.width))
  const bottom = Math.max(...items.map((item) => item.y + item.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

// Every item whose [start, end) range overlaps [start, end) in the joined
// string, unioned into one rect -- shared by the exact matcher below and
// the whitespace-tolerant IBAN matcher, both of which only differ in how
// they find [start, end) offsets in the first place.
function rectForRange(ranges: ItemRange[], start: number, end: number): Rect | null {
  const coveredItems = ranges
    .filter((range) => range.start < end && range.end > start)
    .map((range) => range.item)
  return coveredItems.length > 0 ? unionRect(coveredItems) : null
}

// Every non-overlapping occurrence on one page, left to right.
function findOccurrences(items: PositionedTextItem[], search: string): Rect[] {
  const { text, ranges } = buildRanges(items)
  const rects: Rect[] = []

  let fromIndex = 0
  for (;;) {
    const matchStart = text.indexOf(search, fromIndex)
    if (matchStart === -1) break
    const matchEnd = matchStart + search.length

    const rect = rectForRange(ranges, matchStart, matchEnd)
    if (rect) rects.push(rect)

    fromIndex = matchEnd
  }

  return rects
}

// Finds the first page with any match, then every occurrence on that page.
// A wrong highlight actively misleads a reviewer, which is worse than
// finding nothing -- showing every occurrence on the matched page lets the
// caller visibly signal ambiguity instead of silently trusting the first
// hit that could be the wrong one.
export function locateText(pages: PositionedTextItem[][], search: string): LocateMatch | null {
  if (search === '') return null

  for (let index = 0; index < pages.length; index++) {
    const rects = findOccurrences(pages[index] ?? [], search)
    if (rects.length > 0) return { page: index + 1, rects }
  }

  return null
}

// Maps every non-space character to its position in the original string,
// so a match found in the stripped text can be mapped back to the
// original, unstripped offsets that ranges (and therefore rectForRange)
// are indexed by. Only literal spaces are stripped -- matches
// buildRanges's own join convention, not tabs/nbsp/hyphens -- a documented
// scoping choice, not an oversight.
function stripSpaces(text: string): { text: string; indexMap: number[] } {
  let stripped = ''
  const indexMap: number[] = []

  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') continue
    stripped += text[i]?.toUpperCase()
    indexMap.push(i)
  }

  return { text: stripped, indexMap }
}

// Invoices print IBANs spaced (`DE89 3704 0044 0532 0130 00`) while the
// XML's IBANID is compact, so exact substring matching (findOccurrences)
// would essentially never match a real invoice. Both the page text and the
// search value are space-stripped and uppercased before searching; matches
// are then mapped back through indexMap to the original positions, so a
// match spanning a stripped-space boundary between two text items is
// covered correctly by construction (rectForRange only ever sees original,
// unstripped offsets).
function findIbanOccurrences(items: PositionedTextItem[], iban: string): Rect[] {
  const { text, ranges } = buildRanges(items)
  const { text: strippedText, indexMap } = stripSpaces(text)
  const strippedSearch = iban.replace(/ /g, '').toUpperCase()
  const rects: Rect[] = []
  if (strippedSearch === '') return rects

  let fromIndex = 0
  for (;;) {
    const matchStart = strippedText.indexOf(strippedSearch, fromIndex)
    if (matchStart === -1) break
    const matchEnd = matchStart + strippedSearch.length

    const originalStart = indexMap[matchStart]
    const originalEnd = indexMap[matchEnd - 1]
    if (originalStart !== undefined && originalEnd !== undefined) {
      const rect = rectForRange(ranges, originalStart, originalEnd + 1)
      if (rect) rects.push(rect)
    }

    fromIndex = matchEnd
  }

  return rects
}

// Whitespace-tolerant counterpart to locateText, for R-IBAN-01's clickable
// finding -- same page-iteration and "first matching page wins" contract.
export function locateIban(pages: PositionedTextItem[][], iban: string): LocateMatch | null {
  if (iban === '') return null

  for (let index = 0; index < pages.length; index++) {
    const rects = findIbanOccurrences(pages[index] ?? [], iban)
    if (rects.length > 0) return { page: index + 1, rects }
  }

  return null
}
