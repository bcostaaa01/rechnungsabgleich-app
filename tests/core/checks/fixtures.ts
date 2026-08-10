import Big from 'big.js'
import type { Invoice } from '@/core/cii/types'

// Fresh, arithmetically-correct 2-line invoice with mixed 20%/10% VAT
// rates (SPEC.md §8: "mixed VAT rates in a single invoice is mandatory").
// Returns a brand new object graph each call -- tests mutate the result
// directly to build failing/boundary cases, no shared references.
export function makeInvoice(): Invoice {
  return {
    profile: 'EN16931',
    capabilities: { hasLineItems: true, hasVatBreakdown: true, hasPaymentTerms: true },
    invoiceNumber: '2024-0815',
    issueDate: new Date(Date.UTC(2024, 7, 15)),
    currency: 'EUR',
    seller: { name: 'Egger Bau GmbH' },
    buyer: { name: 'Muster Bautraeger AG' },
    lines: [
      {
        lineId: '1',
        name: 'Beton C25/30',
        billedQuantity: new Big('12.5'),
        unitCode: 'MTQ',
        netUnitPrice: new Big('98.00'),
        basisQuantity: new Big(1),
        vatRate: new Big('20'),
        vatCategory: 'S',
        lineTotal: new Big('1225.00'),
      },
      {
        lineId: '2',
        name: 'Bewehrungsstahl',
        billedQuantity: new Big('0.8'),
        unitCode: 'TNE',
        netUnitPrice: new Big('1450.00'),
        basisQuantity: new Big(1),
        vatRate: new Big('10'),
        vatCategory: 'S',
        lineTotal: new Big('1160.00'),
      },
    ],
    vatBreakdown: [
      {
        category: 'S',
        ratePercent: new Big('20'),
        basisAmount: new Big('1225.00'),
        calculatedAmount: new Big('245.00'),
      },
      {
        category: 'S',
        ratePercent: new Big('10'),
        basisAmount: new Big('1160.00'),
        calculatedAmount: new Big('116.00'),
      },
    ],
    totals: {
      lineTotal: new Big('2385.00'),
      allowanceTotal: null,
      chargeTotal: null,
      taxBasisTotal: new Big('2385.00'),
      taxTotal: new Big('361.00'),
      grandTotal: new Big('2746.00'),
      totalPrepaid: null,
      duePayable: new Big('2746.00'),
    },
    paymentTermsText:
      'Zahlbar innerhalb 14 Tagen ohne Abzug, bei Zahlung innerhalb 7 Tagen 2% Skonto.',
  }
}
