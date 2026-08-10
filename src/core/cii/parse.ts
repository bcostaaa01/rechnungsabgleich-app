import { XMLParser } from 'fast-xml-parser'
import Big from 'big.js'
import { parseAmount } from '@/core/money'
import { detectProfile } from '@/core/cii/profile'
import type { Invoice, InvoiceLine, Party, VatBreakdownEntry } from '@/core/cii/types'

// A parsed XML node is either a plain string/undefined (leaf, no
// attributes), or an object carrying '#text' alongside '@_'-prefixed
// attributes (leaf with attributes), or a nested object (non-leaf).
// parseTagValue is off, so every text value is a raw string -- never a JS
// number -- for money.ts to parse.
type XmlNode = string | Record<string, unknown> | undefined

function text(node: XmlNode): string | undefined {
  if (node === undefined) return undefined
  if (typeof node === 'string') return node
  const value = node['#text']
  return typeof value === 'string' ? value : undefined
}

function attr(node: XmlNode, name: string): string | undefined {
  if (typeof node !== 'object' || node === undefined) return undefined
  const value = node[`@_${name}`]
  return typeof value === 'string' ? value : undefined
}

function child(node: XmlNode, key: string): XmlNode {
  if (typeof node !== 'object' || node === undefined) return undefined
  return node[key] as XmlNode
}

function path(node: XmlNode, ...keys: string[]): XmlNode {
  return keys.reduce<XmlNode>((current, key) => child(current, key), node)
}

function required(value: string | undefined, description: string): string {
  if (value === undefined) throw new Error(`Malformed CII invoice: missing ${description}`)
  return value
}

function requiredAmount(node: XmlNode, description: string) {
  const parsed = parseAmount(text(node))
  if (parsed === null) throw new Error(`Malformed CII invoice: missing or unparseable ${description}`)
  return parsed
}

function optionalAmount(node: XmlNode) {
  return parseAmount(text(node))
}

function parseIssueDate(node: XmlNode): Date {
  const raw = required(text(node), 'rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString')
  const format = attr(node, 'format') ?? '102'
  if (format !== '102') {
    throw new Error(`Malformed CII invoice: unsupported date format "${format}" (expected 102)`)
  }
  const year = Number(raw.slice(0, 4))
  const month = Number(raw.slice(4, 6))
  const day = Number(raw.slice(6, 8))
  return new Date(Date.UTC(year, month - 1, day))
}

function parseParty(node: XmlNode, role: string): Party {
  return { name: required(text(child(node, 'ram:Name')), `${role}/ram:Name`) }
}

function parseLine(node: XmlNode): InvoiceLine {
  const lineId = required(
    text(path(node, 'ram:AssociatedDocumentLineDocument', 'ram:LineID')),
    'ram:AssociatedDocumentLineDocument/ram:LineID',
  )
  const product = child(node, 'ram:SpecifiedTradeProduct')
  const agreement = child(node, 'ram:SpecifiedLineTradeAgreement')
  const price = child(agreement, 'ram:NetPriceProductTradePrice')
  const delivery = child(node, 'ram:SpecifiedLineTradeDelivery')
  const billedQuantityNode = child(delivery, 'ram:BilledQuantity')
  const settlement = child(node, 'ram:SpecifiedLineTradeSettlement')
  const tax = child(settlement, 'ram:ApplicableTradeTax')
  const summation = child(settlement, 'ram:SpecifiedTradeSettlementLineMonetarySummation')

  // BasisQuantity trap: the unit price may be quoted per N units (e.g.
  // EUR 12,50 per 100 pieces). Defaulting to 1 when absent is correct;
  // ignoring it when present silently produces a wrong line total.
  const basisQuantity = optionalAmount(child(price, 'ram:BasisQuantity')) ?? new Big(1)

  return {
    lineId,
    sellerAssignedId: text(child(product, 'ram:SellerAssignedID')),
    name: required(text(child(product, 'ram:Name')), 'ram:SpecifiedTradeProduct/ram:Name'),
    billedQuantity: requiredAmount(billedQuantityNode, 'ram:SpecifiedLineTradeDelivery/ram:BilledQuantity'),
    unitCode: attr(billedQuantityNode, 'unitCode') ?? '',
    netUnitPrice: requiredAmount(
      child(price, 'ram:ChargeAmount'),
      'ram:NetPriceProductTradePrice/ram:ChargeAmount',
    ),
    basisQuantity,
    vatRate: requiredAmount(child(tax, 'ram:RateApplicablePercent'), 'line ram:RateApplicablePercent'),
    vatCategory: required(text(child(tax, 'ram:CategoryCode')), 'line ram:CategoryCode'),
    lineTotal: requiredAmount(child(summation, 'ram:LineTotalAmount'), 'ram:LineTotalAmount'),
  }
}

