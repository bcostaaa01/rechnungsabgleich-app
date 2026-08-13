<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@rechnungsabgleich/design-system'
import { TriangleAlert, Upload } from '@lucide/vue'
import { useFileDrop } from '@/composables/useFileDrop'

const emit = defineEmits<{ select: [file: File] }>()

interface SampleInvoice {
  file: string
  name: string
  label: string
  description: string
}

// Mirrors tests/fixtures/README.md -- each of these is a real fixture the
// test suite already asserts specific findings against, surfaced here so a
// visitor can see the tool catch something without bringing their own PDF.
// Shown as an always-visible row rather than a menu: a dropdown here would
// hide the samples behind a click on the very screen meant to onboard a
// first-time visitor, and a floating panel anchored to a button inside a
// vertically-centered card has nowhere reliable to open without overlapping
// something.
const samples: SampleInvoice[] = [
  {
    file: '/beispielrechnung.pdf',
    name: 'beispielrechnung.pdf',
    label: 'Fehlerfrei',
    description: 'Fehlerfreie Rechnung -- alle Prüfungen bestehen (gemischte Steuersätze 20 %/10 %)',
  },
  {
    file: '/beispielrechnung-fehler.pdf',
    name: 'beispielrechnung-fehler.pdf',
    label: 'Mit Fehlern',
    description: 'Rechnung mit Fehlern -- Rechenfehler bei einer Position und PDF/XML-Abweichung beim Bruttobetrag',
  },
  {
    file: '/beispielrechnung-iban.pdf',
    name: 'beispielrechnung-iban.pdf',
    label: 'Ungültige IBAN',
    description: 'Rechnung mit ungültiger IBAN -- Prüfsumme fehlerhaft, im PDF auffindbar und markierbar',
  },
  {
    file: '/beispielrechnung-mehrseitig.pdf',
    name: 'beispielrechnung-mehrseitig.pdf',
    label: 'Mehrseitig',
    description: 'Mehrseitige Rechnung -- zwei Seiten, Beträge stehen erst auf Seite 2',
  },
]

const fileInput = ref<HTMLInputElement | null>(null)
const loadingSample = ref<string | null>(null)
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
async function loadSample(sample: SampleInvoice) {
  loadingSample.value = sample.name
  try {
    const response = await fetch(sample.file)
    const blob = await response.blob()
    emit('select', new File([blob], sample.name, { type: 'application/pdf' }))
  } finally {
    loadingSample.value = null
  }
}
</script>

<template>
  <div class="mb-4 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning sm:hidden">
    <TriangleAlert :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
    <p>
      Diese Anwendung wurde für die Desktop-Nutzung entwickelt. Auf manchen mobilen Browsern
      (v. a. älteren iPhones) kann das Laden von PDFs derzeit fehlschlagen.
    </p>
  </div>
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
    <div class="flex flex-col items-center gap-2">
      <p class="text-xs text-muted">oder Beispielrechnung laden</p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <Button
          v-for="sample in samples"
          :key="sample.name"
          variant="ghost"
          class="rounded-full border border-border px-3 py-1 text-xs"
          :title="sample.description"
          :disabled="loadingSample !== null"
          @click="loadSample(sample)"
        >
          {{ loadingSample === sample.name ? 'Lädt …' : sample.label }}
        </Button>
      </div>
    </div>
  </div>
</template>
