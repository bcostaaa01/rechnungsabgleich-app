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
    expect(workerSrc).toMatch(/pdf\.worker\.min\.mjs$/)
    expect(pdfjsLib.version).toBe('6.2.108')
  })
})
