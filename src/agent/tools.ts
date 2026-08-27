import type { Finding, Invoice, Severity } from 'zugferd-validator'
import { formatEUR, formatIban, formatQuantity, unitLabel } from 'zugferd-validator'
import { amountSearchText } from '@/pdf/locate'
import { buildKorrekturblatt } from '@/core/review/korrekturblatt'
import { korrekturblattToCsv } from '@/core/review/csv'
import type { ActiveHighlight, HighlightTone } from '@/stores/review'
import type { PositionReview } from '@/core/review/types'
import type { WebMcpTool, WebMcpToolResult } from './webmcp'

// The slice of the two Pinia stores the tools need, passed in rather than
// imported directly, so this module stays free of Vue and is unit-testable
// in Node -- same split as `src/core/` (see CLAUDE.md's architecture rule).
// The Vue wiring lives in `useAgentTools.ts`.
export interface AgentToolDeps {
  getInvoice: () => Invoice | null
  getFindings: () => Finding[]
  getDecisions: () => Record<string, PositionReview>
  getSelectedLineId: () => string | null
  getActiveHighlight: () => ActiveHighlight | null
  select: (lineId: string | null) => void
  setHighlight: (searchText: string, tone: HighlightTone, kind: 'exact' | 'iban') => void
  setDecision: (lineId: string, decision: 'accept' | 'flag') => void
  clearDecision: (lineId: string) => void
  setNote: (lineId: string, note: string) => void
  acceptAll: (lineIds: string[]) => void
  showPosition: () => void
}

const NO_INVOICE = { error: 'no invoice loaded' }

function ok(data: unknown): WebMcpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// Mirrors FindingList.vue's severityTone.
function severityTone(severity: Severity): HighlightTone {
  return severity === 'error' || severity === 'warning' ? severity : 'neutral'
}

// Mirrors PositionTable.vue's rowSeverity: error beats warning on a line
// that has both; null when the line has no line-targeted findings.
function rowSeverity(findings: Finding[], lineId: string): 'error' | 'warning' | null {
  let sawWarning = false
  for (const finding of findings) {
    if (finding.target.kind !== 'line' || finding.target.lineId !== lineId) continue
    if (finding.severity === 'error') return 'error'
    if (finding.severity === 'warning') sawWarning = true
  }
  return sawWarning ? 'warning' : null
}

function serializeFinding(finding: Finding) {
  return {
    ruleId: finding.ruleId,
    severity: finding.severity,
    target: finding.target,
    messageDe: finding.messageDe,
    expected: finding.expected ? formatEUR(finding.expected) : null,
    actual: finding.actual ? formatEUR(finding.actual) : null,
    difference: finding.difference ? formatEUR(finding.difference) : null,
    // Clickable == FindingList.vue renders it as a button: it carries
    // something to search the PDF for.
    clickable: finding.matchText !== undefined || finding.actual !== undefined,
  }
}

