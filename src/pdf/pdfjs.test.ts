import { describe, expect, it, vi } from 'vitest'

// jsdom doesn't implement canvas APIs, but pdfjs-dist's browser build
// references DOMMatrix at import time. Stub it here so the module can be
// evaluated under Vitest -- real browser usage is unaffected.
vi.stubGlobal('DOMMatrix', class DOMMatrix {})

describe('pdfjs worker wiring', () => {
  it('resolves the worker to a URL via Vite, matching the pinned pdfjs-dist version', async () => {
    const { pdfjsLib } = await import('./pdfjs')
    const workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc

    expect(typeof workerSrc).toBe('string')
    expect(workerSrc.length).toBeGreaterThan(0)
    // Points at pdfWorkerEntry.ts (which statically imports the pinned
    // pdf.worker.min.mjs), not the vendor file directly -- see that
    // module for why.
    expect(workerSrc).toMatch(/pdfWorkerEntry/)
    expect(pdfjsLib.version).toBe('6.2.108')
  })
})
