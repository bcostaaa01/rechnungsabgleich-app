// Tier 2 of the review-persistence feature (tier 1 is reviewPersistence.ts,
// which only ever caches review *metadata*). This module caches the actual
// PDF bytes so a previously-worked-on invoice can be reopened into the
// live preview, not just summarised -- a materially bigger deviation from
// CLAUDE.md's "no file persistence" than tier 1, confirmed with the user
// before building. Deliberately outside src/core/ for the same reason as
// reviewPersistence.ts: IndexedDB is a browser API.
//
// localStorage (tier 1's mechanism) can't hold this: it's a small,
// synchronous, string-only quota. IndexedDB holds Blob/File objects
// directly, asynchronously, at a much larger quota.

const DB_NAME = 'rechnungsabgleich'
const DB_VERSION = 1
const STORE_NAME = 'invoiceFiles'

export interface SavedInvoiceEntry {
  key: string
  invoiceNumber: string
  sellerName: string
  fileName: string
  updatedAt: string
}

interface StoredInvoiceFile extends SavedInvoiceEntry {
  file: Blob
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Every export below is best-effort and fails silently (quota exceeded,
// IndexedDB unavailable in some private-browsing modes, etc.) -- this is a
// WIP convenience cache, never something the review flow should block on.

export async function saveInvoiceFile(
  key: string,
  file: File,
  meta: { invoiceNumber: string; sellerName: string },
): Promise<void> {
  try {
    const db = await openDb()
    const record: StoredInvoiceFile = {
      key,
      invoiceNumber: meta.invoiceNumber,
      sellerName: meta.sellerName,
      fileName: file.name,
      updatedAt: new Date().toISOString(),
      file,
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // best-effort, see module comment
  }
}

export async function loadInvoiceFile(key: string): Promise<File | null> {
  try {
    const db = await openDb()
    const record = await new Promise<StoredInvoiceFile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result as StoredInvoiceFile | undefined)
      request.onerror = () => reject(request.error)
    })
    db.close()
    if (!record) return null
    return new File([record.file], record.fileName, { type: record.file.type })
  } catch {
    return null
  }
}

export async function listSavedInvoices(): Promise<SavedInvoiceEntry[]> {
  try {
    const db = await openDb()
    const records = await new Promise<StoredInvoiceFile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result as StoredInvoiceFile[])
      request.onerror = () => reject(request.error)
    })
    db.close()
    return records
      .map((record) => ({
        key: record.key,
        invoiceNumber: record.invoiceNumber,
        sellerName: record.sellerName,
        fileName: record.fileName,
        updatedAt: record.updatedAt,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

export async function deleteInvoiceFile(key: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // best-effort, see module comment
  }
}
