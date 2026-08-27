import { onMounted, onUnmounted } from 'vue'
import { useInvoiceStore } from '@/stores/invoice'
import { useReviewStore } from '@/stores/review'
import { createInvoiceTools, type AgentToolDeps } from './tools'

// Lets the host view keep the agent path at parity with the manual UI --
// clicking a line finding in FindingList.vue also switches the right pane
// to the Positionen tab (HomeView.vue handles @show-position); the agent
// path calls onShowPosition for the same effect.
export interface UseAgentToolsOptions {
  onShowPosition?: () => void
}

// Registers this app's review actions as WebMCP tools
// (`navigator.modelContext`) for the lifetime of the calling component,
// and unregisters them on unmount. A no-op in every browser that doesn't
// expose the API (everything except Chrome 146+ with the flag), so it's
// safe to call unconditionally from the review view.
//
// Not a Pinia store (CLAUDE.md caps the app at two) and adds no
// dependency: a thin adapter over stores/invoice.ts and stores/review.ts,
// in the spirit of composables/useResetConfirm.ts. Experimental, opt-in,
// still 100% client-side -- see README "Known limitations".
export function useAgentTools(options: UseAgentToolsOptions = {}): void {
  const invoiceStore = useInvoiceStore()
  const reviewStore = useReviewStore()
  let controller: AbortController | null = null

  const deps: AgentToolDeps = {
    getInvoice: () => invoiceStore.invoice,
    getFindings: () => invoiceStore.findings,
    getDecisions: () => reviewStore.decisions,
    getSelectedLineId: () => reviewStore.selectedLineId,
    getActiveHighlight: () => reviewStore.activeHighlight,
    select: (lineId) => reviewStore.select(lineId),
    setHighlight: (searchText, tone, kind) => reviewStore.setHighlight(searchText, tone, kind),
    // The store's toggleAccept/toggleFlag flip state on a repeat call; an
    // agent wants an idempotent "set to this decision", so guard on the
    // current status first.
    setDecision: (lineId, decision) => {
      const current = reviewStore.reviewFor(lineId).status
      if (decision === 'accept' && current !== 'accepted') reviewStore.toggleAccept(lineId)
      if (decision === 'flag' && current !== 'flagged') reviewStore.toggleFlag(lineId)
    },
    clearDecision: (lineId) => {
      const current = reviewStore.reviewFor(lineId).status
      if (current === 'accepted') reviewStore.toggleAccept(lineId)
      if (current === 'flagged') reviewStore.toggleFlag(lineId)
    },
    setNote: (lineId, note) => reviewStore.setNote(lineId, note),
    acceptAll: (lineIds) => reviewStore.acceptAll(lineIds),
    showPosition: () => options.onShowPosition?.(),
  }

  onMounted(() => {
    const tools = createInvoiceTools(deps)

    const context = navigator.modelContext
    if (context) {
      controller = new AbortController()
      for (const tool of tools) {
        context.registerTool(tool, { signal: controller.signal })
      }
    }

    // Dev-only: a console handle so the same tools can be driven without a
    // WebMCP host, e.g. `await window.__agentTools.focus_finding({ ruleId:
    // 'R-VAT-02' })`. Stripped from production builds.
    if (import.meta.env.DEV) {
      const handles: NonNullable<Window['__agentTools']> = {}
      for (const tool of tools) {
        handles[tool.name] = async (args = {}) => {
          const result = await tool.execute(args)
          return JSON.parse(result.content[0]!.text)
        }
      }
      window.__agentTools = handles
    }
  })

  onUnmounted(() => {
    controller?.abort()
    if (import.meta.env.DEV) delete window.__agentTools
  })
}
