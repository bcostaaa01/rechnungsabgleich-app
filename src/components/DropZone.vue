<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@rechnungsabgleich/design-system'
import { useFileDrop } from '@/composables/useFileDrop'

const emit = defineEmits<{ select: [file: File] }>()

const fileInput = ref<HTMLInputElement | null>(null)
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

async function loadSample() {
  const response = await fetch('/beispielrechnung.pdf')
  const blob = await response.blob()
  emit('select', new File([blob], 'beispielrechnung.pdf', { type: 'application/pdf' }))
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
    <p class="text-sm text-muted">PDF-Rechnung hierher ziehen oder</p>
    <Button variant="primary" @click="openFilePicker">Datei auswählen</Button>
    <input
      ref="fileInput"
      type="file"
      accept="application/pdf"
      class="sr-only"
      @change="onFileInputChange"
    />
    <Button variant="ghost" @click="loadSample">Beispielrechnung laden</Button>
  </div>
</template>