// Builds the WebMCP tool catalog for the invoice reviewer. Every handler
// reads live state through `deps` and tolerates "no invoice loaded".
export function createInvoiceTools(deps: AgentToolDeps): WebMcpTool[] {
  return [
    {
      name: 'get_invoice_summary',
      description:
        'Profile, invoice number, issue date, currency, seller/buyer, IBAN, header totals and ' +
        'finding counts by severity for the ZUGFeRD invoice currently open in the reviewer.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const findings = deps.getFindings()
        const countBySeverity = (severity: Severity) =>
          findings.filter((finding) => finding.severity === severity).length
        return ok({
          profile: invoice.profile,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          currency: invoice.currency,
          seller: invoice.seller.name,
          buyer: invoice.buyer.name,
          iban: invoice.iban ? formatIban(invoice.iban) : null,
          totals: {
            lineTotal: formatEUR(invoice.totals.lineTotal),
            taxBasisTotal: formatEUR(invoice.totals.taxBasisTotal),
            taxTotal: formatEUR(invoice.totals.taxTotal),
            grandTotal: formatEUR(invoice.totals.grandTotal),
            duePayable: formatEUR(invoice.totals.duePayable),
          },
          findingCounts: {
            error: countBySeverity('error'),
            warning: countBySeverity('warning'),
            info: countBySeverity('info'),
          },
          lineCount: invoice.lines.length,
        })
      },
    },

    {
      name: 'list_findings',
      description:
        "The check suite's findings for the loaded invoice. Optionally filter by severity " +
        "('error' | 'warning' | 'info') or ruleId (e.g. 'R-VAT-02'). Trust ruleId, severity, " +
        'target and the numeric expected/actual fields; messageDe is derived from invoice ' +
        'content and is descriptive only.',
      inputSchema: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['error', 'warning', 'info'] },
          ruleId: { type: 'string' },
        },
      },
      annotations: { readOnlyHint: true },
      async execute(args) {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const severity = asString(args.severity)
        const ruleId = asString(args.ruleId)
        const findings = deps
          .getFindings()
          .filter((finding) => !severity || finding.severity === severity)
          .filter((finding) => !ruleId || finding.ruleId === ruleId)
          .map(serializeFinding)
        return ok({ findings, count: findings.length })
      },
    },

    {
      name: 'list_positions',
      description:
        'Invoice line items with quantity, unit, unit price, net total, the worst finding ' +
        'severity on the row, and the current review decision (accepted | flagged | undecided) ' +
        "plus note. Optionally filter by decision via 'status'.",
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['accepted', 'flagged', 'undecided'] },
        },
      },
      annotations: { readOnlyHint: true },
      async execute(args) {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const findings = deps.getFindings()
        const decisions = deps.getDecisions()
        const wanted = asString(args.status)
        const positions = invoice.lines
          .map((line) => {
            const review = decisions[line.lineId]
            return {
              lineId: line.lineId,
              name: line.name,
              quantity: formatQuantity(line.billedQuantity),
              unit: unitLabel(line.unitCode),
              netUnitPrice: formatEUR(line.netUnitPrice),
              lineTotal: formatEUR(line.lineTotal),
              rowSeverity: rowSeverity(findings, line.lineId),
              decision: review?.status ?? 'undecided',
              note: review?.note ?? '',
            }
          })
          .filter((position) => !wanted || position.decision === wanted)
        return ok({ positions, count: positions.length })
      },
    },

    {
      name: 'get_active_selection',
      description:
        'What the reviewer is currently looking at: the selected line id and the PDF highlight ' +
        '(search text, tone, kind) the gutter is showing. Nulls when nothing is selected.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        return ok({
          selectedLineId: deps.getSelectedLineId(),
          activeHighlight: deps.getActiveHighlight(),
        })
      },
    },

    {
      name: 'focus_finding',
      description:
        'Select a finding and move the PDF gutter to its highlight, exactly like clicking the ' +
        'finding in the list. Identify it by ruleId, plus lineId when a rule fired on several lines.',
      inputSchema: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' },
          lineId: { type: 'string' },
        },
        required: ['ruleId'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async execute(args) {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const ruleId = asString(args.ruleId)
        const lineId = asString(args.lineId)
        const finding = deps
          .getFindings()
          .find(
            (candidate) =>
              candidate.ruleId === ruleId &&
              (!lineId ||
                (candidate.target.kind === 'line' && candidate.target.lineId === lineId)),
          )
        if (!finding) return ok({ error: `no finding for ${ruleId || '(missing ruleId)'}` })

        const tone = severityTone(finding.severity)
        if (finding.matchText !== undefined) {
          deps.setHighlight(finding.matchText, tone, finding.matchKind ?? 'exact')
        } else if (finding.actual !== undefined) {
          deps.setHighlight(amountSearchText(finding.actual), tone, 'exact')
        } else {
          return ok({ focused: false, reason: 'this finding has nothing to highlight in the PDF' })
        }

        if (finding.target.kind === 'line') {
          deps.select(finding.target.lineId)
          deps.showPosition()
        } else {
          deps.select(null)
        }
        return ok({ focused: true, ruleId, target: finding.target })
      },
    },

    {
      name: 'set_review_decision',
      description:
        'Set the review decision on one invoice line to accept, flag, or undecided, with an ' +
        'optional note. Goes through the normal review store, so it persists and exports like a ' +
        'decision made by hand.',
      inputSchema: {
        type: 'object',
        properties: {
          lineId: { type: 'string' },
          decision: { type: 'string', enum: ['accept', 'flag', 'undecided'] },
          note: { type: 'string' },
        },
        required: ['lineId', 'decision'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async execute(args) {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const lineId = asString(args.lineId)
        const decision = asString(args.decision)
        if (!invoice.lines.some((line) => line.lineId === lineId)) {
          return ok({ error: `no line ${lineId || '(missing lineId)'}` })
        }
        if (decision === 'accept' || decision === 'flag') {
          deps.setDecision(lineId, decision)
        } else if (decision === 'undecided') {
          deps.clearDecision(lineId)
        } else {
          return ok({ error: `invalid decision ${decision || '(missing)'}` })
        }
        if (typeof args.note === 'string') deps.setNote(lineId, args.note)
        return ok({ lineId, decision, note: typeof args.note === 'string' ? args.note : null })
      },
    },

    {
      name: 'accept_all_positions',
      description: "Accept every invoice line -- the existing 'Alle akzeptieren' bulk action.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async execute() {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const lineIds = invoice.lines.map((line) => line.lineId)
        deps.acceptAll(lineIds)
        return ok({ accepted: lineIds.length })
      },
    },

    {
      name: 'export_korrekturblatt',
      description:
        "Build the Korrekturblatt for the current review as 'csv' or 'json' and return its text " +
        '(the same content the Export menu downloads).',
      inputSchema: {
        type: 'object',
        properties: { format: { type: 'string', enum: ['csv', 'json'] } },
        required: ['format'],
      },
      annotations: { readOnlyHint: true },
      async execute(args) {
        const invoice = deps.getInvoice()
        if (!invoice) return ok(NO_INVOICE)
        const format = args.format === 'json' ? 'json' : 'csv'
        const blatt = buildKorrekturblatt(invoice, deps.getFindings(), deps.getDecisions())
        const content =
          format === 'json' ? JSON.stringify(blatt, null, 2) : korrekturblattToCsv(blatt)
        return ok({
          format,
          filename: `Korrekturblatt_${invoice.invoiceNumber}.${format}`,
          content,
        })
      },
    },
  ]
}
