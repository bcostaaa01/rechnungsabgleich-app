<script setup lang="ts">
import { ref } from 'vue'
import type { Invoice, Finding } from 'zugferd-validator'
import type { PositionReview } from '@/core/review/types'
import { buildKorrekturblatt } from '@/core/review/korrekturblatt'
import { korrekturblattToCsv } from '@/core/review/csv'
import { Button } from '@rechnungsabgleich/design-system'
import { ChevronDown } from '@lucide/vue'

const props = defineProps<{
  invoice: Invoice
  findings: Finding[]
  decisions: Record<string, PositionReview>
}>()

const open = ref(false)

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportCsv() {
  const blatt = buildKorrekturblatt(props.invoice, props.findings, props.decisions)
  downloadFile(
    korrekturblattToCsv(blatt),
    `Korrekturblatt_${props.invoice.invoiceNumber}.csv`,
    'text/csv;charset=utf-8',
  )
  open.value = false
}

function exportJson() {
  const blatt = buildKorrekturblatt(props.invoice, props.findings, props.decisions)
  downloadFile(
    JSON.stringify(blatt, null, 2),
    `Korrekturblatt_${props.invoice.invoiceNumber}.json`,
    'application/json',
  )
  open.value = false
}
</script>

<template>
  <div class="relative" @keydown.escape="open = false">
    <Button
      variant="ghost"
      class="shrink-0 whitespace-nowrap"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      Export
      <ChevronDown :size="14" aria-hidden="true" />
    </Button>
    <div v-if="open" class="fixed inset-0 z-20" @click="open = false" />
    <div
      v-if="open"
      role="menu"
      class="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-border bg-paper py-1 text-sm shadow-sm"
    >
      <button
        type="button"
        role="menuitem"
        class="block w-full px-3 py-1.5 text-left hover:bg-border/40"
        @click="exportCsv"
      >
        Korrekturblatt als CSV
      </button>
      <button
        type="button"
        role="menuitem"
        class="block w-full px-3 py-1.5 text-left hover:bg-border/40"
        @click="exportJson"
      >
        Korrekturblatt als JSON
      </button>
    </div>
  </div>
</template>
