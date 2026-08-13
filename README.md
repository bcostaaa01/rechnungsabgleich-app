# rechnungsabgleich

[![CI](https://github.com/bcostaaa01/rechnungsabgleich-app/actions/workflows/ci.yml/badge.svg)](https://github.com/bcostaaa01/rechnungsabgleich-app/actions/workflows/ci.yml)

A browser-only reviewer for German/European hybrid e-invoices (**ZUGFeRD /
Factur-X**). Drop in an invoice PDF and it extracts the embedded XML,
renders both side by side, and points at exactly where the human-readable
document and the machine-readable data disagree.

No backend. No database. No file leaves the browser.

## Das Problem

Eine hybride E-Rechnung (ZUGFeRD/Factur-X) ist eine PDF-Datei, die
zusätzlich eine maschinenlesbare XML-Datei mit denselben Rechnungsdaten
enthält. Das PDF zeigt die Rechnung wie gewohnt an, während die eingebettete
XML-Datei nach dem UN/CEFACT-CII-Standard strukturierte Daten für die
automatische Weiterverarbeitung liefert – etwa für die Buchhaltungssoftware
des Empfängers.

Beide Darstellungen werden oft von unterschiedlichen Komponenten einer
Rechnungssoftware erzeugt – oder nachträglich manuell angepasst.
Rundungsfehler, veraltete Vorlagen oder Bugs in der Datengenerierung können
dazu führen, dass die sichtbare Zahl auf dem PDF nicht mehr mit dem Wert in
der XML-Datei übereinstimmt. Da Buchhaltungssysteme meist die XML-Daten
verarbeiten, Menschen aber das PDF lesen, kann eine solche Abweichung
unbemerkt bleiben – mit realen finanziellen Folgen.

## What it does today

**Load & parse**
- Drag-and-drop (or a bundled "Beispielrechnung laden" sample) loads a
  ZUGFeRD/Factur-X PDF entirely client-side and extracts the embedded CII XML
- Detects the ZUGFeRD **profile** (MINIMUM / BASIC WL / BASIC / EN 16931 /
  EXTENDED / XRechnung) and gates the UI and checks accordingly — MINIMUM and
  BASIC WL invoices have no line items, and the app never assumes otherwise
- Parses header data, line items, VAT breakdown, and totals into a typed
  domain model

**Check suite** — 13 pure, unit-tested rules, each mapped to its EN 16931
business rule where one exists:

| Rule | Checks |
|---|---|
| `R-LINE-01` | Menge ÷ Basismenge × Einzelpreis = Positions-Nettobetrag |
| `R-SUM-01` | Σ Positions-Nettobeträge = Rechnungs-Nettobetrag |
| `R-BASIS-01` | Nettobetrag − Abschläge + Zuschläge = Steuerbemessungsgrundlage |
| `R-VAT-01` | Σ Netto je Steuersatz = Bemessungsgrundlage |
| `R-VAT-02` | Bemessungsgrundlage × Steuersatz ÷ 100 = Steuerbetrag |
| `R-VAT-03` | Σ Steuerbeträge = Steuergesamtbetrag |
| `R-TOTAL-01` | Steuerbemessungsgrundlage + Steuergesamtbetrag = Bruttobetrag |
| `R-TOTAL-02` | Bruttobetrag − gezahlter Betrag = Zahlbetrag |
| `R-CUR-01` | Alle Beträge verwenden dieselbe Währung |
| `R-PDF-01` | Bruttobetrag ist im sichtbaren PDF-Text auffindbar |
| `R-PDF-02` | Rechnungsnummer ist im sichtbaren PDF-Text auffindbar |
| `R-PDF-03` | IBAN ist im sichtbaren PDF-Text auffindbar |
| `R-IBAN-01` | IBAN besteht die ISO 7064 MOD-97-10-Prüfsumme |

`R-PDF-01`/`02`/`03` are the point of the whole app: the checks that cross
the PDF/XML boundary rather than just re-deriving totals. `R-IBAN-01` is a
companion structural check — the invoice's bank details are the single
most-cited red flag in real invoice/vendor-fraud cases (mismatched or
corrupted IBANs), so it's a natural extension of the same PDF-vs-XML thesis
applied to payment data. Findings carry a severity (`error` beyond
tolerance, `warning` within a user-adjustable ±0,01 € band) and a
plain-German explanation.

**The gutter** — click a finding or a position row (or use `j`/`k` to move
between rows) and the PDF pane jumps to the right page and draws a highlight
box around the exact printed text, colour-coded by severity. This is the
signature interaction: it's what lets a reviewer visually compare "what the
data says" against "what's printed" without hunting through the document by
eye. `R-IBAN-01` findings are clickable too — a checksum-invalid IBAN is
still presumably printed somewhere, so a reviewer can jump straight to it
and eyeball it against a real bank statement. `R-PDF-01`/`02`/`03` never
carry a clickable target, by definition: they fire exactly when a value is
confirmed *absent* from the PDF, so there's nothing on the page to point
at.

**Review workflow** — accept or flag each position with an optional note,
full keyboard navigation (`j`/`k`/`a`/`f`/`?`), and export the reviewed
result as a **Korrekturblatt** (CSV or JSON) — invoice metadata, header-level
findings, and one row per position with its status, note, and findings
attached.

**Everything else expected of a real tool** — dark mode (follows OS
preference, overridable, no flash of the wrong theme), per-step loading
feedback (extract → parse → text layer → checks), defensive handling of
malformed XML / missing attachments / encrypted PDFs, and a dedicated Info
page explaining the domain, the rule catalogue, and known limitations.

## Not (yet) implemented

- Broader profile coverage in the test fixtures (MINIMUM, BASIC WL,
  EXTENDED, XRechnung) — currently all hand-built EN 16931 fixtures.
- Structured Skonto (early-payment discount) parsing — payment terms are
  shown as free text only; see *Known limitations* below for why.

## Explicitly out of scope

This is a portfolio piece, not a product, and the scope discipline is
deliberate:

- No backend, database, auth, or file persistence — everything runs in the
  browser, static deploy only.
- No multi-invoice management, dashboard, or cost tracking.
- No AI/LLM extraction — this reads *structured* data; guessing from a PDF
  render is a different problem.
- No three-way match against orders or delivery notes.
- No invoice generation or XML writing.
- No full EN 16931 Schematron validation — that's a solved problem with an
  official reference implementation; see [KoSIT's
  validator](https://github.com/itplr-kosit/validator-configuration-xrechnung)
  rather than a reimplementation here.

## Architecture

```
src/
  core/          framework-free, fully unit-tested (Node, no DOM/pdf.js)
    money.ts       the only module that imports big.js
    cii/            XML → typed domain model, profile detection
    checks/         the rule registry + runner
    review/         Korrekturblatt model + CSV/JSON export
  pdf/           everything pdf.js: worker wiring, rendering, text-layer
                 extraction, text-location for the gutter
  stores/        two Pinia stores — invoice (loaded doc, findings) and
                 review (per-position decisions, active highlight)
  components/    DropZone, PdfPane, PositionTable, FindingList,
                 ProfileBanner, ExportMenu, …
```

Two rules hold the design together:

- **`src/core/` knows nothing about Vue, the DOM, or pdf.js.** Pure
  TypeScript in, pure TypeScript out. Everything uncertain or hard to test
  (rendering, file I/O, text positioning) lives outside it, which is why
  `core/` has near-total test coverage and the components have almost none —
  that split is intentional.
- **Never use `number` for a monetary or quantity value from the XML.**
  Amounts are parsed to `Big`, computed in `Big`, and only rounded at
  defined boundaries. Unit prices in CII can carry four decimal places and
  quantities are fractional (2,5 m³) — integer cents can't represent
  `€0,0375 / Stück` without a second scaling concept, so `big.js` earns its
  place. `money.ts` is the one module allowed to import it, and it's the one
  module written test-first.

Repo is an npm workspaces monorepo: the main app depends on
`packages/design-system`, a small Storybook-based component library
(`Button`, `Badge`, shared Tailwind design tokens) so the visual language
has one source of truth.

## Known limitations

Stated plainly rather than hidden:

- PDF-vs-XML text matching (`R-PDF-01`/`02`/`03`) is heuristic — CII carries
  no coordinates, so it's a substring search over extracted text, not a real
  cross-reference.
- `R-IBAN-01` checks checksum and general IBAN shape (ISO 13616), not the
  per-country exact length — a 34+-country length table is real external
  data with its own maintenance surface, deliberately out of scope.
- The IBAN only surfaces in the UI via findings — there's no always-visible
  payment-details display, so a reviewer sees it only when `R-IBAN-01` or
  `R-PDF-03` actually fires, not as a routine "here's the account on file"
  check.
- Skonto (early-payment discount) terms live in free text in most profiles
  and are shown as-is, not parsed structurally.
- No full EN 16931 conformance validation — see the KoSIT validator link
  above for that.
- `formatEUR` prints negative amounts with a leading minus; German/Austrian
  accounting documents conventionally use a *trailing* minus for
  Gutschriften. Documented, not fixed, pending a real negative-amount PDF
  fixture to verify against.

## Tech stack

Vue 3 (`<script setup>`) · TypeScript (`strict: true`) · Vite · Vue Router ·
Pinia · pdfjs-dist · fast-xml-parser · big.js · Tailwind CSS v4 · Vitest ·
ESLint + Prettier · GitHub Actions CI.

## Getting started

```bash
npm install
npm run dev          # local dev server
```

```bash
npm run build         # typecheck + production build
npm run test:unit     # Vitest
npm run lint           # ESLint
npm run format          # Prettier
```

Everything is static output — deploy the `dist/` folder to Vercel, Netlify,
or any static host.

## Testing

`core/` is the seniority argument, so it's tested accordingly: every check
rule gets a passing case, a failing case, and a within-tolerance case, mixed
VAT rates are mandatory (Austrian construction invoices routinely have
20% and 10% on the same document), and `money.ts` was written test-first —
rounding at the half-cent boundary in both directions, accumulation error,
four-decimal unit prices, `BasisQuantity` traps, negative amounts, zero
quantity. Fixtures in `tests/fixtures/` include a clean invoice, a
deliberately broken one (wrong line total *and* a PDF/XML total mismatch,
asserted to produce exactly four findings and no others), a two-page
invoice exercising the gutter's page-jump path, and a payment-details
fixture (checksum-invalid IBAN, printed and findable on the PDF) proving
`R-IBAN-01` and `R-PDF-03` fire — and stay silent — correctly.

**Trying the IBAN checks by hand:** `npm run dev`, then drag
`tests/fixtures/en16931-payment.pdf` onto the drop zone (it isn't wired to
the "Beispielrechnung laden" button, which only loads the clean sample).
The Prüfung tab shows exactly one finding, `R-IBAN-01` — click it and the
PDF pane jumps to the printed `DE89 3704 0044 0532 0130 99` and highlights
it. Drop in `en16931-broken.pdf` or the clean `en16931-sample.pdf` instead
to see `R-PDF-03` correctly stay silent when there's no IBAN in the
invoice at all.

## Built with Claude Code

This project was built in close collaboration with Claude Code, guided by
`SPEC.md` (the product/domain spec) and `CLAUDE.md` (the operating manual —
architecture rules, money-handling rule, commit conventions). AI tooling
accelerated parsing the CII schema and scaffolding rules/components/tests
against an established pattern; `money.ts` and the domain model were kept on
a tight leash — tests written first, changes reviewed line-by-line, since
that's the one module where a plausible-looking mistake is the whole ballgame.
