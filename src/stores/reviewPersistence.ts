import type { PositionReview } from '@/core/review/types'

// Deliberately outside src/core/ -- localStorage is a browser API, and
// core/ must stay free of anything but plain TypeScript (CLAUDE.md). This
// is a narrow, documented deviation from SPEC.md §1's "no file persistence"
// / "no multi-invoice management" -- see CLAUDE.md's Tech stack section.
export const STORAGE_KEY = 'rechnungsabgleich:reviews:v1'

export interface PersistedInvoiceReview {
  invoiceNumber: string
  sellerName: string
  updatedAt: string
  decisions: Record<string, PositionReview>
}

interface PersistedReviewsFile {
  version: 1
  invoices: Record<string, PersistedInvoiceReview>
}

function emptyFile(): PersistedReviewsFile {
  return { version: 1, invoices: {} }
}

// FNV-1a, 32-bit. Not cryptographic -- just a small, deterministic
// fingerprint of the embedded XML so re-loading the same invoice later maps
// back to its saved decisions. Good enough for a PoC's worth of demo
// invoices; a real multi-user tool would want a collision-resistant hash
// (or a server-issued ID). See README "Known limitations" for the caveat.
export function hashXml(xml: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < xml.length; i++) {
    hash ^= xml.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function readAll(): PersistedReviewsFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyFile()
    const parsed = JSON.parse(raw) as Partial<PersistedReviewsFile>
    if (parsed.version === 1 && parsed.invoices) return parsed as PersistedReviewsFile
    return emptyFile()
  } catch {
    // Corrupted JSON, storage disabled (private browsing), etc. --
    // persistence is best-effort for this PoC, never block the review flow.
    return emptyFile()
  }
}

function writeAll(file: PersistedReviewsFile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
  } catch {
    // Quota exceeded / storage disabled -- fail silently, same reasoning.
  }
}

export function loadReview(invoiceKey: string): Record<string, PositionReview> | null {
  return readAll().invoices[invoiceKey]?.decisions ?? null
}

export function saveReview(
  invoiceKey: string,
  meta: { invoiceNumber: string; sellerName: string },
  decisions: Record<string, PositionReview>,
): void {
  const file = readAll()
  file.invoices[invoiceKey] = {
    invoiceNumber: meta.invoiceNumber,
    sellerName: meta.sellerName,
    updatedAt: new Date().toISOString(),
    decisions,
  }
  writeAll(file)
}
