<script setup lang="ts">
import type { InvoiceLine } from '@/core/cii/types'
import type { Finding } from '@/core/checks/types'
import { formatEUR, formatQuantity } from '@/core/money'
import { unitLabel } from '@/core/cii/units'

const props = defineProps<{ lines: InvoiceLine[]; findings: Finding[] }>()

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
</script>

<template>
  <div v-if="lines.length === 0" class="p-4 text-sm text-muted">Keine Rechnungspositionen.</div>
  <table v-else class="w-full text-sm">
    <thead>
      <tr class="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
        <th class="px-3 py-2 font-medium">Pos</th>
        <th class="px-3 py-2 font-medium">Bezeichnung</th>
        <th class="px-3 py-2 text-right font-medium">Menge</th>
        <th class="px-3 py-2 font-medium">Einheit</th>
        <th class="px-3 py-2 text-right font-medium">Einzelpreis</th>
        <th class="px-3 py-2 text-right font-medium">Nettobetrag</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-border">
      <tr
        v-for="line in lines"
        :key="line.lineId"
        :class="{
          'bg-error/5': rowSeverity(line.lineId) === 'error',
          'bg-warning/5': rowSeverity(line.lineId) === 'warning',
        }"
      >
        <td class="num px-3 py-2">
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
        <td class="num px-3 py-2 text-right">{{ formatQuantity(line.billedQuantity) }}</td>
        <td class="px-3 py-2">{{ unitLabel(line.unitCode) }}</td>
        <td class="num px-3 py-2 text-right">{{ formatEUR(line.netUnitPrice) }}</td>
        <td class="num px-3 py-2 text-right">{{ formatEUR(line.lineTotal) }}</td>
      </tr>
    </tbody>
  </table>
</template>
