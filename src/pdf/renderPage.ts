import type { PDFPageProxy, PageViewport, RenderTask } from '@/pdf/pdfjs'

// Fully synchronous: sets the canvas's pixel dimensions and returns the
// RenderTask immediately (before pdf.js's internal same-canvas-in-use check
// has even run), so the caller can track and `.cancel()` it ahead of
// starting a new render, rather than this function swallowing that race
// internally by awaiting its own `.promise`.
export function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  viewport: PageViewport,
): RenderTask {
  canvas.width = viewport.width
  canvas.height = viewport.height

  return page.render({ canvas, viewport })
}
