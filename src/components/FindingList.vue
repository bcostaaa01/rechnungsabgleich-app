<script setup lang="ts">
import type { Finding } from '@/core/checks/types'

defineProps<{ findings: Finding[] }>()

function severityClass(severity: Finding['severity']): string {
  switch (severity) {
    case 'error':
      return 'bg-error/10 text-error'
    case 'warning':
      return 'bg-warning/10 text-warning'
    default:
      return 'bg-border/40 text-muted'
  }
}
</script>

<template>
  <div v-if="findings.length === 0" class="p-4 text-sm text-muted">Keine Abweichungen gefunden.</div>
  <ul v-else class="divide-y divide-border">
    <li
      v-for="(finding, index) in findings"
      :key="`${finding.ruleId}-${index}`"
      class="flex items-start gap-3 px-4 py-3"
    >
      <span
        class="num shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold"
        :class="severityClass(finding.severity)"
      >
        {{ finding.ruleId }}
      </span>
      <span class="text-sm">{{ finding.messageDe }}</span>
    </li>
  </ul>
</template>
