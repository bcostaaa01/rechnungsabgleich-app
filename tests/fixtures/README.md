# Test fixtures

Committed sample invoices used by the automated test suite and the
"Beispielrechnung laden" button (`DropZone.vue`). All are hand-built via a
throwaway `pdf-lib` script (not committed -- `pdf-lib` itself stays out of
`package.json`; generating invoices is explicitly out of scope for the app
per `SPEC.md` §1), not sourced from the official FeRD/Mustangproject sample
sets. Pulling those in for broader profile coverage (MINIMUM, BASIC WL,
EXTENDED, XRECHNUNG) is a good follow-up, not done yet.

## `en16931-sample.{pdf,xml}`

A clean, arithmetically-correct EN 16931 invoice: Egger Bau GmbH → Muster
Bauträger AG, two line items at mixed VAT rates (20% and 10% -- the case
`SPEC.md` §8 calls mandatory, since Austrian construction invoices
routinely have both). Every check in the suite passes on it.

| Field | Value |
|---|---|
| Profile | EN 16931 |
| Rechnungsnummer | 2024-0815 |
| Rechnungsdatum | 15.08.2024 |
| Nettobetrag gesamt | 2.385,00 € |
| Steuerbetrag | 361,00 € (245,00 € @ 20% + 116,00 € @ 10%) |
| Bruttobetrag | 2.746,00 € |

Used by `parse.test.ts`, `extractAttachments.test.ts`,
`extractPageText.test.ts`, and the `public/beispielrechnung.pdf` copy
behind the "Beispielrechnung laden" button.

## `en16931-broken.{pdf,xml}`

Same invoice shape, same seller/buyer, invoice number `2024-0816` --
with two deliberate defects, per `SPEC.md` §8's "two hand-built broken
files" requirement (built as one combined fixture instead of two narrow
ones, so both failure modes show up together in one findings list):

1. **Line 1's total doesn't multiply out.** 12,5 m³ × 98,00 € actually
   comes to 1.225,00 €; the XML's stored `LineTotalAmount` says 1.200,00 €.
2. **The printed grand total disagrees with the XML.** The PDF page reads
   "Bruttobetrag: 2.700,00 €"; the XML's `GrandTotalAmount` is 2746.00 --
   the PDF-vs-XML mismatch this whole app is named after ("the demo...
   the whole product argument lands in five seconds," `SPEC.md` §8).

The header totals (`LineTotalAmount`, `TaxBasisTotalAmount`, VAT
breakdown) were **not** patched to match the wrong line -- that's
deliberate. It's the realistic failure shape (a bug in how one line's
total got stored, while the rest of the document was computed correctly
from the true figure), and it cascades into two more findings for free
instead of requiring every downstream number to be hand-tuned into a
consistent alternate universe.

Expected findings when run through the check suite (tolerance ±0,01 €):

| Rule | Why it fires |
|---|---|
| `R-LINE-01` | Line 1: 12,5 × 98,00 = 1.225,00 ≠ stored 1.200,00 |
| `R-SUM-01` | Actual line sum 1.200,00 + 1.160,00 = 2.360,00 ≠ header 2.385,00 |
| `R-VAT-01` | Sum of lines at 20% (1.200,00) ≠ VAT breakdown basis (1.225,00) |
| `R-PDF-01` | Printed 2.700,00 € ≠ XML `GrandTotalAmount` 2.746,00 |

Everything else stays clean: `R-BASIS-01`/`R-TOTAL-01`/`R-TOTAL-02` only
compare header fields to each other, which are internally consistent
regardless of the line-level bug, and `R-PDF-02` still finds the (correct)
printed invoice number.

Used by `en16931-broken.test.ts`, which runs the real pipeline (extract →
parse → checks) against the actual PDF and asserts exactly these four
findings fire and no others -- proof the fixture is broken in precisely
the intended way, not just eyeballed. Also worth dragging into the
running app by hand (`npm run dev`) to see the findings list render
something real.
