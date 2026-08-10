<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'error' | 'warning'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span
    class="num inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
    :class="{
      'border border-border text-muted': tone === 'neutral',
      'bg-error/10 text-error': tone === 'error',
      'bg-warning/10 text-warning': tone === 'warning',
    }"
  >
    <slot />
  </span>
</template>
