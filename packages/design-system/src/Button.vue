<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
  }>(),
  { variant: 'secondary' },
)
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40"
    :class="{
      'bg-ink px-4 py-2 text-paper hover:bg-ink/90': variant === 'primary',
      'border border-border px-4 py-2 text-ink hover:bg-border/40': variant === 'secondary',
      'px-2 py-1 text-ink hover:bg-border/40': variant === 'ghost',
    }"
  >
    <slot />
  </button>
</template>
