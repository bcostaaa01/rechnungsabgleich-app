<script setup lang="ts">
defineProps<{
  label?: string
}>()
</script>

<template>
  <span class="inline-flex items-center gap-2" role="status">
    <span
      class="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-ink"
      aria-hidden="true"
    />
    <span v-if="label" class="text-sm text-muted">{{ label }}</span>
    <span v-else class="sr-only">Wird geladen</span>
  </span>
</template>
