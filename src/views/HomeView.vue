<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useInvoiceStore } from '@/stores/invoice'
import DropZone from '@/components/DropZone.vue'
import PdfPane from '@/components/PdfPane.vue'
import PositionTable from '@/components/PositionTable.vue'
import FindingList from '@/components/FindingList.vue'
import ProfileBanner from '@/components/ProfileBanner.vue'
import { Badge, Button, Spinner } from '@rechnungsabgleich/design-system'
import { useFileDrop } from '@/composables/useFileDrop'

const store = useInvoiceStore()
const activeTab = ref<'positionen' | 'pruefung'>('positionen')
const positionenTabRef = ref<HTMLButtonElement | null>(null)
const pruefungTabRef = ref<HTMLButtonElement | null>(null)

const errorCount = computed(() => store.findings.filter((f) => f.severity === 'error').length)

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
    <header v-if="store.invoice" class="flex items-center gap-3 border-b border-border px-4 py-2 text-sm">
      <span class="font-semibold">Rechnung {{ store.invoice.invoiceNumber }}</span>
      <span class="text-muted">·</span>
      <span>{{ store.invoice.seller.name }}</span>
      <Badge tone="neutral">{{ store.invoice.profile }}</Badge>
      <span class="flex-1" />
      <Badge v-if="errorCount > 0" tone="error">{{ errorCount }} Fehler</Badge>
      <span v-else class="text-xs text-muted">Keine Fehler</span>
      <Button variant="ghost" @click="store.reset()">Neue Rechnung laden</Button>
    </header>

    <div v-if="!store.invoice" class="flex flex-1 items-center justify-center p-8">
      <Spinner v-if="store.loading" label="Rechnung wird geladen …" />
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

        <div class="flex border-b border-border text-sm" role="tablist" aria-label="Ansicht">
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
            <FindingList :findings="store.findings" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