function parseVatEntry(node: XmlNode): VatBreakdownEntry {
  return {
    category: required(text(child(node, 'ram:CategoryCode')), 'header ram:CategoryCode'),
    ratePercent: requiredAmount(child(node, 'ram:RateApplicablePercent'), 'header ram:RateApplicablePercent'),
    basisAmount: requiredAmount(child(node, 'ram:BasisAmount'), 'ram:BasisAmount'),
    calculatedAmount: requiredAmount(child(node, 'ram:CalculatedAmount'), 'ram:CalculatedAmount'),
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreDeclaration: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (tagName, jPath) => {
    if (tagName === 'ram:IncludedSupplyChainTradeLineItem') return true
    if (
      tagName === 'ram:ApplicableTradeTax' &&
      typeof jPath === 'string' &&
      jPath.endsWith('ram:ApplicableHeaderTradeSettlement.ram:ApplicableTradeTax')
    ) {
      return true
    }
    return false
  },
})

export function parseCiiXml(xml: string): Invoice {
  let parsed: unknown
  try {
    parsed = parser.parse(xml)
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Malformed CII invoice: XML could not be parsed (${detail})`)
  }

  const root = child(parsed as XmlNode, 'rsm:CrossIndustryInvoice')
  if (root === undefined) {
    throw new Error('Malformed CII invoice: missing rsm:CrossIndustryInvoice root element')
  }

  const guidelineId = text(
    path(root, 'rsm:ExchangedDocumentContext', 'ram:GuidelineSpecifiedDocumentContextParameter', 'ram:ID'),
  )
  const { profile, capabilities } = detectProfile(guidelineId)

  const document = child(root, 'rsm:ExchangedDocument')
  const transaction = child(root, 'rsm:SupplyChainTradeTransaction')
  const agreement = child(transaction, 'ram:ApplicableHeaderTradeAgreement')
  const settlement = child(transaction, 'ram:ApplicableHeaderTradeSettlement')
  const summation = child(settlement, 'ram:SpecifiedTradeSettlementHeaderMonetarySummation')

  const rawLines = child(transaction, 'ram:IncludedSupplyChainTradeLineItem')
  const lines = Array.isArray(rawLines) ? (rawLines as XmlNode[]).map(parseLine) : []

  const rawVat = child(settlement, 'ram:ApplicableTradeTax')
  const vatBreakdown = Array.isArray(rawVat) ? (rawVat as XmlNode[]).map(parseVatEntry) : []

  return {
    profile,
    capabilities,
    invoiceNumber: required(text(child(document, 'ram:ID')), 'rsm:ExchangedDocument/ram:ID'),
    issueDate: parseIssueDate(path(document, 'ram:IssueDateTime', 'udt:DateTimeString')),
    currency: required(
      text(child(settlement, 'ram:InvoiceCurrencyCode')),
      'ram:ApplicableHeaderTradeSettlement/ram:InvoiceCurrencyCode',
    ),
    seller: parseParty(child(agreement, 'ram:SellerTradeParty'), 'ram:SellerTradeParty'),
    buyer: parseParty(child(agreement, 'ram:BuyerTradeParty'), 'ram:BuyerTradeParty'),
    lines,
    vatBreakdown,
    totals: {
      lineTotal: requiredAmount(child(summation, 'ram:LineTotalAmount'), 'ram:LineTotalAmount'),
      allowanceTotal: optionalAmount(child(summation, 'ram:AllowanceTotalAmount')),
      chargeTotal: optionalAmount(child(summation, 'ram:ChargeTotalAmount')),
      taxBasisTotal: requiredAmount(child(summation, 'ram:TaxBasisTotalAmount'), 'ram:TaxBasisTotalAmount'),
      taxTotal: requiredAmount(child(summation, 'ram:TaxTotalAmount'), 'ram:TaxTotalAmount'),
      grandTotal: requiredAmount(child(summation, 'ram:GrandTotalAmount'), 'ram:GrandTotalAmount'),
      totalPrepaid: optionalAmount(child(summation, 'ram:TotalPrepaidAmount')),
      duePayable: requiredAmount(child(summation, 'ram:DuePayableAmount'), 'ram:DuePayableAmount'),
    },
    paymentTermsText: text(
      path(settlement, 'ram:SpecifiedTradePaymentTerms', 'ram:Description'),
    ),
  }
}
