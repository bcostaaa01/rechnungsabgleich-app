import type { Invoice } from '@/core/cii/types'
import type { Finding } from '@/core/checks/types'
import { formatEUR, formatQuantity } from '@/core/money'
import { unitLabel } from '@/core/cii/units'
import type { PositionReview, ReviewStatus } from './types'

export type KorrekturblattStatus = 'akzeptiert' | 'geflaggt' | 'unentschieden'

export interface KorrekturblattLine {
  lineId: string
  name: string
  quantity: string
  unit: string
  netUnitPrice: string
  lineTotal: string
  status: KorrekturblattStatus
  note: string
  findings: string[]
}

export interface Korrekturblatt {
  invoiceNumber: string
  seller: string
  profile: string
  issueDate: string
  headerFindings: string[]
  lines: KorrekturblattLine[]
}

function statusLabel(status: ReviewStatus | null): KorrekturblattStatus {
  if (status === 'accepted') return 'akzeptiert'
  if (status === 'flagged') return 'geflaggt'
  return 'unentschieden'
}

// Pure by design (SPEC.md §4): takes plain data, not the review Pinia
// store directly, so it stays framework-free and unit-testable in Node.
export function buildKorrekturblatt(
  invoice: Invoice,
  findings: Finding[],
  decisions: Record<string, PositionReview>,
): Korrekturblatt {
  const headerFindings = findings
    .filter((finding) => finding.target.kind !== 'line')
    .map((finding) => finding.messageDe)

  const lines = invoice.lines.map((line) => {
    const review = decisions[line.lineId]
    const lineFindings = findings
      .filter((finding) => finding.target.kind === 'line' && finding.target.lineId === line.lineId)
      .map((finding) => finding.messageDe)

    return {
      lineId: line.lineId,
      name: line.name,
      quantity: formatQuantity(line.billedQuantity),
      unit: unitLabel(line.unitCode),
      netUnitPrice: formatEUR(line.netUnitPrice),
      lineTotal: formatEUR(line.lineTotal),
      status: statusLabel(review?.status ?? null),
      note: review?.note ?? '',
      findings: lineFindings,
    }
  })

  return {
    invoiceNumber: invoice.invoiceNumber,
    seller: invoice.seller.name,
    profile: invoice.profile,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    headerFindings,
    lines,
  }
}
