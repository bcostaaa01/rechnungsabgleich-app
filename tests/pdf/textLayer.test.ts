import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { getDocumentTextLayers, layersToPlainText, type PositionedTextItem } from '@/pdf/textLayer'

// Same reasoning as pdfjs.test.ts / extractAttachments.test.ts: jsdom has
// no DOMMatrix, and the legacy Node build sidesteps needing it.
vi.stubGlobal('DOMMatrix', class DOMMatrix {})

async function loadFixture(name: string): Promise<PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(readFileSync(resolve('tests/fixtures', name)))
  const doc = await pdfjsLib.getDocument({ data }).promise
  return doc as unknown as PDFDocumentProxy
}

function item(str: string): PositionedTextItem {
  return { str, x: 0, y: 0, width: 0, height: 0 }
}

describe('getDocumentTextLayers', () => {
  it('extracts positioned text items whose plain text matches the fixture PDF', async () => {
    const doc = await loadFixture('en16931-sample.pdf')
    const layers = await getDocumentTextLayers(doc)
    const text = layersToPlainText(layers)

    expect(text).toContain('2024-0815')
    expect(text).toContain('Egger Bau GmbH')
  })

  it('gives every item real coordinates', async () => {
    const doc = await loadFixture('en16931-sample.pdf')
    const layers = await getDocumentTextLayers(doc)

    expect(layers.length).toBeGreaterThan(0)
    const nonEmptyItem = layers[0]?.find((i) => i.str.length > 0)
    expect(nonEmptyItem).toBeDefined()
    expect(typeof nonEmptyItem?.x).toBe('number')
    expect(typeof nonEmptyItem?.y).toBe('number')
  })
})

describe('layersToPlainText', () => {
  it('joins items on a page with spaces', () => {
    expect(layersToPlainText([[item('Rechnung'), item('Nr.'), item('123')]])).toBe('Rechnung Nr. 123')
  })

  it('joins pages with newlines', () => {
    expect(layersToPlainText([[item('Seite 1')], [item('Seite 2')]])).toBe('Seite 1\nSeite 2')
  })

  it('returns an empty string for no pages', () => {
    expect(layersToPlainText([])).toBe('')
  })

  it('keeps empty-str items instead of filtering them out', () => {
    expect(layersToPlainText([[item('a'), item(''), item('b')]])).toBe('a  b')
  })
})
