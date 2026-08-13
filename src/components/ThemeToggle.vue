<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { Button, Tooltip } from '@rechnungsabgleich/design-system'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <Tooltip
    :label="theme === 'dark' ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'"
    placement="bottom"
    align="end"
  >
    <Button
      variant="ghost"
      :aria-label="theme === 'dark' ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'"
      @click="toggleTheme"
    >
      <Sun v-if="theme === 'dark'" :size="16" aria-hidden="true" />
      <Moon v-else :size="16" aria-hidden="true" />
    </Button>
  </Tooltip>
</template>
