import * as pdfjsLib from 'pdfjs-dist'
// Points at our own wrapper (src/pdf/pdfWorkerEntry.ts), not
// pdf.worker.min.mjs directly -- see that file for why (it installs the
// Promise.withResolvers polyfill inside the worker's own realm before
// re-exporting the real worker script). `?worker&url` (not plain `?url`):
// pdf.js wants a URL *string* it constructs its own Worker from, not a
// Worker instance, but a plain `?url` import of a file this small gets
// inlined as a data: URI with the MIME type guessed from the source
// extension -- `.ts` collides with the MPEG transport stream type,
// producing a `data:video/mp2t` URL that isn't a usable module worker
// script. `?worker&url` is Vite's dedicated escape hatch for exactly this
// (a real, separately-bundled worker chunk, returned as its URL rather
// than an already-instantiated Worker).
import workerUrl from '@/pdf/pdfWorkerEntry.ts?worker&url'

// pdfjs-dist is pinned to an exact version in package.json (no caret):
// the worker build loaded here must match the library build exactly, or
// pdf.js fails at runtime with a version-mismatch error.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }
// Re-exported so other pdf/ modules never need to import pdfjs-dist
// directly, even just for types -- this stays the single import point.
export type { PDFDocumentProxy, PDFPageProxy, PageViewport, RenderTask } from 'pdfjs-dist'
export { RenderingCancelledException } from 'pdfjs-dist'
