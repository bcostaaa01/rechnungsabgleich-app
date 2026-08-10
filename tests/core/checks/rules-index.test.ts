import { describe, expect, it } from 'vitest'
import { rules } from '@/core/checks/rules'

// Guards against forgetting to fill in descriptionDe (or duplicating an
// id) when adding a future rule -- cheap insurance for data that's about
// to be user-facing (FindingList.vue, the Info page's rules table).
describe('rules registry', () => {
  it('gives every rule a non-empty German description', () => {
    for (const entry of rules) {
      expect(entry.descriptionDe.trim().length).toBeGreaterThan(0)
    }
  })

  it('has unique rule ids', () => {
    const ids = rules.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('matches the eleven rules from SPEC.md §6', () => {
    expect(rules).toHaveLength(11)
  })
})
