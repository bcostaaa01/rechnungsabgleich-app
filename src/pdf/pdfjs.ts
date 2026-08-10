import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// pdfjs-dist is pinned to an exact version in package.json (no caret):
// the worker build loaded here must match the library build exactly, or
// pdf.js fails at runtime with a version-mismatch error.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }
