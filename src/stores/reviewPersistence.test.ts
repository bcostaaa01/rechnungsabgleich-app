import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_ENTRIES, STORAGE_KEY, hashXml, loadReview, saveReview } from './reviewPersistence'

beforeEach(() => localStorage.clear())

describe('hashXml', () => {
  it('is deterministic for the same input', () => {
    expect(hashXml('<a>1</a>')).toBe(hashXml('<a>1</a>'))
  })

  it('differs for different input', () => {
    expect(hashXml('<a>1</a>')).not.toBe(hashXml('<a>2</a>'))
  })
})

describe('loadReview / saveReview', () => {
  it('returns null for an invoice that was never saved', () => {
    expect(loadReview(hashXml('<invoice/>'))).toBeNull()
  })

  it('round-trips decisions for a given invoice key', () => {
    const key = hashXml('<invoice/>')
    saveReview(key, { invoiceNumber: 'RE-1', sellerName: 'Egger Bau' }, {
      '1': { status: 'accepted', note: 'geprüft' },
    })

    expect(loadReview(key)).toEqual({ '1': { status: 'accepted', note: 'geprüft' } })
  })

  it('keeps separate invoices under separate keys', () => {
    const keyA = hashXml('A')
    const keyB = hashXml('B')
    saveReview(keyA, { invoiceNumber: 'A', sellerName: 'X' }, {
      '1': { status: 'accepted', note: '' },
    })
    saveReview(keyB, { invoiceNumber: 'B', sellerName: 'Y' }, {
      '1': { status: 'flagged', note: '' },
    })

    expect(loadReview(keyA)).toEqual({ '1': { status: 'accepted', note: '' } })
    expect(loadReview(keyB)).toEqual({ '1': { status: 'flagged', note: '' } })
  })

  it('overwrites a previous save for the same key', () => {
    const key = hashXml('<invoice/>')
    saveReview(key, { invoiceNumber: 'RE-1', sellerName: 'X' }, {
      '1': { status: 'accepted', note: '' },
    })
    saveReview(key, { invoiceNumber: 'RE-1', sellerName: 'X' }, {
      '1': { status: 'flagged', note: '' },
    })

    expect(loadReview(key)).toEqual({ '1': { status: 'flagged', note: '' } })
  })

  it('falls back to null when storage content is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    expect(loadReview('anything')).toBeNull()
  })
})

// `updatedAt` is millisecond-resolution and eviction breaks ties on it, so
// tests that depend on a specific save order need saves spread across
// distinct milliseconds -- otherwise tie-breaking falls back to
// Object.keys() insertion order, which happens to match here but shouldn't
// be relied on.
async function saveNumbered(keys: string[]): Promise<void> {
  for (const [i, key] of keys.entries()) {
    saveReview(key, { invoiceNumber: `RE-${i}`, sellerName: 'X' }, {
      '1': { status: 'accepted', note: '' },
    })
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

describe('eviction', () => {
  it('keeps at most MAX_ENTRIES invoices in storage', async () => {
    const keys = Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => hashXml(`invoice-${i}`))
    await saveNumbered(keys)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as { invoices: object }
    expect(Object.keys(stored.invoices)).toHaveLength(MAX_ENTRIES)
  })

  it('drops the oldest entries first, keeping the most recently saved ones', async () => {
    const keys = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => hashXml(`invoice-${i}`))
    await saveNumbered(keys)

    expect(loadReview(keys[0]!)).toBeNull()
    expect(loadReview(keys[keys.length - 1]!)).toEqual({ '1': { status: 'accepted', note: '' } })
  })
})
