<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Info } from '@lucide/vue'
import { Analytics } from '@vercel/analytics/vue'
import { Button, Modal } from '@rechnungsabgleich/design-system'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useResetConfirm } from '@/composables/useResetConfirm'

const { isOpen: resetConfirmOpen, guardedReset, cancel: cancelReset, confirm: confirmReset } = useResetConfirm()
</script>

<template>
  <Analytics />
  <div class="flex h-screen flex-col">
    <div class="flex items-center justify-between border-b border-border px-4 py-1.5 text-xs">
      <RouterLink
        to="/"
        class="rounded-lg px-2 py-1 font-semibold tracking-tight text-ink transition-colors hover:bg-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        @click="guardedReset()"
      >
        rechnungsabgleich
      </RouterLink>
      <div class="flex items-center gap-3">
        <RouterLink
          to="/info"
          class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted transition-colors hover:bg-border/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Info :size="14" aria-hidden="true" />
          Info &amp; Quellen
        </RouterLink>
        <ThemeToggle />
      </div>
    </div>
    <div class="min-h-0 flex-1">
      <RouterView />
    </div>

    <Modal v-if="resetConfirmOpen" v-slot="{ titleId }" @close="cancelReset()">
      <h2 :id="titleId" class="font-semibold text-ink">Rechnung verlassen?</h2>
      <p class="mt-2 text-muted">
        Ihre Prüfentscheidungen (akzeptierte und markierte Positionen) für diese Rechnung gehen
        verloren.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="secondary" @click="cancelReset()">Abbrechen</Button>
        <Button variant="primary" @click="confirmReset()">Verwerfen</Button>
      </div>
    </Modal>
  </div>
</template>
