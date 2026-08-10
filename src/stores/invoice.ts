import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import type { Invoice } from '@/core/cii/types'
import { parseCiiXml } from '@/core/cii/parse'
import { loadDocument } from '@/pdf/loadDocument'
import { findCiiXmlAttachment } from '@/pdf/extractAttachments'

export const useInvoiceStore = defineStore('invoice', () => {
  const fileName = ref<string | null>(null)
  const xml = ref<string | null>(null)
  // Invoice carries Big instances throughout -- markRaw so Vue's reactivity
  // proxy never wraps them. It's replaced wholesale on each load, so the
  // ref itself still triggers updates; only the contents stay unproxied.
  const invoice = ref<Invoice | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function loadFromFile(file: File) {
    loading.value = true
    error.value = null
    invoice.value = null
    xml.value = null
    fileName.value = file.name

    try {
      const doc = await loadDocument(file)
      const attachment = await findCiiXmlAttachment(doc)
      if (!attachment) {
        throw new Error('Kein ZUGFeRD-Anhang gefunden')
      }
      xml.value = attachment.xml
      invoice.value = markRaw(parseCiiXml(attachment.xml))
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    } finally {
      loading.value = false
    }
  }

  return { fileName, xml, invoice, error, loading, loadFromFile }
})
