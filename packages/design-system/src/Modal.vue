<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'

const emit = defineEmits<{ close: [] }>()

const panelEl = ref<HTMLDivElement | null>(null)
const titleId = useId()

onMounted(() => {
  panelEl.value?.focus()
})
</script>

<template>
  <div
    class="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-4"
    @click="emit('close')"
    @keydown.escape="emit('close')"
  >
    <div
      ref="panelEl"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="w-full max-w-xs rounded-lg border border-border bg-paper p-4 text-sm shadow-sm outline-none"
      @click.stop
    >
      <slot :title-id="titleId" />
    </div>
  </div>
</template>
