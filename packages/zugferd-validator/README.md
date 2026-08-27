# zugferd-validator

Parse and validate ZUGFeRD/Factur-X e-invoices (the CII XML embedded in a
hybrid e-invoice PDF, or a standalone XRechnung XML): profile detection,
an EN 16931-mapped arithmetic check suite, and IBAN validation. Pure
TypeScript, no DOM dependency — runs anywhere Node or a bundler does.

Extracted from [rechnungsabgleich](https://github.com/bcostaaa01/rechnungsabgleich-app),
a browser-based ZUGFeRD/Factur-X reviewer, where this is the framework-free
engine behind the UI.

## Install

```bash
npm install zugferd-validator
```

## Usage

```ts
import { parseCiiXml, runChecks, parseAmount } from 'zugferd-validator'

const invoice = parseCiiXml(xmlString)

const findings = runChecks(invoice, {
  tolerance: parseAmount('0.01')!, // a Money (big.js Big) value, not a plain number
  // pdfText: extractedPdfText, // optional -- enables the R-PDF-01/02/03 checks
})

for (const finding of findings) {
  console.log(finding.ruleId, finding.severity, finding.messageDe)
}
```

`parseCiiXml` throws on structurally malformed XML (missing required
fields, an unrecognized date format, no `rsm:CrossIndustryInvoice` root).
Wrap it in a `try`/`catch` if the input isn't already known-good.

## What's checked

13 rules, mapped to their EN 16931 business rule where one exists — line
totals, VAT basis/calculated amounts, tax basis, grand total, due payable,
currency consistency, and IBAN validity/checksum. Three of them
(`R-PDF-01/02/03`) cross-check invoice values against the PDF's visible
text, if you pass `pdfText` — extract that however you like (pdf.js,
pdfplumber via a subprocess, your own OCR pipeline); this package has no
opinion on how you got the text, only on what it's checked against.

The full rule catalogue, with plain-language descriptions, is available at
runtime as `rules` (see [Public API](#public-api)).

`MINIMUM` and `BASIC WL` ZUGFeRD profiles carry no line items — `runChecks`
already filters out line-item/VAT-breakdown-dependent rules for those
profiles via `invoice.capabilities`, so you don't need to special-case it
yourself.

## Public API

- **Parsing & profile**: `parseCiiXml`, `detectProfile`, `unitLabel`
- **Checks**: `runChecks`, `rules`, `RuleEntry`, `Rule`, `Finding`,
  `Severity`, `FindingTarget`, `CheckContext`
- **Domain types**: `Invoice`, `InvoiceLine`, `Party`, `VatBreakdownEntry`,
  `InvoiceTotals`, `ZugferdProfile`, `ProfileCapabilities`
- **Money**: `Money`, `Quantity`, `parseAmount`, `add`, `multiply`,
  `round2`, `equalWithin`, `formatEUR`, `formatQuantity` — amounts are
  [big.js](https://github.com/MikeMcl/big.js) `Big` instances throughout,
  never plain `number`: CII unit prices can carry four decimal places, and
  integer cents can't represent `€0.0375` per unit without a second
  scaling concept.
- **IBAN**: `isValidIban` (ISO 7064 MOD-97-10 checksum + ISO 13616 shape,
  not a per-country exact-length table), `formatIban` (display grouping)

## Known limitations

- `Finding.messageDe` is German-language text — this library's domain
  vocabulary (Rechnungsnummer, Steuersatz, etc.) is inherently German, and
  the messages follow suit. Not yet internationalized; `ruleId` and
  `severity` are stable, locale-independent fields if you need to build
  your own messages.
- No full EN 16931 Schematron conformance validation — this checks
  internal arithmetic consistency (does the invoice add up to itself), not
  full standard conformance. See the [KoSIT
  validator](https://github.com/itplr-kosit/validator-configuration-xrechnung)
  for that.
- IBAN validation checks checksum and general shape, not per-country exact
  length (a 34+-country length table is real external data with its own
  maintenance surface).

## License

MIT
