<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInvoiceStore } from '@/stores/invoice'
import DropZone from '@/components/DropZone.vue'
import PdfPane from '@/components/PdfPane.vue'
import PositionTable from '@/components/PositionTable.vue'
import FindingList from '@/components/FindingList.vue'
import ProfileBanner from '@/components/ProfileBanner.vue'
import { Badge, Button } from '@rechnungsabgleich/design-system'

const store = useInvoiceStore()
const activeTab = ref<'positionen' | 'pruefung'>('positionen')

const errorCount = computed(() => store.findings.filter((f) => f.severity === 'error').length)

function onFileSelect(file: File) {
  void store.loadFromFile(file)
}
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
      <p v-if="store.loading" class="text-sm text-muted">Lade …</p>
      <div v-else class="w-full max-w-md">
        <DropZone @select="onFileSelect" />
        <p v-if="store.error" class="mt-4 text-center text-sm text-error">{{ store.error }}</p>
      </div>
    </div>

    <div v-else class="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
      <PdfPane :doc="store.doc" />

      <div class="flex flex-col overflow-hidden border-border lg:border-l">
        <ProfileBanner :profile="store.invoice.profile" :capabilities="store.invoice.capabilities" />

        <div class="flex border-b border-border text-sm">
          <button
            type="button"
            class="px-4 py-2"
            :class="activeTab === 'positionen' ? 'border-b-2 border-ink font-semibold' : 'text-muted'"
            @click="activeTab = 'positionen'"
          >
            Positionen
          </button>
          <button
            type="button"
            class="px-4 py-2"
            :class="activeTab === 'pruefung' ? 'border-b-2 border-ink font-semibold' : 'text-muted'"
            @click="activeTab = 'pruefung'"
          >
            Prüfung
          </button>
        </div>

        <div class="flex-1 overflow-auto">
          <PositionTable v-if="activeTab === 'positionen'" :lines="store.invoice.lines" />
          <FindingList v-else :findings="store.findings" />
        </div>
      </div>
    </div>
  </div>
</template>
