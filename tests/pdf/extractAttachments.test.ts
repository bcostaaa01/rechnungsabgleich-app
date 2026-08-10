import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { findCiiXmlAttachment } from '@/pdf/extractAttachments'

// Same reasoning as pdfjs.test.ts: jsdom has no DOMMatrix, and the legacy
// Node build sidesteps needing it just to load a document and read its
// attachments (no rendering happens here).
vi.stubGlobal('DOMMatrix', class DOMMatrix {})

async function loadFixture(name: string): Promise<PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(readFileSync(resolve('tests/fixtures', name)))
  const doc = await pdfjsLib.getDocument({ data }).promise
  return doc as unknown as PDFDocumentProxy
}

describe('findCiiXmlAttachment', () => {
  it('finds and decodes the factur-x.xml attachment from a real PDF', async () => {
    const doc = await loadFixture('en16931-sample.pdf')
    const attachment = await findCiiXmlAttachment(doc)

    expect(attachment).not.toBeNull()
    expect(attachment?.filename).toBe('factur-x.xml')
    expect(attachment?.xml).toContain('rsm:CrossIndustryInvoice')
    expect(attachment?.xml).toContain('2024-0815')
  })

  it('returns null when the document has no attachments at all', async () => {
    const fakeDoc = { getAttachments: async () => null } as unknown as PDFDocumentProxy
    expect(await findCiiXmlAttachment(fakeDoc)).toBeNull()
  })

  it('returns null when no attachment matches a known name or looks like a CII invoice', async () => {
    const content = new TextEncoder().encode('not xml at all')
    const fakeDoc = {
      getAttachments: async () => new Map([['readme.txt', { content }]]),
    } as unknown as PDFDocumentProxy

    expect(await findCiiXmlAttachment(fakeDoc)).toBeNull()
  })

  it('falls back to any .xml attachment whose content looks like a CrossIndustryInvoice', async () => {
    const xml = '<?xml version="1.0"?><rsm:CrossIndustryInvoice>...</rsm:CrossIndustryInvoice>'
    const content = new TextEncoder().encode(xml)
    const fakeDoc = {
      getAttachments: async () => new Map([['unusual-name.xml', { content }]]),
    } as unknown as PDFDocumentProxy

    const attachment = await findCiiXmlAttachment(fakeDoc)
    expect(attachment?.filename).toBe('unusual-name.xml')
    expect(attachment?.xml).toBe(xml)
  })

  it('matches known filenames case-insensitively (ZUGFeRD 1.0 casing)', async () => {
    const xml = '<rsm:CrossIndustryInvoice/>'
    const content = new TextEncoder().encode(xml)
    const fakeDoc = {
      getAttachments: async () => new Map([['ZUGFeRD-invoice.xml', { content }]]),
    } as unknown as PDFDocumentProxy

    const attachment = await findCiiXmlAttachment(fakeDoc)
    expect(attachment?.filename).toBe('ZUGFeRD-invoice.xml')
  })

  it('falls back to getAttachmentContent when content is not already available', async () => {
    const xml = '<rsm:CrossIndustryInvoice/>'
    const content = new TextEncoder().encode(xml)
    const fakeDoc = {
      getAttachments: async () => new Map([['factur-x.xml', {}]]),
      getAttachmentContent: async () => content,
    } as unknown as PDFDocumentProxy

    const attachment = await findCiiXmlAttachment(fakeDoc)
    expect(attachment?.xml).toBe(xml)
  })
})
