import { ref } from 'vue'
import { useInvoiceStore } from '@/stores/invoice'
import { useReviewStore } from '@/stores/review'

// Module-scoped singleton, not a Pinia store -- CLAUDE.md caps this app at
// two stores, and this is transient UI state (is the confirm dialog open),
// not domain data. A singleton lets the dialog be rendered once in App.vue
// while being triggered from anywhere that wants to guard store.reset():
// currently the header logo and HomeView's "Neue Rechnung laden".
const isOpen = ref(false)

export function useResetConfirm() {
  // Only interrupt when there's something to leave behind -- a fresh or
  // already-empty invoice has no review decisions, so reset immediately
  // rather than prompting for nothing. Decisions are persisted locally
  // (stores/reviewPersistence.ts) so nothing is actually lost, but the
  // confirmation still gives the reviewer a moment to notice they're
  // switching invoices mid-review.
  function guardedReset() {
    const review = useReviewStore()
    if (Object.keys(review.decisions).length > 0) {
      isOpen.value = true
    } else {
      useInvoiceStore().reset()
    }
  }

  function confirm() {
    useInvoiceStore().reset()
    isOpen.value = false
  }

  function cancel() {
    isOpen.value = false
  }

  return { isOpen, guardedReset, confirm, cancel }
}
