<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { renderPageToCanvas } from '@/pdf/renderPage'

const props = defineProps<{ doc: PDFDocumentProxy | null }>()

const currentPage = ref(1)
const scale = ref(1.25)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.25

// Guards against a stale render overwriting a newer one if the user
// navigates pages faster than a render completes.
let renderToken = 0

async function render() {
  const doc = props.doc
  const canvas = canvasEl.value
  if (!doc || !canvas) return

  const token = ++renderToken
  const page = await doc.getPage(currentPage.value)
  if (token !== renderToken) return
  await renderPageToCanvas(page, canvas, scale.value)
}

onMounted(() => {
  void render()
})

watch(
  () => props.doc,
  () => {
    currentPage.value = 1
    void render()
  },
)

watch([currentPage, scale], () => {
  void render()
})

function previousPage() {
  if (currentPage.value > 1) currentPage.value -= 1
}

function nextPage() {
  if (props.doc && currentPage.value < props.doc.numPages) currentPage.value += 1
}

function zoomOut() {
  scale.value = Math.max(MIN_SCALE, scale.value - SCALE_STEP)
}

function zoomIn() {
  scale.value = Math.min(MAX_SCALE, scale.value + SCALE_STEP)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div v-if="!doc" class="flex flex-1 items-center justify-center text-sm text-muted">
      Kein PDF geladen.
    </div>
    <template v-else>
      <div class="flex flex-1 items-center justify-center overflow-auto bg-border/20 p-4">
        <canvas ref="canvasEl" class="shadow-sm" />
      </div>
      <div class="flex items-center justify-center gap-4 border-t border-border px-3 py-2 text-sm">
        <button
          type="button"
          class="rounded px-2 py-1 disabled:opacity-40"
          :disabled="currentPage <= 1"
          @click="previousPage"
        >
          ◀
        </button>
        <span class="num">Seite {{ currentPage }} / {{ doc.numPages }}</span>
        <button
          type="button"
          class="rounded px-2 py-1 disabled:opacity-40"
          :disabled="currentPage >= doc.numPages"
          @click="nextPage"
        >
          ▶
        </button>
        <span class="mx-2 h-4 border-l border-border" />
        <button type="button" class="rounded px-2 py-1" @click="zoomOut">−</button>
        <button type="button" class="rounded px-2 py-1" @click="zoomIn">+</button>
      </div>
    </template>
  </div>
</template>
