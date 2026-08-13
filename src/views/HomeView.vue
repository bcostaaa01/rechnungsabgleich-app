<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useInvoiceStore } from '@/stores/invoice'
import { useReviewStore } from '@/stores/review'
import { amountSearchText } from '@/pdf/locate'
import { formatIban } from '@/core/iban'
import DropZone from '@/components/DropZone.vue'
import PdfPane from '@/components/PdfPane.vue'
import PositionTable from '@/components/PositionTable.vue'
import FindingList from '@/components/FindingList.vue'
import ProfileBanner from '@/components/ProfileBanner.vue'
import ExportMenu from '@/components/ExportMenu.vue'
import ShortcutOverlay from '@/components/ShortcutOverlay.vue'
import LoadingSteps from '@/components/LoadingSteps.vue'
import { Badge, Button } from '@rechnungsabgleich/design-system'
import { AlertCircle, RotateCcw } from '@lucide/vue'
import { useFileDrop } from '@/composables/useFileDrop'

const store = useInvoiceStore()
const review = useReviewStore()
const activeTab = ref<'positionen' | 'pruefung'>('positionen')
const positionenTabRef = ref<HTMLButtonElement | null>(null)
const pruefungTabRef = ref<HTMLButtonElement | null>(null)
const showShortcuts = ref(false)

const errorCount = computed(() => store.findings.filter((f) => f.severity === 'error').length)
const lineIds = computed(() => store.invoice?.lines.map((line) => line.lineId) ?? [])

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
}

// Mirrors PositionTable.vue's row click -- keyboard nav should drive the
// PDF highlight too, not just the selection ring.
function highlightSelectedLine() {
  const line = store.invoice?.lines.find((l) => l.lineId === review.selectedLineId)
  if (line) review.setHighlight(amountSearchText(line.lineTotal), 'neutral')
}

// SPEC.md §7: "Keyboard: j/k next/previous position, a accept, f flag,
// ? shortcut overlay." Plain, unmodified keys only -- bail on Ctrl/Cmd/Alt
// so browser shortcuts (Ctrl+F, ...) and text entry in the note field keep
// working normally.
function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return
  if (!store.invoice) return

  if (event.key === '?') {
    showShortcuts.value = !showShortcuts.value
  } else if (event.key === 'j') {
    review.selectNext(lineIds.value)
    activeTab.value = 'positionen'
    highlightSelectedLine()
  } else if (event.key === 'k') {
    review.selectPrevious(lineIds.value)
    activeTab.value = 'positionen'
    highlightSelectedLine()
  } else if (event.key === 'a' && review.selectedLineId) {
    review.toggleAccept(review.selectedLineId)
  } else if (event.key === 'f' && review.selectedLineId) {
    review.toggleFlag(review.selectedLineId)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function selectTab(tab: 'positionen' | 'pruefung') {
  activeTab.value = tab
  await nextTick()
  ;(tab === 'positionen' ? positionenTabRef : pruefungTabRef).value?.focus()
}

// WAI-ARIA APG tabs pattern, automatic activation: arrow keys both switch
// the active tab and move focus, rather than requiring a separate
// activation step.
function onTabKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  void selectTab(activeTab.value === 'positionen' ? 'pruefung' : 'positionen')
}

function onFileSelect(file: File) {
  void store.loadFromFile(file)
}

const {
  isDragging: isDraggingReplacement,
  onDragEnter: onReplaceDragEnter,
  onDragLeave: onReplaceDragLeave,
  onDrop: onReplaceDrop,
} = useFileDrop((file) => store.loadFromFile(file))
</script>

