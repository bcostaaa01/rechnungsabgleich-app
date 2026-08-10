import Big from 'big.js'
import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import type { Invoice } from '@/core/cii/types'
import { parseCiiXml } from '@/core/cii/parse'
import type { Finding } from '@/core/checks/types'
import { runChecks } from '@/core/checks/runner'
import { loadDocument } from '@/pdf/loadDocument'
import type { PDFDocumentProxy } from '@/pdf/pdfjs'
import { findCiiXmlAttachment } from '@/pdf/extractAttachments'
import { extractDocumentText } from '@/pdf/extractPageText'

// SPEC.md §6: default ±0,01, user-adjustable in the UI eventually -- no
// such control exists yet, so this stays a fixed constant for now.
const DEFAULT_TOLERANCE = new Big('0.01')

export const useInvoiceStore = defineStore('invoice', () => {
  const fileName = ref<string | null>(null)
  const xml = ref<string | null>(null)
  // Invoice/doc/findings all carry Big instances or complex pdf.js class
  // instances -- markRaw so Vue's reactivity proxy never wraps them. Each
  // is replaced wholesale on load, so the ref itself still triggers
  // updates; only the contents stay unproxied.
  const invoice = ref<Invoice | null>(null)
  const doc = ref<PDFDocumentProxy | null>(null)
  const findings = ref<Finding[]>([])
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function loadFromFile(file: File) {
    loading.value = true
    error.value = null
    invoice.value = null
    doc.value = null
    findings.value = []
    xml.value = null
    fileName.value = file.name

    try {
      const loadedDoc = await loadDocument(file)
      const attachment = await findCiiXmlAttachment(loadedDoc)
      if (!attachment) {
        throw new Error('Kein ZUGFeRD-Anhang gefunden')
      }
      xml.value = attachment.xml
      const parsedInvoice = parseCiiXml(attachment.xml)
      const pdfText = await extractDocumentText(loadedDoc)

      doc.value = markRaw(loadedDoc)
      invoice.value = markRaw(parsedInvoice)
      findings.value = markRaw(runChecks(parsedInvoice, { tolerance: DEFAULT_TOLERANCE, pdfText }))
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    } finally {
      loading.value = false
    }
  }

  return { fileName, xml, invoice, doc, findings, error, loading, loadFromFile }
})
