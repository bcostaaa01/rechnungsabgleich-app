<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { History, Info } from '@lucide/vue'
import { Analytics } from '@vercel/analytics/vue'
import { Button, Modal, Tooltip } from '@rechnungsabgleich/design-system'
import ThemeToggle from '@/components/ThemeToggle.vue'
import SavedInvoicesSidebar from '@/components/SavedInvoicesSidebar.vue'
import { useResetConfirm } from '@/composables/useResetConfirm'

const { isOpen: resetConfirmOpen, guardedReset, cancel: cancelReset, confirm: confirmReset } = useResetConfirm()
const savedSidebarOpen = ref(false)
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
    <div class="flex min-h-0 flex-1">
      <!-- A persistent rail directly on the edge the sidebar opens from,
           not a button somewhere else on the page -- the trigger and the
           thing it triggers should be adjacent. -->
      <div class="flex w-10 shrink-0 flex-col items-center border-r border-border py-2">
        <Tooltip label="Gespeicherte Rechnungen" placement="bottom" align="start">
          <button
            type="button"
            class="rounded-lg p-2 transition-colors hover:bg-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            :class="savedSidebarOpen ? 'bg-border/60 text-ink' : 'text-muted hover:text-ink'"
            :aria-pressed="savedSidebarOpen"
            aria-label="Gespeicherte Rechnungen"
            @click="savedSidebarOpen = !savedSidebarOpen"
          >
            <History :size="16" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <Transition name="sidebar-slide">
        <SavedInvoicesSidebar v-if="savedSidebarOpen" @close="savedSidebarOpen = false" />
      </Transition>
      <div class="min-h-0 flex-1">
        <RouterView />
      </div>
    </div>

    <Modal v-if="resetConfirmOpen" v-slot="{ titleId }" @close="cancelReset()">
      <h2 :id="titleId" class="font-semibold text-ink">Rechnung verlassen?</h2>
      <p class="mt-2 text-muted">
        Ihre Prüfentscheidungen (akzeptierte und markierte Positionen) werden lokal in diesem
        Browser gespeichert und wiederhergestellt, sobald Sie dieselbe Rechnung erneut laden.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="secondary" @click="cancelReset()">Abbrechen</Button>
        <Button variant="primary" @click="confirmReset()">Fortfahren</Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
/* Quick slide + fade, not a decorative flourish -- prefers-reduced-motion
   collapses the duration globally (src/assets/base.css), so this stays
   inert for anyone who's opted out. Only the sidebar's own appearance
   animates; the rail next to it (the trigger) never moves, so the panel
   always opens right where its trigger is. */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition:
    transform 120ms ease-out,
    opacity 120ms ease-out;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
}
</style>
