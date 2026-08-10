<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { Button } from '@rechnungsabgleich/design-system'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <Button
    variant="ghost"
    :aria-label="theme === 'dark' ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'"
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" :size="16" aria-hidden="true" />
    <Moon v-else :size="16" aria-hidden="true" />
  </Button>
</template>
