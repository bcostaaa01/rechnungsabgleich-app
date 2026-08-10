import Big from 'big.js'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { Invoice } from '@/core/cii/types'
import { parseCiiXml } from '@/core/cii/parse'
import type { Finding } from '@/core/checks/types'
import { runChecks } from '@/core/checks/runner'
import { loadDocument } from '@/pdf/loadDocument'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { findCiiXmlAttachment } from '@/pdf/extractAttachments'
import { extractDocumentText } from '@/pdf/extractPageText'
import { useReviewStore } from '@/stores/review'

// SPEC.md §6: default ±0,01, user-adjustable in the UI eventually -- no
// such control exists yet, so this stays a fixed constant for now.
const DEFAULT_TOLERANCE = new Big('0.01')

// SPEC.md §7: "Loading -- progress for parse and render separately." Each
// id corresponds to one real await in loadFromFile below, in order -- this
// is not a decorative progress bar, it's what's actually happening. Labels
// live here rather than in the component because they describe stages of
// this store's own loading process, not free-standing UI copy.
export type LoadingStep = 'pdf' | 'attachment' | 'parse' | 'pdf-text' | 'checks'

export const LOADING_STEPS: ReadonlyArray<{ id: LoadingStep; label: string }> = [
  { id: 'pdf', label: 'PDF wird geladen' },
  { id: 'attachment', label: 'ZUGFeRD-Anhang wird gesucht' },
  { id: 'parse', label: 'Rechnung wird geparst' },
  { id: 'pdf-text', label: 'PDF-Text wird gelesen' },
  { id: 'checks', label: 'Prüfungen laufen' },
]

export const useInvoiceStore = defineStore('invoice', () => {
  const fileName = ref<string | null>(null)
  const xml = ref<string | null>(null)
  // shallowRef, not ref+markRaw: Invoice/findings carry Big instances and
  // doc is a pdf.js class instance with private fields -- markRaw alone
  // only stops the runtime reactivity proxy, but Vue's UnwrapRef type
  // still recurses into a plain ref's type and mangles PDFDocumentProxy's
  // #private fields into an incompatible structural type. shallowRef
  // sidesteps UnwrapRef entirely, so it fixes both the runtime concern and
  // the type error. Each is still replaced wholesale on load, so the ref
  // itself keeps triggering updates.
  const invoice = shallowRef<Invoice | null>(null)
  const doc = shallowRef<PDFDocumentProxy | null>(null)
  const findings = shallowRef<Finding[]>([])
  const error = ref<string | null>(null)
  const loading = ref(false)
  const loadingStep = ref<LoadingStep | null>(null)

  async function loadFromFile(file: File) {
    loading.value = true
    error.value = null
    invoice.value = null
    doc.value = null
    findings.value = []
    xml.value = null
    fileName.value = file.name
    // A new invoice's line IDs can coincidentally collide with the
    // previous one's (e.g. both start "1", "2", ...) -- reset review
    // decisions unconditionally rather than risk them applying to the
    // wrong lines.
    useReviewStore().reset()

    try {
      loadingStep.value = 'pdf'
      const loadedDoc = await loadDocument(file)

      loadingStep.value = 'attachment'
      const attachment = await findCiiXmlAttachment(loadedDoc)
      if (!attachment) {
        throw new Error('Kein ZUGFeRD-Anhang gefunden')
      }
      xml.value = attachment.xml

      loadingStep.value = 'parse'
      const parsedInvoice = parseCiiXml(attachment.xml)

      loadingStep.value = 'pdf-text'
      const pdfText = await extractDocumentText(loadedDoc)

      loadingStep.value = 'checks'
      doc.value = loadedDoc
      invoice.value = parsedInvoice
      findings.value = runChecks(parsedInvoice, { tolerance: DEFAULT_TOLERANCE, pdfText })
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    } finally {
      loading.value = false
      loadingStep.value = null
    }
  }

  function reset() {
    fileName.value = null
    xml.value = null
    invoice.value = null
    doc.value = null
    findings.value = []
    error.value = null
    loading.value = false
    loadingStep.value = null
    useReviewStore().reset()
  }

  return { fileName, xml, invoice, doc, findings, error, loading, loadingStep, loadFromFile, reset }
})
