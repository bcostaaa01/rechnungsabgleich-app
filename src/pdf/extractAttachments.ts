import type { PDFDocumentProxy } from '@/pdf/pdfjs'

// Attachment filename varies by ZUGFeRD/Factur-X version -- SPEC.md §3.
// ZUGFeRD-invoice.xml (1.0) and zugferd-invoice.xml (2.0) collapse to the
// same lowercase entry, which is fine: the match is case-insensitive.
const KNOWN_FILENAMES = new Set(['factur-x.xml', 'zugferd-invoice.xml', 'xrechnung.xml'])

export interface CiiAttachment {
  filename: string
  xml: string
}

async function readAttachmentText(doc: PDFDocumentProxy, name: string): Promise<string> {
  const attachments = await doc.getAttachments()
  const content = attachments?.get(name)?.content ?? (await doc.getAttachmentContent(name))
  return new TextDecoder('utf-8').decode(content ?? new Uint8Array())
}

// Finds the embedded CII invoice XML in a loaded PDF. Tries the known
// filenames first, then falls back to any .xml attachment whose content
// looks like a CrossIndustryInvoice -- SPEC.md §3's documented fallback for
// attachments named something else entirely.
export async function findCiiXmlAttachment(doc: PDFDocumentProxy): Promise<CiiAttachment | null> {
  const attachments = await doc.getAttachments()
  if (!attachments) return null

  for (const name of attachments.keys()) {
    if (KNOWN_FILENAMES.has(name.toLowerCase())) {
      return { filename: name, xml: await readAttachmentText(doc, name) }
    }
  }

  for (const name of attachments.keys()) {
    if (!name.toLowerCase().endsWith('.xml')) continue
    const xml = await readAttachmentText(doc, name)
    if (xml.includes('CrossIndustryInvoice')) {
      return { filename: name, xml }
    }
  }

  return null
}
