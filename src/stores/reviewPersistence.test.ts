import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, hashXml, loadReview, saveReview } from './reviewPersistence'

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
