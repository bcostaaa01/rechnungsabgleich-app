import './assets/main.css'
import { installPromiseWithResolversPolyfill } from './polyfills/promiseWithResolvers'

// Must run before pdfjs-dist's own code ever executes on the main thread,
// so it happens at the very top of the entry point. See
// src/polyfills/promiseWithResolvers.ts for why this is needed at all, and
// src/pdf/pdfWorkerEntry.ts for the separate install this alone doesn't
// cover (the pdf.js worker runs in its own realm).
installPromiseWithResolversPolyfill()

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
