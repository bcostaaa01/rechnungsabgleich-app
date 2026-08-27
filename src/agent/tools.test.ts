import { describe, expect, it, vi } from 'vitest'
import type { Finding, Invoice, InvoiceLine } from 'zugferd-validator'
import { parseAmount } from 'zugferd-validator'
import type { PositionReview } from '@/core/review/types'
import { createInvoiceTools, type AgentToolDeps } from './tools'

const amount = (raw: string) => parseAmount(raw)!

function makeLine(overrides: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    lineId: '1',
    name: 'Stahlträger IPE 200',
    billedQuantity: amount('3'),
    unitCode: 'C62',
    netUnitPrice: amount('100.00'),
    basisQuantity: amount('1'),
    vatRate: amount('19'),
    vatCategory: 'S',
    lineTotal: amount('300.00'),
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    profile: 'EN16931',
    capabilities: { hasLineItems: true, hasVatBreakdown: true, hasPaymentTerms: true },
    invoiceNumber: '2024-0817',
    issueDate: new Date('2024-08-17T00:00:00Z'),
    currency: 'EUR',
    seller: { name: 'Egger Bau GmbH' },
    buyer: { name: 'Hochbau Wien AG' },
    lines: [makeLine(), makeLine({ lineId: '2', name: 'Montage', lineTotal: amount('150.00') })],
    vatBreakdown: [],
    totals: {
      lineTotal: amount('450.00'),
      allowanceTotal: null,
      chargeTotal: null,
      taxBasisTotal: amount('450.00'),
      taxTotal: amount('85.50'),
      grandTotal: amount('535.50'),
      totalPrepaid: null,
      duePayable: amount('535.50'),
    },
    ...overrides,
  }
}

const vatFinding: Finding = {
  ruleId: 'R-VAT-02',
  severity: 'error',
  target: { kind: 'vat', category: 'S' },
  messageDe: 'Steuerbetrag für S 19% stimmt nicht: erwartet 85,50 €, angegeben 86,00 €.',
  expected: amount('85.50'),
  actual: amount('86.00'),
  difference: amount('0.50'),
}

const lineFinding: Finding = {
  ruleId: 'R-LINE-01',
  severity: 'warning',
  target: { kind: 'line', lineId: '2' },
  messageDe: 'Positions-Nettobetrag weicht ab.',
  expected: amount('150.00'),
  actual: amount('150.20'),
}

const ibanFinding: Finding = {
  ruleId: 'R-IBAN-01',
  severity: 'error',
  target: { kind: 'header' },
  messageDe: 'IBAN DE00123 ist ungültig (Prüfsumme stimmt nicht).',
  matchText: 'DE00123',
  matchKind: 'iban',
}

const pdfFinding: Finding = {
  ruleId: 'R-PDF-03',
  severity: 'warning',
  target: { kind: 'header' },
  messageDe: 'Die IBAN ist im sichtbaren PDF-Text nicht auffindbar.',
}

type TestDeps = AgentToolDeps & { decisions: Record<string, PositionReview> }

function makeDeps(overrides: Partial<AgentToolDeps> = {}): TestDeps {
  const decisions: Record<string, PositionReview> = {}
  return {
    decisions,
    getInvoice: () => makeInvoice(),
    getFindings: () => [vatFinding, lineFinding, ibanFinding, pdfFinding],
    getDecisions: () => decisions,
    getSelectedLineId: () => null,
    getActiveHighlight: () => null,
    select: vi.fn<AgentToolDeps['select']>(),
    setHighlight: vi.fn<AgentToolDeps['setHighlight']>(),
    setDecision: vi.fn<AgentToolDeps['setDecision']>((lineId, decision) => {
      decisions[lineId] = {
        status: decision === 'accept' ? 'accepted' : 'flagged',
        note: decisions[lineId]?.note ?? '',
      }
    }),
    clearDecision: vi.fn<AgentToolDeps['clearDecision']>((lineId) => {
      decisions[lineId] = { status: null, note: decisions[lineId]?.note ?? '' }
    }),
    setNote: vi.fn<AgentToolDeps['setNote']>((lineId, note) => {
      decisions[lineId] = { status: decisions[lineId]?.status ?? null, note }
    }),
    acceptAll: vi.fn<AgentToolDeps['acceptAll']>(),
    showPosition: vi.fn<AgentToolDeps['showPosition']>(),
    ...overrides,
  }
}

