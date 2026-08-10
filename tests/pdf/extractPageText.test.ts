import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { extractDocumentText } from '@/pdf/extractPageText'

// Same reasoning as pdfjs.test.ts / extractAttachments.test.ts: jsdom has
// no DOMMatrix, and the legacy Node build sidesteps needing it.
vi.stubGlobal('DOMMatrix', class DOMMatrix {})

async function loadFixture(name: string): Promise<PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(readFileSync(resolve('tests/fixtures', name)))
  const doc = await pdfjsLib.getDocument({ data }).promise
  return doc as unknown as PDFDocumentProxy
}

describe('extractDocumentText', () => {
  it('extracts the visible text from the fixture PDF', async () => {
    const doc = await loadFixture('en16931-sample.pdf')
    const text = await extractDocumentText(doc)

    expect(text).toContain('2024-0815')
    expect(text).toContain('Egger Bau GmbH')
  })
})