<template>
  <div class="flex h-full flex-col">
    <header
      v-if="store.invoice"
      class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2 text-sm"
    >
      <span class="flex items-center gap-2 whitespace-nowrap">
        <span class="font-semibold">Rechnung {{ store.invoice.invoiceNumber }}</span>
        <span class="text-muted">·</span>
        <span>{{ store.invoice.seller.name }}</span>
      </span>
      <Badge tone="neutral">{{ store.invoice.profile }}</Badge>
      <span v-if="store.invoice.iban" class="whitespace-nowrap text-muted">
        IBAN <span class="num text-ink">{{ formatIban(store.invoice.iban) }}</span>
      </span>
      <span class="flex-1" />
      <Badge v-if="errorCount > 0" tone="error" class="shrink-0 gap-1 whitespace-nowrap">
        <AlertCircle :size="12" aria-hidden="true" />
        {{ errorCount }} Fehler
      </Badge>
      <span v-else class="shrink-0 text-xs whitespace-nowrap text-muted">Keine Fehler</span>
      <Button variant="ghost" class="shrink-0 whitespace-nowrap" @click="store.reset()">
        <RotateCcw :size="14" aria-hidden="true" />
        Neue Rechnung laden
      </Button>
    </header>

    <div v-if="!store.invoice" class="flex flex-1 items-center justify-center p-8">
      <LoadingSteps v-if="store.loading" :current-step="store.loadingStep" />
      <div v-else class="w-full max-w-md">
        <DropZone @select="onFileSelect" />
        <p v-if="store.error" class="mt-4 text-center text-sm text-error">{{ store.error }}</p>
      </div>
    </div>

    <div
      v-else
      class="relative grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2"
      @dragenter.prevent="onReplaceDragEnter"
      @dragover.prevent
      @dragleave.prevent="onReplaceDragLeave"
      @drop.prevent="onReplaceDrop"
    >
      <div
        v-if="isDraggingReplacement"
        class="absolute inset-0 z-10 flex items-center justify-center bg-paper/90 text-sm font-medium"
      >
        Datei hier ablegen, um sie zu laden
      </div>
      <PdfPane :doc="store.doc" />

      <div class="flex flex-col overflow-hidden border-border lg:border-l">
        <ProfileBanner :profile="store.invoice.profile" :capabilities="store.invoice.capabilities" />

        <div class="flex items-center justify-between border-b border-border text-sm">
          <div class="flex" role="tablist" aria-label="Ansicht">
            <button
              id="tab-positionen"
              ref="positionenTabRef"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'positionen'"
              aria-controls="panel-positionen"
              :tabindex="activeTab === 'positionen' ? 0 : -1"
              class="px-4 py-2"
              :class="activeTab === 'positionen' ? 'border-b-2 border-ink font-semibold' : 'text-muted'"
              @click="selectTab('positionen')"
              @keydown="onTabKeydown"
            >
              Positionen
            </button>
            <button
              id="tab-pruefung"
              ref="pruefungTabRef"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'pruefung'"
              aria-controls="panel-pruefung"
              :tabindex="activeTab === 'pruefung' ? 0 : -1"
              class="px-4 py-2"
              :class="activeTab === 'pruefung' ? 'border-b-2 border-ink font-semibold' : 'text-muted'"
              @click="selectTab('pruefung')"
              @keydown="onTabKeydown"
            >
              Prüfung
            </button>
          </div>
          <div class="flex items-center gap-2 px-2">
            <Button
              v-if="store.invoice.lines.length > 0"
              variant="ghost"
              class="shrink-0 whitespace-nowrap"
              @click="review.acceptAll(lineIds)"
            >
              Alle akzeptieren
            </Button>
            <ExportMenu :invoice="store.invoice" :findings="store.findings" :decisions="review.decisions" />
          </div>
        </div>

        <div class="flex-1 overflow-auto">
          <div
            v-if="activeTab === 'positionen'"
            id="panel-positionen"
            role="tabpanel"
            aria-labelledby="tab-positionen"
          >
            <PositionTable :lines="store.invoice.lines" :findings="store.findings" />
          </div>
          <div v-else id="panel-pruefung" role="tabpanel" aria-labelledby="tab-pruefung">
            <FindingList :findings="store.findings" @show-position="activeTab = 'positionen'" />
          </div>
        </div>
      </div>
    </div>

    <ShortcutOverlay v-if="showShortcuts" @close="showShortcuts = false" />
  </div>
</template>
