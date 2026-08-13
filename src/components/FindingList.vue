<script setup lang="ts">
import type { Finding } from '@/core/checks/types'
import { rules } from '@/core/checks/rules'
import { amountSearchText } from '@/pdf/locate'
import { useReviewStore } from '@/stores/review'
import { Badge } from '@rechnungsabgleich/design-system'
import { AlertCircle, AlertTriangle } from '@lucide/vue'

defineProps<{ findings: Finding[] }>()
const emit = defineEmits<{ showPosition: [] }>()

const review = useReviewStore()

function severityTone(severity: Finding['severity']): 'neutral' | 'error' | 'warning' {
  return severity === 'error' || severity === 'warning' ? severity : 'neutral'
}

function ruleInfo(ruleId: string) {
  return rules.find((entry) => entry.id === ruleId)
}

// A finding is clickable when it carries something to search the PDF for:
// either a printed "actual" Money value, or (for R-IBAN-01) matchText with
// a non-default matchKind. R-CUR-01 and R-PDF-01/02/03 carry neither --
// the R-PDF-0x rules fire exactly when a value is confirmed absent from
// the PDF text, so there's nothing to highlight for those by definition.
function onFindingClick(finding: Finding) {
  if (finding.matchText !== undefined) {
    review.setHighlight(finding.matchText, severityTone(finding.severity), finding.matchKind ?? 'exact')
  } else if (finding.actual !== undefined) {
    review.setHighlight(amountSearchText(finding.actual), severityTone(finding.severity))
  } else {
    return
  }
  if (finding.target.kind === 'line') {
    review.select(finding.target.lineId)
    emit('showPosition')
  } else {
    review.select(null)
  }
}
</script>

<template>
  <div v-if="findings.length === 0" class="p-4 text-sm text-muted">Keine Abweichungen gefunden.</div>
  <ul v-else class="divide-y divide-border">
    <li v-for="(finding, index) in findings" :key="`${finding.ruleId}-${index}`">
      <button
        v-if="finding.actual !== undefined || finding.matchText !== undefined"
        type="button"
        class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-border/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        @click="onFindingClick(finding)"
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
      </button>
      <div v-else class="flex items-start gap-3 px-4 py-3">
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
      </div>
    </li>
  </ul>
</template>
