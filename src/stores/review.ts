import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { emptyReview, type PositionReview, type ReviewStatus } from '@/core/review/types'
import { loadReview, saveReview } from '@/stores/reviewPersistence'

// Per-position reviewer decisions (SPEC.md §4: "review.ts -- per-position
// decisions, notes"). The store itself is still the single in-memory
// source of truth -- see hydrate()/the watcher below for the narrow,
// documented deviation from CLAUDE.md's "no file persistence" rule
// (localStorage, keyed by invoice content, WIP -- see README).
export type HighlightTone = 'neutral' | 'error' | 'warning'

export interface ActiveHighlight {
  searchText: string
  tone: HighlightTone
  // 'iban' selects the whitespace-tolerant matcher (locateIban) instead of
  // the exact-substring one (locateText) -- see PdfPane.vue's
  // locateHighlight. Defaults to 'exact' so existing call sites don't need
  // to change.
  kind: 'exact' | 'iban'
}

export const useReviewStore = defineStore('review', () => {
  const decisions = ref<Record<string, PositionReview>>({})
  const selectedLineId = ref<string | null>(null)
  // What PdfPane.vue should currently be searching for and highlighting.
  // Plain primitives only -- no Finding or pdf.js type belongs in the
  // store; `tone` lets PdfPane.vue colour the highlight without a fragile
  // reverse-lookup against findings to figure out where a click came from.
  const activeHighlight = ref<ActiveHighlight | null>(null)
  // Identity of the invoice `decisions` currently belongs to, set by
  // hydrate() below. Both null until an invoice has been loaded and
  // hashed (stores/invoice.ts) -- nothing to persist against yet.
  const currentInvoiceKey = ref<string | null>(null)
  const currentInvoiceMeta = ref<{ invoiceNumber: string; sellerName: string } | null>(null)

  function reviewFor(lineId: string): PositionReview {
    return decisions.value[lineId] ?? emptyReview()
  }

  // Called once per loaded invoice (stores/invoice.ts, after parsing).
  // Restores any decisions saved for this exact invoice content and points
  // the watcher below at where future edits should be saved.
  function hydrate(invoiceKey: string, meta: { invoiceNumber: string; sellerName: string }) {
    currentInvoiceKey.value = invoiceKey
    currentInvoiceMeta.value = meta
    decisions.value = loadReview(invoiceKey) ?? {}
  }

  // Debounced per invoice key: typing a note shouldn't hit localStorage on
  // every keystroke, and keying the timers by invoiceKey (rather than one
  // shared timer) means switching invoices mid-debounce can't cancel a save
  // that belongs to the invoice being left behind.
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
  watch(
    decisions,
    (value) => {
      const invoiceKey = currentInvoiceKey.value
      const meta = currentInvoiceMeta.value
      if (!invoiceKey || !meta) return
      clearTimeout(saveTimers.get(invoiceKey))
      saveTimers.set(
        invoiceKey,
        setTimeout(() => {
          saveTimers.delete(invoiceKey)
          saveReview(invoiceKey, meta, value)
        }, 400),
      )
    },
    { deep: true },
  )

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

  function setHighlight(searchText: string, tone: HighlightTone = 'neutral', kind: 'exact' | 'iban' = 'exact') {
    activeHighlight.value = { searchText, tone, kind }
  }

  function clearHighlight() {
    activeHighlight.value = null
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
    // Clear the invoice key first -- decisions.value = {} below also
    // triggers the watcher above, and if the key were still set that would
    // persist an empty decision set over whatever was actually saved.
    currentInvoiceKey.value = null
    currentInvoiceMeta.value = null
    decisions.value = {}
    selectedLineId.value = null
    activeHighlight.value = null
  }

  return {
    decisions,
    selectedLineId,
    activeHighlight,
    currentInvoiceKey,
    reviewFor,
    hydrate,
    toggleAccept,
    toggleFlag,
    setNote,
    acceptAll,
    select,
    selectNext,
    selectPrevious,
    setHighlight,
    clearHighlight,
    reset,
  }
})
