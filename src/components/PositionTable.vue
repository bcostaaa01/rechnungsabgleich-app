<script setup lang="ts">
import type { InvoiceLine } from '@/core/cii/types'
import { formatEUR, formatQuantity } from '@/core/money'
import { unitLabel } from '@/core/cii/units'

defineProps<{ lines: InvoiceLine[] }>()
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
      <tr v-for="line in lines" :key="line.lineId">
        <td class="num px-3 py-2">{{ line.lineId }}</td>
        <td class="px-3 py-2">{{ line.name }}</td>
        <td class="num px-3 py-2 text-right">{{ formatQuantity(line.billedQuantity) }}</td>
        <td class="px-3 py-2">{{ unitLabel(line.unitCode) }}</td>
        <td class="num px-3 py-2 text-right">{{ formatEUR(line.netUnitPrice) }}</td>
        <td class="num px-3 py-2 text-right">{{ formatEUR(line.lineTotal) }}</td>
      </tr>
    </tbody>
  </table>
</template>
