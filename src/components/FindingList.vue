<script setup lang="ts">
import type { Finding } from '@/core/checks/types'
import { rules } from '@/core/checks/rules'
import { Badge } from '@rechnungsabgleich/design-system'
import { AlertCircle, AlertTriangle } from '@lucide/vue'

defineProps<{ findings: Finding[] }>()

function severityTone(severity: Finding['severity']): 'neutral' | 'error' | 'warning' {
  return severity === 'error' || severity === 'warning' ? severity : 'neutral'
}

function ruleInfo(ruleId: string) {
  return rules.find((entry) => entry.id === ruleId)
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
      <Badge :tone="severityTone(finding.severity)" class="shrink-0 gap-1">
        <AlertCircle v-if="finding.severity === 'error'" :size="12" aria-hidden="true" />
        <AlertTriangle v-else-if="finding.severity === 'warning'" :size="12" aria-hidden="true" />
        {{ finding.ruleId }}
      </Badge>
      <div>
        <p class="text-sm">{{ finding.messageDe }}</p>
        <p class="mt-0.5 text-xs text-muted">
          {{ ruleInfo(finding.ruleId)?.descriptionDe }}
          <span v-if="ruleInfo(finding.ruleId)?.businessRule" class="num">
            ({{ ruleInfo(finding.ruleId)?.businessRule }})
          </span>
        </p>
      </div>
    </li>
  </ul>
</template>
