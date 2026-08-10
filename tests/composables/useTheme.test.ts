import { describe, expect, it } from 'vitest'
import { resolveTheme } from '@/composables/useTheme'

describe('resolveTheme', () => {
  it('prefers an explicit "light" choice over system preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('prefers an explicit "dark" choice over system preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('falls back to system preference when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('falls back to system preference for an unrecognized stored value', () => {
    expect(resolveTheme('sepia', true)).toBe('dark')
  })
})
