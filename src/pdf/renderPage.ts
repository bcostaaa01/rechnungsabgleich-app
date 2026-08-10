import type { PDFPageProxy } from '@/pdf/pdfjs'

// Renders a page to a canvas at the given scale. No unit test for this one
// -- jsdom has no canvas implementation without the native `canvas` npm
// package, and SPEC.md §4 already scopes rendering as "hard to test,"
// living outside core/ without a testing mandate.
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<void> {
  const viewport = page.getViewport({ scale })
  canvas.width = viewport.width
  canvas.height = viewport.height

  const renderTask = page.render({ canvas, viewport })
  await renderTask.promise
}
