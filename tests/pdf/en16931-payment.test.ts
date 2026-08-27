import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Big from 'big.js'
import { describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { findCiiXmlAttachment } from '@/pdf/extractAttachments'
import { getDocumentTextLayers, layersToPlainText } from '@/pdf/textLayer'
import { parseCiiXml, runChecks } from 'zugferd-validator'
import { locateIban } from '@/pdf/locate'

// Same reasoning as the other pdf/ fixture tests: jsdom has no DOMMatrix,
// and the legacy Node build sidesteps needing it.
vi.stubGlobal('DOMMatrix', class DOMMatrix {})

async function loadFixture(name: string): Promise<PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(readFileSync(resolve('tests/fixtures', name)))
  const doc = await pdfjsLib.getDocument({ data }).promise
  return doc as unknown as PDFDocumentProxy
}

// tests/fixtures/en16931-payment.pdf is arithmetically clean otherwise (same
// shape as en16931-sample), with one deliberate defect (see
// tests/fixtures/README.md): the XML's IBANID (DE89370400440532013099) has
// a mutated checksum, and the PDF prints the *same* value, spaced
// (`DE89 3704 0044 0532 0130 99`) -- so R-IBAN-01 fires and is genuinely
// locatable/clickable, while R-PDF-03 correctly stays silent (it's about
// PDF-vs-XML presence, and the two agree here even though the value itself
// is bad). Proves the two rules are properly decoupled, not just that each
// passes in isolation with hand-built Invoice/ctx objects.
describe('en16931-payment.pdf end to end', () => {
  it('runs the full pipeline and surfaces exactly R-IBAN-01, locatable in the PDF', async () => {
    const doc = await loadFixture('en16931-payment.pdf')
    const attachment = await findCiiXmlAttachment(doc)
    expect(attachment).not.toBeNull()

    const invoice = parseCiiXml(attachment!.xml)
    expect(invoice.iban).toBe('DE89370400440532013099')

    const textLayers = await getDocumentTextLayers(doc)
    const pdfText = layersToPlainText(textLayers)
    const findings = runChecks(invoice, { tolerance: new Big('0.01'), pdfText })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: 'R-IBAN-01',
      severity: 'error',
      matchKind: 'iban',
      matchText: 'DE89370400440532013099',
    })

    // The whole point of R-IBAN-01 being clickable: the bad value is
    // genuinely findable on the rendered page, not just a string comparison
    // in isolation.
    const match = locateIban(textLayers, findings[0]!.matchText!)
    expect(match).not.toBeNull()
    expect(match?.page).toBe(1)
    expect(match?.rects.length).toBeGreaterThan(0)
  })
})
