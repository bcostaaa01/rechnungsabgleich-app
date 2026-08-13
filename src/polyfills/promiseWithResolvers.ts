// pdf.js 6.x calls Promise.withResolvers() pervasively -- both from the
// main-thread library code and independently from inside its own worker
// script. Baseline support only landed in Safari 17.4 (Mar 2024) / Chrome
// 119, so older phones (which, unlike desktop browsers, often go years
// without an update) throw "Promise.withResolvers is not a function".
// A window and a Worker are separate JS realms with independent globals,
// so this must be installed once per realm -- see src/main.ts (window) and
// src/pdf/pdfWorkerEntry.ts (worker).
declare global {
  interface PromiseConstructor {
    withResolvers?<T>(): {
      promise: Promise<T>
      resolve: (value: T | PromiseLike<T>) => void
      reject: (reason?: unknown) => void
    }
  }
}

export function installPromiseWithResolversPolyfill() {
  if (typeof Promise.withResolvers === 'function') return
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
