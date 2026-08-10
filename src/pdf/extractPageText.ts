import type { PDFDocumentProxy } from '@/pdf/pdfjs'

// Plain concatenated text across every page -- just enough for R-PDF-01/02's
// existence checks (SPEC.md §6). Positioned text items with coordinates,
// for the click-to-highlight gutter, are a separate concern for M4's
// pdf/textLayer.ts.
export async function extractDocumentText(doc: PDFDocumentProxy): Promise<string> {
  const pageTexts: string[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    pageTexts.push(text)
  }

  return pageTexts.join('\n')
}
