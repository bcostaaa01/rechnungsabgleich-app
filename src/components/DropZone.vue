<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@rechnungsabgleich/design-system'
import { Upload } from '@lucide/vue'
import { useFileDrop } from '@/composables/useFileDrop'

const emit = defineEmits<{ select: [file: File] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const loadingSample = ref(false)
const { isDragging, onDragEnter, onDragLeave, onDrop } = useFileDrop((file) => emit('select', file))

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('select', file)
  input.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}

// Gives immediate feedback on click -- otherwise the button sits idle
// during the fetch, before store.loading even exists to show its own
// spinner, and a click can look like it did nothing.
async function loadSample() {
  loadingSample.value = true
  try {
    const response = await fetch('/beispielrechnung.pdf')
    const blob = await response.blob()
    emit('select', new File([blob], 'beispielrechnung.pdf', { type: 'application/pdf' }))
  } finally {
    loadingSample.value = false
  }
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-colors"
    :class="isDragging ? 'border-ink bg-border/20' : 'border-border'"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <Upload :size="32" class="text-muted" aria-hidden="true" />
    <p class="text-sm text-muted">PDF-Rechnung hierher ziehen oder</p>
    <Button variant="primary" @click="openFilePicker">Datei auswählen</Button>
    <input
      ref="fileInput"
      type="file"
      accept="application/pdf"
      class="sr-only"
      @change="onFileInputChange"
    />
    <Button variant="ghost" :disabled="loadingSample" @click="loadSample">
      {{ loadingSample ? 'Wird geladen …' : 'Beispielrechnung laden' }}
    </Button>
  </div>
</template>
