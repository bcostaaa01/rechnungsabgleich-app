import { pdfjsLib, type PDFDocumentProxy } from '@/pdf/pdfjs'

export async function loadDocument(file: File): Promise<PDFDocumentProxy> {
  const data = await file.arrayBuffer()
  return pdfjsLib.getDocument({ data }).promise
}
