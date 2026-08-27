import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Big from 'big.js'
import { describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { findCiiXmlAttachment } from '@/pdf/extractAttachments'
import { getDocumentTextLayers, layersToPlainText } from '@/pdf/textLayer'
import { parseCiiXml, runChecks } from 'zugferd-validator'

// Same reasoning as the other pdf/ fixture tests: jsdom has no DOMMatrix,
// and the legacy Node build sidesteps needing it.
vi.stubGlobal('DOMMatrix', class DOMMatrix {})

async function loadFixture(name: string): Promise<PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(readFileSync(resolve('tests/fixtures', name)))
  const doc = await pdfjsLib.getDocument({ data }).promise
  return doc as unknown as PDFDocumentProxy
}

// tests/fixtures/en16931-broken.pdf carries two deliberate defects (see
// tests/fixtures/README.md): line 1's stored LineTotalAmount doesn't
// multiply out (1200.00 instead of 12.5 x 98.00 = 1225.00), and the
// printed grand total (2.700,00 EUR) disagrees with the XML's
// GrandTotalAmount (2746.00) -- the flagship PDF-vs-XML mismatch. This
// test proves the full pipeline (extract -> parse -> checks) actually
// catches both, end to end, against a real PDF -- not just that the
// individual rules pass in isolation with hand-built Invoice objects.
describe('en16931-broken.pdf end to end', () => {
  it('runs the full pipeline and surfaces the expected findings', async () => {
    const doc = await loadFixture('en16931-broken.pdf')
    const attachment = await findCiiXmlAttachment(doc)
    expect(attachment).not.toBeNull()

    const invoice = parseCiiXml(attachment!.xml)
    const pdfText = layersToPlainText(await getDocumentTextLayers(doc))
    const findings = runChecks(invoice, { tolerance: new Big('0.01'), pdfText })

    const findingsByRule = new Map(findings.map((f) => [f.ruleId, f]))

    // The line-total bug cascades exactly as documented: R-LINE-01 (the
    // line itself), R-SUM-01 (header lineTotal no longer matches the
    // actual sum), and R-VAT-01 (the 20% basis no longer matches the sum
    // of lines at that rate) -- all from one edited field.
    expect(findingsByRule.get('R-LINE-01')).toMatchObject({
      severity: 'error',
      target: { kind: 'line', lineId: '1' },
    })
    expect(findingsByRule.get('R-SUM-01')).toMatchObject({ severity: 'error' })
    expect(findingsByRule.get('R-VAT-01')).toMatchObject({ severity: 'error' })

    // The PDF-vs-XML grand total mismatch, independent of the line bug.
    expect(findingsByRule.get('R-PDF-01')).toMatchObject({ severity: 'error' })

    // Everything else about the document is internally consistent and
    // should stay clean -- this isn't just "does it find errors", it's
    // "does it find exactly the right ones and nothing else".
    expect(findingsByRule.has('R-BASIS-01')).toBe(false)
    expect(findingsByRule.has('R-VAT-02')).toBe(false)
    expect(findingsByRule.has('R-VAT-03')).toBe(false)
    expect(findingsByRule.has('R-TOTAL-01')).toBe(false)
    expect(findingsByRule.has('R-TOTAL-02')).toBe(false)
    expect(findingsByRule.has('R-CUR-01')).toBe(false)
    expect(findingsByRule.has('R-PDF-02')).toBe(false)

    expect(findings).toHaveLength(4)
  })
})
