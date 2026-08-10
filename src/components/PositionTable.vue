<script setup lang="ts">
import type { InvoiceLine } from '@/core/cii/types'
import type { Finding } from '@/core/checks/types'
import { formatEUR, formatQuantity } from '@/core/money'
import { unitLabel } from '@/core/cii/units'
import { useReviewStore } from '@/stores/review'
import { CheckCircle2, Flag } from '@lucide/vue'

const props = defineProps<{ lines: InvoiceLine[]; findings: Finding[] }>()

const review = useReviewStore()

// Error takes priority over warning when a row has both.
function rowSeverity(lineId: string): 'error' | 'warning' | null {
  let sawWarning = false
  for (const finding of props.findings) {
    if (finding.target.kind !== 'line' || finding.target.lineId !== lineId) continue
    if (finding.severity === 'error') return 'error'
    if (finding.severity === 'warning') sawWarning = true
  }
  return sawWarning ? 'warning' : null
}

function onNoteInput(lineId: string, event: Event) {
  review.setNote(lineId, (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div v-if="lines.length === 0" class="p-4 text-sm text-muted">Keine Rechnungspositionen.</div>
  <div v-else class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="sticky top-0 z-10 bg-paper">
        <tr class="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
          <th class="px-3 py-2 font-medium whitespace-nowrap">Pos</th>
          <th class="px-3 py-2 font-medium">Bezeichnung</th>
          <th class="px-3 py-2 text-right font-medium whitespace-nowrap">Menge</th>
          <th class="px-3 py-2 font-medium whitespace-nowrap">Einheit</th>
          <th class="px-3 py-2 text-right font-medium whitespace-nowrap">Einzelpreis</th>
          <th class="px-3 py-2 text-right font-medium whitespace-nowrap">Nettobetrag</th>
          <th class="px-3 py-2 font-medium whitespace-nowrap">Prüfstatus</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <template v-for="line in lines" :key="line.lineId">
          <tr
            class="cursor-pointer hover:bg-border/10"
            :class="{
              'bg-error/5': rowSeverity(line.lineId) === 'error',
              'bg-warning/5': rowSeverity(line.lineId) === 'warning',
              'ring-1 ring-inset ring-ink/30': review.selectedLineId === line.lineId,
            }"
            @click="review.select(line.lineId)"
          >
            <td class="num px-3 py-2 whitespace-nowrap">
              <span class="inline-flex items-center gap-1.5">
                <span
                  v-if="rowSeverity(line.lineId)"
                  class="h-1.5 w-1.5 shrink-0 rounded-full"
                  :class="rowSeverity(line.lineId) === 'error' ? 'bg-error' : 'bg-warning'"
                  aria-hidden="true"
                />
                <span v-if="rowSeverity(line.lineId)" class="sr-only">
                  ({{ rowSeverity(line.lineId) === 'error' ? 'Fehler' : 'Warnung' }} bei dieser Position)
                </span>
                {{ line.lineId }}
              </span>
            </td>
            <td class="px-3 py-2">{{ line.name }}</td>
            <td class="num px-3 py-2 text-right whitespace-nowrap">
              {{ formatQuantity(line.billedQuantity) }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">{{ unitLabel(line.unitCode) }}</td>
            <td class="num px-3 py-2 text-right whitespace-nowrap">{{ formatEUR(line.netUnitPrice) }}</td>
            <td class="num px-3 py-2 text-right whitespace-nowrap">{{ formatEUR(line.lineTotal) }}</td>
            <td class="px-3 py-2 whitespace-nowrap">
              <span class="inline-flex items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1 hover:bg-border/40"
                  :class="review.reviewFor(line.lineId).status === 'accepted' ? 'text-ink' : 'text-muted'"
                  :aria-pressed="review.reviewFor(line.lineId).status === 'accepted'"
                  aria-label="Position akzeptieren"
                  @click.stop="review.toggleAccept(line.lineId)"
                >
                  <CheckCircle2 :size="16" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 hover:bg-border/40"
                  :class="review.reviewFor(line.lineId).status === 'flagged' ? 'text-warning' : 'text-muted'"
                  :aria-pressed="review.reviewFor(line.lineId).status === 'flagged'"
                  aria-label="Position flaggen"
                  @click.stop="review.toggleFlag(line.lineId)"
                >
                  <Flag :size="16" aria-hidden="true" />
                </button>
              </span>
            </td>
          </tr>
          <tr v-if="review.selectedLineId === line.lineId" class="bg-border/10">
            <td colspan="7" class="px-3 py-2">
              <label :for="`note-${line.lineId}`" class="text-xs text-muted">Notiz zu Position {{ line.lineId }}</label>
              <textarea
                :id="`note-${line.lineId}`"
                :value="review.reviewFor(line.lineId).note"
                rows="2"
                placeholder="z. B. Rückfrage an Lieferant, Grund fürs Flaggen …"
                class="mt-1 w-full rounded-lg border border-border bg-paper px-2 py-1.5 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                @input="onNoteInput(line.lineId, $event)"
                @click.stop
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
