<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ select: [file: File] }>()

const isDragging = ref(false)

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) emit('select', file)
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('select', file)
  input.value = ''
}

async function loadSample() {
  const response = await fetch('/beispielrechnung.pdf')
  const blob = await response.blob()
  emit('select', new File([blob], 'beispielrechnung.pdf', { type: 'application/pdf' }))
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-4 rounded border-2 border-dashed p-12 text-center transition-colors"
    :class="isDragging ? 'border-ink bg-border/20' : 'border-border'"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <p class="text-sm text-muted">PDF-Rechnung hierher ziehen oder</p>
    <label
      class="cursor-pointer rounded border border-ink px-4 py-2 text-sm font-medium hover:bg-ink hover:text-paper focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2"
    >
      Datei auswählen
      <input type="file" accept="application/pdf" class="sr-only" @change="onFileInputChange" />
    </label>
    <button
      type="button"
      class="text-sm text-muted underline underline-offset-2"
      @click="loadSample"
    >
      Beispielrechnung laden
    </button>
  </div>
</template>
