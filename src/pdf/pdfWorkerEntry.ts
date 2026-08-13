import { installPromiseWithResolversPolyfill } from '@/polyfills/promiseWithResolvers'

// This is the module pdfjs.ts actually points GlobalWorkerOptions.workerSrc
// at, instead of pdf.worker.min.mjs directly. It's loaded two different
// ways depending on the browser: `new Worker(url, { type: 'module' })`
// (its own JS realm, separate globals from the page) when module workers
// are supported, or `import(url)` on the main thread as a fallback
// otherwise. Either way, whatever realm ends up running this file is the
// one that needs the polyfill -- installing it in src/main.ts alone never
// reaches the Worker case.
//
// A plain static import is fine here despite pdf.worker.min.mjs's own
// module-level code running before this file's own statements (import
// evaluation order, and Vite/Rolldown's bundler inlines this single-
// consumer import into straight-line code regardless): none of
// pdf.worker's Promise.withResolvers() calls fire from top-level module
// evaluation, only from inside methods/constructors triggered by an
// incoming postMessage -- and no message can be dispatched into a worker
// until its whole script has finished this synchronous initial run.
// Installing the polyfill anywhere in that run, before the event loop
// gets a chance to deliver the first message, is enough.
installPromiseWithResolversPolyfill()

import 'pdfjs-dist/build/pdf.worker.min.mjs'
