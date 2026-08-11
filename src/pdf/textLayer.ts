import type { PDFDocumentProxy, PDFPageProxy } from '@/pdf/pdfjs'

export interface PositionedTextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
}

type TextContentItem = Awaited<ReturnType<PDFPageProxy['getTextContent']>>['items'][number]

// getTextContent() is never called with { includeMarkedContent: true }, so
// content.items only ever contains real TextItems in practice -- this guard
// exists for the type system, not to filter anything out at runtime.
function isTextItem(item: TextContentItem): item is Extract<TextContentItem, { str: string }> {
  return 'str' in item
}

// x/y/width/height are raw PDF-space coordinates (getTextContent() takes no
// viewport/scale argument) -- converting to viewport space is PdfPane.vue's
// job, via PageViewport.convertToViewportPoint(), so this module stays
// pdf.js-rendering-free and testable with plain fixtures.
export async function getPageTextItems(page: PDFPageProxy): Promise<PositionedTextItem[]> {
  const content = await page.getTextContent()

  return content.items.filter(isTextItem).map((item) => ({
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width,
    height: item.height,
  }))
}

export async function getDocumentTextLayers(doc: PDFDocumentProxy): Promise<PositionedTextItem[][]> {
  const layers: PositionedTextItem[][] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber)
    layers.push(await getPageTextItems(page))
  }

  return layers
}

export function layersToPlainText(layers: PositionedTextItem[][]): string {
  return layers.map((items) => items.map((item) => item.str).join(' ')).join('\n')
}
