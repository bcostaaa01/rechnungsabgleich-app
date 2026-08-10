<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Info } from '@lucide/vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<template>
  <div class="flex h-screen flex-col">
    <div class="flex items-center justify-between border-b border-border px-4 py-1.5 text-xs">
      <RouterLink to="/" class="font-semibold tracking-tight text-ink">rechnungsabgleich</RouterLink>
      <div class="flex items-center gap-3">
        <RouterLink to="/info" class="inline-flex items-center gap-1 text-muted hover:text-ink">
          <Info :size="14" aria-hidden="true" />
          Info &amp; Quellen
        </RouterLink>
        <ThemeToggle />
      </div>
    </div>
    <div class="min-h-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>
