import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyReview, type PositionReview, type ReviewStatus } from '@/core/review/types'

// Per-position reviewer decisions (SPEC.md §4: "review.ts -- per-position
// decisions, notes"). Deliberately in-memory only, like `invoice` -- no
// localStorage persistence, matching CLAUDE.md's "no file persistence"
// rule. Reloading the page or loading a new invoice starts a fresh review.
export const useReviewStore = defineStore('review', () => {
  const decisions = ref<Record<string, PositionReview>>({})
  const selectedLineId = ref<string | null>(null)

  function reviewFor(lineId: string): PositionReview {
    return decisions.value[lineId] ?? emptyReview()
  }

  function setStatus(lineId: string, status: ReviewStatus | null) {
    decisions.value[lineId] = { ...reviewFor(lineId), status }
  }

  function toggleAccept(lineId: string) {
    setStatus(lineId, reviewFor(lineId).status === 'accepted' ? null : 'accepted')
  }

  function toggleFlag(lineId: string) {
    setStatus(lineId, reviewFor(lineId).status === 'flagged' ? null : 'flagged')
  }

  function setNote(lineId: string, note: string) {
    decisions.value[lineId] = { ...reviewFor(lineId), note }
  }

  function acceptAll(lineIds: string[]) {
    for (const lineId of lineIds) {
      decisions.value[lineId] = { ...reviewFor(lineId), status: 'accepted' }
    }
  }

  function select(lineId: string | null) {
    selectedLineId.value = lineId
  }

  function selectNext(lineIds: string[]) {
    if (lineIds.length === 0) return
    const current = selectedLineId.value ? lineIds.indexOf(selectedLineId.value) : -1
    selectedLineId.value = lineIds[Math.min(current + 1, lineIds.length - 1)] ?? null
  }

  function selectPrevious(lineIds: string[]) {
    if (lineIds.length === 0) return
    const current = selectedLineId.value ? lineIds.indexOf(selectedLineId.value) : 0
    selectedLineId.value = lineIds[Math.max(current - 1, 0)] ?? null
  }

  function reset() {
    decisions.value = {}
    selectedLineId.value = null
  }

  return {
    decisions,
    selectedLineId,
    reviewFor,
    toggleAccept,
    toggleFlag,
    setNote,
    acceptAll,
    select,
    selectNext,
    selectPrevious,
    reset,
  }
})
