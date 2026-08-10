<script setup lang="ts">
import { useInvoiceStore } from '@/stores/invoice'

const store = useInvoiceStore()

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void store.loadFromFile(file)
}
</script>

<template>
  <main>
    <h1>rechnungsabgleich</h1>

    <input type="file" accept="application/pdf" @change="onFileChange" />

    <p v-if="store.loading">Lade …</p>
    <p v-if="store.error">{{ store.error }}</p>

    <pre v-if="store.invoice">{{ JSON.stringify(store.invoice, null, 2) }}</pre>
  </main>
</template>
