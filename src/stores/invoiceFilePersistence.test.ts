// @vitest-environment node
//
// Overrides the project-wide jsdom environment for this file only: jsdom's
// Blob/File are its own JS-land reimplementation, which fake-indexeddb's
// structured-clone-based storage doesn't round-trip correctly (it silently
// degrades a stored Blob to a plain object). Node's native Blob/File clone
// correctly through IndexedDB, and nothing else in this file needs the DOM.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_ENTRIES,
  deleteInvoiceFile,
  listSavedInvoices,
  loadInvoiceFile,
  saveInvoiceFile,
} from './invoiceFilePersistence'

function makeFile(name = 'invoice.pdf'): File {
  return new File(['%PDF-1.7 fake content'], name, { type: 'application/pdf' })
}

beforeEach(async () => {
  // No native "clear the whole database" between tests -- delete every
  // entry the previous test left behind instead.
  const entries = await listSavedInvoices()
  await Promise.all(entries.map((entry) => deleteInvoiceFile(entry.key)))
})

describe('saveInvoiceFile / loadInvoiceFile', () => {
  it('returns null for a key that was never saved', async () => {
    expect(await loadInvoiceFile('unknown')).toBeNull()
  })

  it('round-trips a file for a given key', async () => {
    await saveInvoiceFile('key-a', makeFile('rechnung-a.pdf'), {
      invoiceNumber: 'RE-1',
      sellerName: 'Egger Bau',
    })

    const loaded = await loadInvoiceFile('key-a')
    expect(loaded).not.toBeNull()
    expect(loaded!.name).toBe('rechnung-a.pdf')
    expect(await loaded!.text()).toBe('%PDF-1.7 fake content')
  })

  it('overwrites a previous save for the same key', async () => {
    await saveInvoiceFile('key-a', makeFile('first.pdf'), {
      invoiceNumber: 'RE-1',
      sellerName: 'X',
    })
    await saveInvoiceFile('key-a', makeFile('second.pdf'), {
      invoiceNumber: 'RE-1',
      sellerName: 'X',
    })

    expect((await loadInvoiceFile('key-a'))!.name).toBe('second.pdf')
  })
})

describe('listSavedInvoices', () => {
  it('lists saved entries newest-first', async () => {
    await saveInvoiceFile('key-a', makeFile(), { invoiceNumber: 'RE-1', sellerName: 'X' })
    // `updatedAt` is millisecond-resolution -- force the two saves into
    // different milliseconds so "newest-first" has something to sort by.
    await new Promise((resolve) => setTimeout(resolve, 2))
    await saveInvoiceFile('key-b', makeFile(), { invoiceNumber: 'RE-2', sellerName: 'Y' })

    const entries = await listSavedInvoices()
    expect(entries.map((e) => e.key)).toEqual(['key-b', 'key-a'])
  })
})

describe('deleteInvoiceFile', () => {
  it('removes a saved entry', async () => {
    await saveInvoiceFile('key-a', makeFile(), { invoiceNumber: 'RE-1', sellerName: 'X' })
    await deleteInvoiceFile('key-a')

    expect(await loadInvoiceFile('key-a')).toBeNull()
    expect(await listSavedInvoices()).toEqual([])
  })
})

// `updatedAt` is millisecond-resolution and eviction breaks ties on it, so
// tests that depend on a specific save order need saves spread across
// distinct milliseconds -- otherwise tie-breaking falls back to IndexedDB's
// cursor order (ascending by key), not actual save order.
async function saveNumberedFiles(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await saveInvoiceFile(`key-${i}`, makeFile(), { invoiceNumber: `RE-${i}`, sellerName: 'X' })
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

describe('eviction', () => {
  it('keeps at most MAX_ENTRIES files in storage', async () => {
    await saveNumberedFiles(MAX_ENTRIES + 5)

    expect(await listSavedInvoices()).toHaveLength(MAX_ENTRIES)
  })

  it('drops the oldest entries first, keeping the most recently saved ones', async () => {
    await saveNumberedFiles(MAX_ENTRIES + 1)

    expect(await loadInvoiceFile('key-0')).toBeNull()
    expect(await loadInvoiceFile(`key-${MAX_ENTRIES}`)).not.toBeNull()
  })
})
