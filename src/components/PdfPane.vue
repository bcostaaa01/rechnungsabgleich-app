<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import type { PDFDocumentProxy, PageViewport, RenderTask } from '@/pdf/pdfjs'
import { RenderingCancelledException } from '@/pdf/pdfjs'
import { renderPageToCanvas } from '@/pdf/renderPage'
import { locateIban, locateText, type LocateMatch, type Rect } from '@/pdf/locate'
import { useInvoiceStore } from '@/stores/invoice'
import { useReviewStore } from '@/stores/review'
import type { ActiveHighlight } from '@/stores/review'
import { Button, Tooltip } from '@rechnungsabgleich/design-system'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from '@lucide/vue'

const props = defineProps<{ doc: PDFDocumentProxy | null }>()

const invoiceStore = useInvoiceStore()
const review = useReviewStore()

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

// Reassigned synchronously as the first action of every render() call
// (before performRender()'s first await), so the activeHighlight watcher
// below can synchronize on "the most recently requested render has
// finished" without racing it -- see that watcher's own comment.
let renderSettled: Promise<void> = Promise.resolve()

function render(): Promise<void> {
  const promise = performRender()
  renderSettled = promise
  return promise
}

async function performRender(): Promise<void> {
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

// PDF-space rect -> viewport-space (CSS pixel) rect. Both corners are
// converted separately, not just the origin with width/height scaled
// afterward: convertToViewportPoint already folds in page rotation, and on
// a 90°/270°-rotated page the rotation matrix swaps the x/y axes, so a
// PDF-space "width" can become a viewport-space *vertical* extent.
function rectToViewport(rect: Rect, viewport: PageViewport): { left: number; top: number; width: number; height: number } {
  const [x1, y1] = viewport.convertToViewportPoint(rect.x, rect.y) as [number, number]
  const [x2, y2] = viewport.convertToViewportPoint(rect.x + rect.width, rect.y + rect.height) as [number, number]
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

// The one place that knows which matcher a highlight needs: 'iban' picks
// the whitespace-tolerant matcher (invoices print IBANs spaced, the XML
// value is compact), everything else uses plain exact-substring matching.
function locateHighlight(highlight: ActiveHighlight): LocateMatch | null {
  return highlight.kind === 'iban'
    ? locateIban(invoiceStore.textLayers, highlight.searchText)
    : locateText(invoiceStore.textLayers, highlight.searchText)
}

// Gated on the match's page equalling currentPage, not just "a match
// exists": while a highlight-triggered page jump is still in flight, this
// renders nothing rather than showing boxes over the wrong page's pixels
// -- it self-corrects reactively the moment currentPage catches up.
const overlayRects = computed(() => {
  const viewport = lastViewport.value
  const highlight = review.activeHighlight
  if (!viewport || !highlight) return []

  const match = locateHighlight(highlight)
  if (!match || match.page !== currentPage.value) return []

  return match.rects.map((rect) => rectToViewport(rect, viewport))
})

// Uses the fixed --color-pdf-highlight-* tokens, not the theme-reactive
// border-error/border-warning/border-ink utilities used elsewhere in the
// UI: this box is drawn on the rendered PDF page, which is real paper and
// stays light regardless of app theme, so the overlay colour must too --
// see tokens.css's comment for the measured dark-mode contrast failure
// this replaced (a near-invisible ~1.03:1 neutral border in dark mode).
const highlightToneClass = computed(() => {
  const tone = review.activeHighlight?.tone
  if (tone === 'error') return 'border-pdf-highlight-error bg-pdf-highlight-error/10'
  if (tone === 'warning') return 'border-pdf-highlight-warning bg-pdf-highlight-warning/10'
  return 'border-pdf-highlight-neutral'
})

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToFirstOverlayBox() {
  const box = scrollContainerEl.value?.querySelector('[data-overlay-index="0"]')
  box?.scrollIntoView({ block: 'center', inline: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

// The one place that owns "the user just asked to look at X". A naive
// `currentPage.value = match.page; await render()` here would race the
// currentPage watcher above -- both would call render(), both increment
// the shared renderToken, and whichever call's getPage() resolves second
// wins, leaving the other's `await render()` resolved without ever having
// rendered anything (lastViewport stays stale). So this never calls
// render() directly: it lets the currentPage watcher be the sole trigger
// and synchronizes via nextTick(), which resolves only after Vue's
// pre-flush watcher queue (where that watcher runs) has been processed --
// by then render()'s first synchronous action has already reassigned
// renderSettled to the real render's promise.
watch(
  () => review.activeHighlight,
  async (highlight) => {
    if (!highlight) return
    const match = locateHighlight(highlight)
    if (!match) return

    if (match.page !== currentPage.value) {
      currentPage.value = match.page
      await nextTick()
    }
    await renderSettled
    await nextTick()
    scrollToFirstOverlayBox()
  },
)

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
        <div
          class="relative m-auto"
          :style="lastViewport ? { width: `${lastViewport.width}px`, height: `${lastViewport.height}px` } : undefined"
        >
          <canvas ref="canvasEl" class="block shadow-sm" />
          <div
            v-for="(rect, index) in overlayRects"
            :key="index"
            :data-overlay-index="index"
            class="pointer-events-none absolute rounded-sm border-2"
            :class="highlightToneClass"
            :style="{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }"
          />
        </div>
      </div>
      <div class="flex shrink-0 items-center justify-center gap-4 border-t border-border px-3 py-2 text-sm">
        <Tooltip label="Vorherige Seite">
          <Button
            variant="ghost"
            :disabled="currentPage <= 1"
            aria-label="Vorherige Seite"
            @click="previousPage"
          >
            <ChevronLeft :size="16" aria-hidden="true" />
          </Button>
        </Tooltip>
        <span class="num">Seite {{ currentPage }} / {{ doc.numPages }}</span>
        <Tooltip label="Nächste Seite">
          <Button
            variant="ghost"
            :disabled="currentPage >= doc.numPages"
            aria-label="Nächste Seite"
            @click="nextPage"
          >
            <ChevronRight :size="16" aria-hidden="true" />
          </Button>
        </Tooltip>
        <span class="mx-2 h-4 border-l border-border" />
        <Tooltip label="Verkleinern">
          <Button variant="ghost" :disabled="scale <= MIN_SCALE" aria-label="Verkleinern" @click="zoomOut">
            <ZoomOut :size="16" aria-hidden="true" />
          </Button>
        </Tooltip>
        <span class="num w-12 text-center">{{ Math.round(scale * 100) }}%</span>
        <Tooltip label="Vergrößern">
          <Button variant="ghost" :disabled="scale >= MAX_SCALE" aria-label="Vergrößern" @click="zoomIn">
            <ZoomIn :size="16" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </template>
  </div>
</template>
