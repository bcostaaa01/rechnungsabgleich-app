<script setup lang="ts">
import { LOADING_STEPS, type LoadingStep } from '@/stores/invoice'
import { Check } from '@lucide/vue'

const props = defineProps<{ currentStep: LoadingStep | null }>()

function stepState(id: LoadingStep): 'done' | 'active' | 'pending' {
  if (props.currentStep === null) return 'pending'
  const currentIndex = LOADING_STEPS.findIndex((step) => step.id === props.currentStep)
  const stepIndex = LOADING_STEPS.findIndex((step) => step.id === id)
  if (stepIndex < currentIndex) return 'done'
  return stepIndex === currentIndex ? 'active' : 'pending'
}
</script>

<template>
  <ul class="space-y-2.5 text-sm" role="status" aria-live="polite">
    <li v-for="step in LOADING_STEPS" :key="step.id" class="flex items-center gap-2.5">
      <Check v-if="stepState(step.id) === 'done'" :size="14" class="shrink-0 text-ink" aria-hidden="true" />
      <span
        v-else-if="stepState(step.id) === 'active'"
        class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-ink"
        aria-hidden="true"
      />
      <span v-else class="h-3.5 w-3.5 shrink-0 rounded-full border border-border" aria-hidden="true" />
      <span :class="stepState(step.id) === 'pending' ? 'text-muted' : 'text-ink'">{{ step.label }}</span>
    </li>
  </ul>
</template>
