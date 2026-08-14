<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    placement?: 'top' | 'bottom'
    // 'end' anchors the bubble's right edge to the trigger's right edge
    // instead of centering -- needed for triggers flush against the
    // viewport's right edge (e.g. the theme toggle), where a centered
    // bubble would run off-screen. 'start' is the mirror image, for
    // triggers flush against the left edge (e.g. the saved-invoices rail).
    align?: 'center' | 'end' | 'start'
  }>(),
  { placement: 'top', align: 'center' },
)
</script>

<template>
  <span class="group relative inline-flex">
    <slot />
    <!-- aria-hidden: purely a mouse/sighted-keyboard-focus affordance -- the
         wrapped element already carries its own aria-label, so this would
         otherwise double-announce the same text to screen readers. -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute z-30 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-paper opacity-0 shadow-sm transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
      :class="{
        'bottom-full mb-2': placement === 'top',
        'top-full mt-2': placement === 'bottom',
        'left-1/2 -translate-x-1/2': align === 'center',
        'right-0': align === 'end',
        'left-0': align === 'start',
      }"
    >
      {{ label }}
    </span>
  </span>
</template>
