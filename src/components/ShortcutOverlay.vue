<script setup lang="ts">
import { onMounted, ref } from 'vue'

const emit = defineEmits<{ close: [] }>()

const panelEl = ref<HTMLDivElement | null>(null)

const shortcuts: Array<[string, string]> = [
  ['j', 'Nächste Position'],
  ['k', 'Vorherige Position'],
  ['a', 'Position akzeptieren'],
  ['f', 'Position flaggen'],
  ['?', 'Diese Übersicht ein-/ausblenden'],
]

onMounted(() => {
  panelEl.value?.focus()
})
</script>

<template>
  <div
    class="fixed inset-0 z-20 flex items-center justify-center bg-ink/20"
    @click="emit('close')"
    @keydown.escape="emit('close')"
  >
    <div
      ref="panelEl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-overlay-title"
      tabindex="-1"
      class="w-full max-w-xs rounded-lg border border-border bg-paper p-4 text-sm shadow-sm outline-none"
      @click.stop
    >
      <h2 id="shortcut-overlay-title" class="font-semibold text-ink">Tastaturkürzel</h2>
      <dl class="mt-3 space-y-2">
        <div v-for="[key, label] in shortcuts" :key="key" class="flex items-center justify-between gap-3">
          <dt>
            <kbd class="num rounded border border-border bg-border/20 px-1.5 py-0.5 text-xs">{{ key }}</kbd>
          </dt>
          <dd class="text-muted">{{ label }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>
