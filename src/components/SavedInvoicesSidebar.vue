<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInvoiceStore } from '@/stores/invoice'
import {
  deleteInvoiceFile,
  listSavedInvoices,
  type SavedInvoiceEntry,
} from '@/stores/invoiceFilePersistence'
import { loadReview } from '@/stores/reviewPersistence'
import { Tooltip } from '@rechnungsabgleich/design-system'
import { Trash2, X } from '@lucide/vue'

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const store = useInvoiceStore()
const entries = ref<SavedInvoiceEntry[]>([])
const loading = ref(true)

async function refresh() {
  loading.value = true
  entries.value = await listSavedInvoices()
  loading.value = false
}

onMounted(refresh)
// A newly-loaded invoice gets cached in the background (stores/invoice.ts)
// -- pick that up automatically rather than requiring the sidebar to be
// closed and reopened to see it.
watch(
  () => store.invoice,
  (invoice) => {
    if (invoice) void refresh()
  },
)

// Decision counts live in tier 1 (localStorage), separate from tier 2's
// IndexedDB file cache this sidebar otherwise lists from -- cheap enough
// to read straight from the template rather than caching in `entries`.
function decisionCounts(key: string): { accepted: number; flagged: number } {
  const decisions = loadReview(key) ?? {}
  let accepted = 0
  let flagged = 0
  for (const decision of Object.values(decisions)) {
    if (decision.status === 'accepted') accepted++
    else if (decision.status === 'flagged') flagged++
  }
  return { accepted, flagged }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function open(entry: SavedInvoiceEntry) {
  if (router.currentRoute.value.name !== 'home') {
    await router.push({ name: 'home' })
  }
  await store.loadFromSavedKey(entry.key)
  emit('close')
}

// Removes only the cached PDF (tier 2) -- review decisions (tier 1) are
// left alone, since they're a separate, much smaller cache and there's no
// reason deleting "can I reopen the preview" should also forget "what did
// I decide".
async function remove(entry: SavedInvoiceEntry, event: Event) {
  event.stopPropagation()
  await deleteInvoiceFile(entry.key)
  await refresh()
}
</script>

<template>
  <div class="flex h-full w-72 shrink-0 flex-col border-r border-border bg-paper text-sm">
    <div class="flex items-center justify-between border-b border-border px-3 py-2">
      <span class="font-semibold">Gespeicherte Rechnungen</span>
      <button
        type="button"
        class="rounded p-1 text-muted hover:bg-border/40 hover:text-ink"
        aria-label="Seitenleiste schließen"
        @click="emit('close')"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="flex-1 overflow-auto">
      <p v-if="!loading && entries.length === 0" class="p-3 text-muted">
        Noch keine Rechnungen bearbeitet. Geladene Rechnungen erscheinen hier automatisch.
      </p>

      <ul v-else>
        <li
          v-for="entry in entries"
          :key="entry.key"
          tabindex="0"
          role="button"
          class="cursor-pointer border-b border-border px-3 py-2 hover:bg-border/20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          @click="open(entry)"
          @keydown.enter="open(entry)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-medium">{{ entry.invoiceNumber }}</span>
            <Tooltip label="Gespeicherte Datei entfernen" placement="bottom" align="end">
              <button
                type="button"
                class="shrink-0 rounded p-1 text-muted hover:bg-border/40 hover:text-error"
                aria-label="Gespeicherte Datei entfernen"
                @click="remove(entry, $event)"
              >
                <Trash2 :size="14" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          <div class="truncate text-muted">{{ entry.sellerName }}</div>
          <div class="mt-1 flex items-center justify-between text-xs text-muted">
            <span>{{ formatDate(entry.updatedAt) }}</span>
            <span class="num shrink-0">
              {{ decisionCounts(entry.key).accepted }} akzeptiert ·
              {{ decisionCounts(entry.key).flagged }} geflaggt
            </span>
          </div>
        </li>
      </ul>
    </div>

    <p class="border-t border-border px-3 py-2 text-xs text-muted">
      Rechnungen werden nur lokal in diesem Browser gespeichert, nicht übertragen.
    </p>
  </div>
</template>
