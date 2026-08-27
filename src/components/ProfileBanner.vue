<script setup lang="ts">
import type { ProfileCapabilities, ZugferdProfile } from 'zugferd-validator'

defineProps<{
  profile: ZugferdProfile
  capabilities: ProfileCapabilities
}>()
</script>

<template>
  <div
    v-if="!capabilities.hasLineItems"
    class="border-b border-border bg-border/30 px-4 py-2 text-sm text-muted"
  >
    Profil {{ profile }}: keine Rechnungspositionen in diesem Profil enthalten. Es werden nur
    Prüfungen auf Summenebene durchgeführt.
  </div>
</template>
