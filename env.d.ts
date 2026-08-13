/// <reference types="vite/client" />

// pdfWorkerEntry.ts dynamically imports this for its side effects only
// (registering the worker's onmessage handler) -- pdfjs-dist ships no
// types for the vendor .mjs path itself, only for the package's main
// entry.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs'
