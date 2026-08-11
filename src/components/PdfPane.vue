<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import type { PDFDocumentProxy, PageViewport, RenderTask } from '@/pdf/pdfjs'
import { RenderingCancelledException } from '@/pdf/pdfjs'
import { renderPageToCanvas } from '@/pdf/renderPage'
import { Button } from '@rechnungsabgleich/design-system'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from '@lucide/vue'

const props = defineProps<{ doc: PDFDocumentProxy | null }>()

const currentPage = ref(1)
const scale = ref(1.25)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const scrollContainerEl = ref<HTMLDivElement | null>(null)
const lastViewport = shallowRef<PageViewport | null>(null)

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.25

// Guards against a stale render overwriting a newer one if the user
// navigates pages faster than a render completes.
let renderToken = 0

// The currently in-flight render, if any. pdf.js rejects `RenderTask.promise`
// (it does not throw synchronously from `page.render()`) when a second
// render targets a canvas that's already mid-render, so every new render
// must cancel whatever's still running first. `.cancel()` on an
// already-settled task is a safe no-op.
let activeRenderTask: RenderTask | null = null

async function render(): Promise<void> {
  const doc = props.doc
  const canvas = canvasEl.value
  if (!doc || !canvas) return

  const token = ++renderToken
  const page = await doc.getPage(currentPage.value)
  if (token !== renderToken) return

  activeRenderTask?.cancel()

  const viewport = page.getViewport({ scale: scale.value })
  lastViewport.value = viewport

  const task = renderPageToCanvas(page, canvas, viewport)
  activeRenderTask = task

  try {
    await task.promise
  } catch (err) {
    if (!(err instanceof RenderingCancelledException)) throw err
  } finally {
    if (activeRenderTask === task) activeRenderTask = null
  }
}

// Re-renders for a new zoom level while keeping the same point on the page
// centred in the viewport. Without this, every zoom step keeps the
// scroll container's raw pixel offset, which now points somewhere
// completely different once the canvas has been resized -- the classic
// "zoom jumps back to the top-left" disorientation.
async function renderPreservingViewCenter() {
  const canvas = canvasEl.value
  const container = scrollContainerEl.value
  if (!canvas || !container || canvas.width === 0 || canvas.height === 0) {
    await render()
    return
  }

  const fractionX = (container.scrollLeft + container.clientWidth / 2) / canvas.width
  const fractionY = (container.scrollTop + container.clientHeight / 2) / canvas.height

  await render()

  container.scrollLeft = fractionX * canvas.width - container.clientWidth / 2
  container.scrollTop = fractionY * canvas.height - container.clientHeight / 2
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

watch(currentPage, () => {
  void render()
})

watch(scale, () => {
  void renderPreservingViewCenter()
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
  <div class="flex h-full min-h-0 flex-col">
    <div v-if="!doc" class="flex flex-1 items-center justify-center text-sm text-muted">
      Kein PDF geladen.
    </div>
    <template v-else>
      <div ref="scrollContainerEl" class="flex min-h-0 flex-1 overflow-auto bg-border/20 p-4">
        <canvas ref="canvasEl" class="m-auto shadow-sm" />
      </div>
      <div class="flex shrink-0 items-center justify-center gap-4 border-t border-border px-3 py-2 text-sm">
        <Button
          variant="ghost"
          :disabled="currentPage <= 1"
          aria-label="Vorherige Seite"
          @click="previousPage"
        >
          <ChevronLeft :size="16" aria-hidden="true" />
        </Button>
        <span class="num">Seite {{ currentPage }} / {{ doc.numPages }}</span>
        <Button
          variant="ghost"
          :disabled="currentPage >= doc.numPages"
          aria-label="Nächste Seite"
          @click="nextPage"
        >
          <ChevronRight :size="16" aria-hidden="true" />
        </Button>
        <span class="mx-2 h-4 border-l border-border" />
        <Button variant="ghost" :disabled="scale <= MIN_SCALE" aria-label="Verkleinern" @click="zoomOut">
          <ZoomOut :size="16" aria-hidden="true" />
        </Button>
        <span class="num w-12 text-center">{{ Math.round(scale * 100) }}%</span>
        <Button variant="ghost" :disabled="scale >= MAX_SCALE" aria-label="Vergrößern" @click="zoomIn">
          <ZoomIn :size="16" aria-hidden="true" />
        </Button>
      </div>
    </template>
  </div>
</template>