function findTool(deps: AgentToolDeps, name: string) {
  const tool = createInvoiceTools(deps).find((entry) => entry.name === name)
  if (!tool) throw new Error(`tool ${name} not registered`)
  return tool
}

async function call(
  deps: AgentToolDeps,
  name: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await findTool(deps, name).execute(args)
  return JSON.parse(result.content[0]!.text) as Record<string, unknown>
}

describe('createInvoiceTools', () => {
  it('registers the full catalog in a stable order', () => {
    expect(createInvoiceTools(makeDeps()).map((tool) => tool.name)).toEqual([
      'get_invoice_summary',
      'list_findings',
      'list_positions',
      'get_active_selection',
      'focus_finding',
      'set_review_decision',
      'accept_all_positions',
      'export_korrekturblatt',
    ])
  })

  it('every invoice-scoped tool reports "no invoice loaded" when nothing is open', async () => {
    const deps = makeDeps({ getInvoice: () => null })
    // get_active_selection intentionally works without an invoice -- the
    // selection lives in the review store independently.
    const scoped = createInvoiceTools(deps).filter((tool) => tool.name !== 'get_active_selection')
    for (const tool of scoped) {
      const result = await tool.execute({ ruleId: 'x', lineId: '1', decision: 'accept', format: 'csv' })
      expect(JSON.parse(result.content[0]!.text)).toEqual({ error: 'no invoice loaded' })
    }
  })

  it('get_invoice_summary returns header totals and severity counts', async () => {
    const out = await call(makeDeps(), 'get_invoice_summary')
    expect(out.invoiceNumber).toBe('2024-0817')
    expect(out.issueDate).toBe('2024-08-17')
    expect(out.lineCount).toBe(2)
    expect(out.findingCounts).toEqual({ error: 2, warning: 2, info: 0 })
    expect((out.totals as Record<string, string>).grandTotal).toBe('535,50 €')
  })

  it('list_findings filters by severity and ruleId and marks clickability', async () => {
    expect((await call(makeDeps(), 'list_findings')).count).toBe(4)
    expect((await call(makeDeps(), 'list_findings', { severity: 'error' })).count).toBe(2)

    const byRule = await call(makeDeps(), 'list_findings', { ruleId: 'R-PDF-03' })
    const findings = byRule.findings as Array<Record<string, unknown>>
    expect(findings).toHaveLength(1)
    expect(findings[0]!.clickable).toBe(false)
    expect(findings[0]!.actual).toBeNull()
  })

  it('list_positions maps rows, row severity and decisions, and filters by status', async () => {
    const deps = makeDeps()
    deps.decisions['1'] = { status: 'accepted', note: 'geprüft' }

    const out = await call(deps, 'list_positions')
    const rows = out.positions as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      lineId: '1',
      decision: 'accepted',
      note: 'geprüft',
      rowSeverity: null,
      lineTotal: '300,00 €',
    })
    expect(rows[1]).toMatchObject({ lineId: '2', rowSeverity: 'warning', decision: 'undecided' })

    const accepted = await call(deps, 'list_positions', { status: 'accepted' })
    expect((accepted.positions as unknown[]).length).toBe(1)
  })

  it('get_active_selection reflects the review store, with or without an invoice', async () => {
    const deps = makeDeps({
      getInvoice: () => null,
      getSelectedLineId: () => '2',
      getActiveHighlight: () => ({ searchText: '150,20', tone: 'warning', kind: 'exact' }),
    })
    expect(await call(deps, 'get_active_selection')).toEqual({
      selectedLineId: '2',
      activeHighlight: { searchText: '150,20', tone: 'warning', kind: 'exact' },
    })
  })

  it('focus_finding highlights an amount finding and clears the line selection for a header target', async () => {
    const deps = makeDeps()
    const out = await call(deps, 'focus_finding', { ruleId: 'R-VAT-02' })
    expect(out).toEqual({ focused: true, ruleId: 'R-VAT-02', target: { kind: 'vat', category: 'S' } })
    expect(deps.setHighlight).toHaveBeenCalledWith('86,00', 'error', 'exact')
    expect(deps.select).toHaveBeenCalledWith(null)
    expect(deps.showPosition).not.toHaveBeenCalled()
  })

  it('focus_finding uses the whitespace-tolerant IBAN matcher for R-IBAN-01', async () => {
    const deps = makeDeps()
    await call(deps, 'focus_finding', { ruleId: 'R-IBAN-01' })
    expect(deps.setHighlight).toHaveBeenCalledWith('DE00123', 'error', 'iban')
  })

  it('focus_finding selects the line and opens the Positionen tab for a line target', async () => {
    const deps = makeDeps()
    await call(deps, 'focus_finding', { ruleId: 'R-LINE-01' })
    expect(deps.setHighlight).toHaveBeenCalledWith('150,20', 'warning', 'exact')
    expect(deps.select).toHaveBeenCalledWith('2')
    expect(deps.showPosition).toHaveBeenCalledOnce()
  })

  it('focus_finding reports when a finding has nothing to highlight', async () => {
    const out = await call(makeDeps(), 'focus_finding', { ruleId: 'R-PDF-03' })
    expect(out).toEqual({
      focused: false,
      reason: 'this finding has nothing to highlight in the PDF',
    })
  })

  it('focus_finding rejects an unknown ruleId', async () => {
    expect((await call(makeDeps(), 'focus_finding', { ruleId: 'R-NOPE' })).error).toContain('R-NOPE')
  })

  it('set_review_decision writes accept, flag and undecided, with an optional note', async () => {
    const deps = makeDeps()
    expect(
      await call(deps, 'set_review_decision', { lineId: '2', decision: 'flag', note: 'Rückfrage' }),
    ).toEqual({ lineId: '2', decision: 'flag', note: 'Rückfrage' })
    expect(deps.setDecision).toHaveBeenCalledWith('2', 'flag')
    expect(deps.setNote).toHaveBeenCalledWith('2', 'Rückfrage')

    await call(deps, 'set_review_decision', { lineId: '2', decision: 'undecided' })
    expect(deps.clearDecision).toHaveBeenCalledWith('2')
  })

  it('set_review_decision rejects an unknown line or an invalid decision', async () => {
    expect(
      (await call(makeDeps(), 'set_review_decision', { lineId: '99', decision: 'accept' })).error,
    ).toContain('99')
    expect(
      (await call(makeDeps(), 'set_review_decision', { lineId: '1', decision: 'sideways' })).error,
    ).toContain('sideways')
  })

  it('accept_all_positions forwards every line id', async () => {
    const deps = makeDeps()
    expect(await call(deps, 'accept_all_positions')).toEqual({ accepted: 2 })
    expect(deps.acceptAll).toHaveBeenCalledWith(['1', '2'])
  })

  it('export_korrekturblatt returns csv text and parseable json', async () => {
    const csv = await call(makeDeps(), 'export_korrekturblatt', { format: 'csv' })
    expect(csv.filename).toBe('Korrekturblatt_2024-0817.csv')
    expect(String(csv.content)).toContain('2024-0817')

    const json = await call(makeDeps(), 'export_korrekturblatt', { format: 'json' })
    expect(() => JSON.parse(String(json.content))).not.toThrow()
  })

  it('marks mutating tools non-read-only and read tools read-only', () => {
    const byName = new Map(createInvoiceTools(makeDeps()).map((tool) => [tool.name, tool]))
    expect(byName.get('list_findings')!.annotations).toEqual({ readOnlyHint: true })
    expect(byName.get('export_korrekturblatt')!.annotations).toEqual({ readOnlyHint: true })
    expect(byName.get('set_review_decision')!.annotations!.readOnlyHint).toBe(false)
    expect(byName.get('accept_all_positions')!.annotations!.readOnlyHint).toBe(false)
  })
})
