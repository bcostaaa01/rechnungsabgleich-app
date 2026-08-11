import { formatEUR } from '@/core/money'
import type { Money } from '@/core/money'
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

// Every non-overlapping occurrence on one page, left to right.
function findOccurrences(items: PositionedTextItem[], search: string): Rect[] {
  const { text, ranges } = buildRanges(items)
  const rects: Rect[] = []

  let fromIndex = 0
  for (;;) {
    const matchStart = text.indexOf(search, fromIndex)
    if (matchStart === -1) break
    const matchEnd = matchStart + search.length

    const coveredItems = ranges
      .filter((range) => range.start < matchEnd && range.end > matchStart)
      .map((range) => range.item)
    if (coveredItems.length > 0) rects.push(unionRect(coveredItems))

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
