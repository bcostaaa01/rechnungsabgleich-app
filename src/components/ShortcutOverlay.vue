<script setup lang="ts">
import { Modal } from '@rechnungsabgleich/design-system'

const emit = defineEmits<{ close: [] }>()

const shortcuts: Array<[string, string]> = [
  ['j', 'Nächste Position'],
  ['k', 'Vorherige Position'],
  ['a', 'Position akzeptieren'],
  ['f', 'Position flaggen'],
  ['?', 'Diese Übersicht ein-/ausblenden'],
]
</script>

<template>
  <Modal v-slot="{ titleId }" @close="emit('close')">
    <h2 :id="titleId" class="font-semibold text-ink">Tastaturkürzel</h2>
    <dl class="mt-3 space-y-2">
      <div v-for="[key, label] in shortcuts" :key="key" class="flex items-center justify-between gap-3">
        <dt>
          <kbd class="num rounded border border-border bg-border/20 px-1.5 py-0.5 text-xs">{{ key }}</kbd>
        </dt>
        <dd class="text-muted">{{ label }}</dd>
      </div>
    </dl>
  </Modal>
</template>
