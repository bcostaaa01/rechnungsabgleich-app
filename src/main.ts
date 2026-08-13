import './assets/main.css'

// pdf.js 6.x calls Promise.withResolvers() throughout its worker/streaming
// code with no fallback. Baseline support only landed in Safari 17.4 (Mar
// 2024) / Chrome 119 -- older phones (which, unlike desktop browsers, often
// go years without an update) throw "Promise.withResolvers is not a
// function" the moment a PDF is loaded. Must run before pdfjs-dist's own
// code ever executes, so it lives at the very top of the entry point.
// tsconfig's lib deliberately stays below es2024 (this is the only ES
// feature this codebase needs from it), so the type is declared locally
// instead of widening `lib` project-wide.
declare global {
  interface PromiseConstructor {
    withResolvers?<T>(): {
      promise: Promise<T>
      resolve: (value: T | PromiseLike<T>) => void
      reject: (reason?: unknown) => void
    }
  }
}

if (typeof Promise.withResolvers !== 'function') {
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

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
