import { ref, watchEffect } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'rechnungsabgleich:theme'

// Pure decision logic -- unit tested. Explicit stored choice wins;
// otherwise follow system preference.
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return systemPrefersDark ? 'dark' : 'light'
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Module-level singleton, same pattern as useFileDrop's per-call state
// but shared across every caller -- every component using useTheme()
// reads and drives the same ref, no Pinia store needed for a UI
// preference (SPEC.md §2 caps Pinia at two stores, and this isn't domain
// state anyway).
const theme = ref<Theme>(resolveTheme(readStored(), systemPrefersDark()))

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    // Only follow a live system change if the user hasn't made an
    // explicit choice here -- an explicit choice always wins.
    if (readStored() === null) {
      theme.value = event.matches ? 'dark' : 'light'
    }
  })
}

if (typeof document !== 'undefined') {
  watchEffect(() => {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  })
}

export function useTheme() {
  function setTheme(next: Theme) {
    theme.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Unavailable (private browsing, disabled storage) -- theme still
      // works for the session, just doesn't persist.
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggleTheme, setTheme }
}
