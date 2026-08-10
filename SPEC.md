# rechnungsabgleich — Projektspezifikation

A browser-only reviewer for German/European hybrid e-invoices (ZUGFeRD / Factur-X). Drop in an invoice PDF, and the app extracts the embedded XML, renders both side by side, and reports exactly where the human-readable document and the machine-readable data disagree.

Built as a portfolio piece targeting reebuild GmbH (Wien) — their product turns construction documents into structured datasets and reconciles PDF against XML for e-invoices. This is a small, sharp version of that.

---

## 1. Scope

### In scope

1. Load a ZUGFeRD/Factur-X PDF entirely client-side, extract the embedded CII XML.
2. Detect and display the ZUGFeRD **profile** (MINIMUM / BASIC WL / BASIC / EN 16931 / EXTENDED / XRECHNUNG).
3. Parse header data, line items (`Rechnungspositionen`), VAT breakdown, and totals.
4. Run an arithmetic and consistency check suite; report findings with severity.
5. Cross-check XML values against text actually visible in the PDF.
6. Let a reviewer accept or flag each position, and export the result as a `Korrekturblatt`.

### Explicitly out of scope

Write these into the README. Scope discipline is part of what's being demonstrated.

- No backend, no database, no auth, no file persistence.
- No multi-invoice management, no dashboard, no project/cost tracking.
- No AI/LLM extraction. This app reads *structured* data; guessing is a different problem.
- No three-way match against orders or delivery notes.
- No invoice **generation** or XML writing.
- No full EN 16931 validation (that's Schematron's job — link to KoSIT's validator in the README and say why you didn't reimplement it).

---

## 2. Tech stack

Chosen to mirror reebuild's stated stack (Vue.js + TypeScript) and to keep the whole thing deployable as static files.

| Concern | Choice | Why |
|---|---|---|
| Framework | **Vue 3** (`<script setup>`, Composition API) | Their frontend stack |
| Language | **TypeScript**, `strict: true` | Non-negotiable for a domain with this much shape |
| Build | **Vite** | Default for Vue, fast, static output |
| State | **Pinia** | Two stores only — resist more |
| PDF | **pdfjs-dist** | Rendering, attachment extraction, and text layer in one lib |
| XML | **fast-xml-parser** | Predictable object output, attribute handling, no DOM dependency (so `core/` stays testable in Node) |
| Money | **big.js** | See §5. Do not use raw floats |
| Styling | **Tailwind CSS v4** | Fast, and this UI is functional, not expressive |
| Tests | **Vitest** | Same toolchain as Vite |
| Lint/format | **ESLint + Prettier** (or Biome) | Config committed, CI runs it |
| CI | **GitHub Actions** | typecheck + lint + test on push. A green badge is cheap credibility |
| Deploy | **Vercel** or **Netlify** | Static. Link must work from a phone |

### Bootstrap

```bash
npm create vue@latest rechnungsabgleich
# select: TypeScript, Router: No, Pinia: Yes, Vitest: Yes, ESLint: Yes, Prettier: Yes

cd rechnungsabgleich
npm install pdfjs-dist fast-xml-parser big.js
npm install -D @types/big.js tailwindcss @tailwindcss/vite
```

Add Tailwind v4 to `vite.config.ts` via the `@tailwindcss/vite` plugin and `@import "tailwindcss";` in your main CSS. No `tailwind.config.js` needed unless you extend the theme.

### pdf.js worker setup (Vite)

This is the first thing that will break. Get it out of the way in a single module:

```ts
// src/pdf/pdfjs.ts
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
export { pdfjsLib }
```

Never import `pdfjs-dist` anywhere else directly. The worker version must match the library version exactly, so pin `pdfjs-dist` to an exact version in `package.json` (no caret) and say so in a comment.

---

## 3. Domain primer

Read this once; it saves a day of confusion.

**ZUGFeRD 2.x and Factur-X 1.x are the same format** (German/French alignment). It's a **PDF/A-3** with the invoice XML attached as an embedded file. The XML follows **UN/CEFACT CII** (Cross Industry Invoice), root element `rsm:CrossIndustryInvoice`.

**XRechnung** is different: usually a *standalone* XML with no PDF at all, in either CII or UBL syntax. Handle it as a separate input path (§7, E4).

### Finding the attachment

Attachment filename varies by version — check all of these, case-insensitively:

- `factur-x.xml` (ZUGFeRD 2.1+ / Factur-X)
- `zugferd-invoice.xml` (ZUGFeRD 2.0)
- `ZUGFeRD-invoice.xml` (ZUGFeRD 1.0)
- `xrechnung.xml` (XRechnung-as-ZUGFeRD variant)

Fall back to: any attachment ending in `.xml` whose root element is `rsm:CrossIndustryInvoice`.

### Profiles — the important edge case

Read from:
```
rsm:ExchangedDocumentContext
  /ram:GuidelineSpecifiedDocumentContextParameter
    /ram:ID
```

**MINIMUM and BASIC WL profiles contain no line items at all.** They carry totals only. If your UI assumes positions exist, it explodes on perfectly valid invoices. Detect the profile first, then decide which checks can even run, and show the user a clear banner explaining what's available. Handling this correctly is the single most convincing detail in the project — it proves you read the standard rather than one blog post.

### Key CII paths

Header:
```
rsm:ExchangedDocument/ram:ID                                  → Rechnungsnummer
rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString    → Rechnungsdatum (format 102 = YYYYMMDD)
```

Line items (repeating):
```
rsm:SupplyChainTradeTransaction/ram:IncludedSupplyChainTradeLineItem
  ram:AssociatedDocumentLineDocument/ram:LineID
  ram:SpecifiedTradeProduct/ram:Name
  ram:SpecifiedTradeProduct/ram:SellerAssignedID
  ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount
  ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity   ← see below
  ram:SpecifiedLineTradeDelivery/ram:BilledQuantity            (@unitCode)
  ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:RateApplicablePercent
  ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode
  ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount
```

> **`BasisQuantity` trap:** the unit price may be quoted per N units (e.g. €12.50 per 100 pieces). The line total is `BilledQuantity ÷ BasisQuantity × ChargeAmount`. Defaulting `BasisQuantity` to 1 when absent is correct; ignoring it when present is a wrong answer that looks right on most test files.

Totals:
```
ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation
  ram:LineTotalAmount, ram:AllowanceTotalAmount, ram:ChargeTotalAmount,
  ram:TaxBasisTotalAmount, ram:TaxTotalAmount (@currencyID),
  ram:GrandTotalAmount, ram:TotalPrepaidAmount, ram:DuePayableAmount
```

VAT breakdown (repeating, one per rate/category):
```
ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax
  ram:BasisAmount, ram:CalculatedAmount, ram:RateApplicablePercent, ram:CategoryCode
```

Payment terms (incl. Skonto):
```
ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradePaymentTerms/ram:Description
```
Skonto lives in **free text** here in most profiles. Parse it best-effort, mark it low-confidence, and write a README paragraph about why unstructured discount terms are a real-world problem. That paragraph is worth more than a fragile regex.

---

## 4. Architecture

The organising principle: **`core/` knows nothing about Vue, the DOM, or pdf.js.** Pure TypeScript in, pure TypeScript out, 100% unit-testable in Node. Everything uncertain and hard to test (rendering, file I/O, text positioning) lives outside it.

State this rule in the README and hold to it. It's the architectural argument the reviewer will actually notice.

```
src/
  core/                      ← framework-free, fully tested
    money.ts                 arithmetic + rounding, the only place Big is used
    cii/
      types.ts               domain model (§5)
      parse.ts               XML object → domain model
      profile.ts             profile detection + capability flags
      units.ts               UN/ECE unit code → German label
    checks/
      types.ts               Finding, Severity, CheckContext
      runner.ts              runs enabled rules, collects findings
      rules/
        line-total.ts
        line-sum.ts
        tax-basis.ts
        vat-per-category.ts
        grand-total.ts
        due-payable.ts
        currency-consistency.ts
        index.ts             registry

  pdf/                       ← everything pdf.js
    pdfjs.ts                 worker wiring, single import point
    loadDocument.ts
    extractAttachments.ts
    textLayer.ts             per-page text items with coordinates
    locate.ts                find a value's bounding box in the text layer

  stores/
    invoice.ts               loaded doc, parsed model, findings
    review.ts                per-position decisions, notes

  components/
    DropZone.vue
    PdfPane.vue
    PositionTable.vue
    FindingList.vue
    ProfileBanner.vue
    ExportMenu.vue

  App.vue
  main.ts

tests/
  fixtures/                  committed sample invoices (§8)
  core/                      mirrors src/core
```

---

## 5. Money and the domain model

### The rule

**Never use `number` for a monetary or quantity value that came from the XML.** Parse to `Big`, compute in `Big`, round only at defined boundaries, format to string for display.

`money.ts` is the only module that imports `big.js`. It exports:

```ts
export type Money = Big          // amount in the invoice currency
export type Quantity = Big

export function parseAmount(raw: string | undefined): Money | null
export function add(...values: Money[]): Money
export function multiply(a: Money, b: Quantity): Money
export function round2(value: Money): Money        // half-up, kaufmännisch
export function equalWithin(a: Money, b: Money, tolerance: Money): boolean
export function formatEUR(value: Money): string    // de-AT locale, "1.234,56 €"
```

Why `Big` rather than integer cents: unit prices in CII may carry **four decimal places** (BT-146), and quantities are fractional (2,5 m³). Integer cents can't represent `€0,0375 / Stück` without a second scaling concept. Document this tradeoff in a comment — it's exactly the kind of decision an interviewer will ask about.

**Rounding:** EN 16931 does not mandate a rounding method, which is precisely why tolerances exist. Use half-up, and make it visible in the code that this is a *choice*, not an assumption.

### Domain model sketch

```ts
export type ZugferdProfile =
  | 'MINIMUM' | 'BASIC_WL' | 'BASIC' | 'EN16931' | 'EXTENDED' | 'XRECHNUNG' | 'UNKNOWN'

export interface ProfileCapabilities {
  hasLineItems: boolean
  hasVatBreakdown: boolean
  hasPaymentTerms: boolean
}

export interface InvoiceLine {
  lineId: string
  sellerAssignedId?: string
  name: string
  billedQuantity: Quantity
  unitCode: string
  netUnitPrice: Money
  basisQuantity: Quantity        // defaults to 1
  vatRate: Big                   // percent
  vatCategory: string            // S, AE, Z, E, K, G, O …
  lineTotal: Money
}

export interface VatBreakdownEntry {
  category: string
  ratePercent: Big
  basisAmount: Money
  calculatedAmount: Money
}

export interface InvoiceTotals {
  lineTotal: Money
  allowanceTotal: Money | null
  chargeTotal: Money | null
  taxBasisTotal: Money
  taxTotal: Money
  grandTotal: Money
  totalPrepaid: Money | null
  duePayable: Money
}

export interface Invoice {
  profile: ZugferdProfile
  capabilities: ProfileCapabilities
  invoiceNumber: string
  issueDate: Date
  currency: string
  seller: Party
  buyer: Party
  lines: InvoiceLine[]           // empty for MINIMUM / BASIC WL
  vatBreakdown: VatBreakdownEntry[]
  totals: InvoiceTotals
  paymentTermsText?: string
}
```

---

## 6. The check suite

This is the heart of the project. Each rule is a small pure function:

```ts
export interface Finding {
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  target: { kind: 'line'; lineId: string } | { kind: 'header' } | { kind: 'vat'; category: string }
  messageDe: string              // shown to the user
  expected?: Money
  actual?: Money
  difference?: Money
}

export type Rule = (invoice: Invoice, ctx: CheckContext) => Finding[]
```

| ID | Check | Roughly EN 16931 |
|---|---|---|
| `R-LINE-01` | `BilledQuantity ÷ BasisQuantity × NetUnitPrice = LineTotal` | — |
| `R-SUM-01` | Σ line totals = header `LineTotalAmount` | BR-CO-10 |
| `R-BASIS-01` | `LineTotal − AllowanceTotal + ChargeTotal = TaxBasisTotal` | BR-CO-13 |
| `R-VAT-01` | Per category: Σ line nets with that rate = `BasisAmount` | BR-S-08 |
| `R-VAT-02` | Per category: `BasisAmount × Rate ÷ 100 = CalculatedAmount` | BR-S-09 |
| `R-VAT-03` | Σ `CalculatedAmount` = header `TaxTotalAmount` | — |
| `R-TOTAL-01` | `TaxBasisTotal + TaxTotal = GrandTotal` | BR-CO-15 |
| `R-TOTAL-02` | `GrandTotal − TotalPrepaid = DuePayable` | BR-CO-16 |
| `R-CUR-01` | All amounts share one `currencyID` | — |
| `R-PDF-01` | `GrandTotal`, as formatted, appears in the PDF text layer | — |
| `R-PDF-02` | Invoice number appears in the PDF text layer | — |

**Tolerance:** default ±0,01 €, user-adjustable in the UI. Rules receive it via `CheckContext`. Differences within tolerance produce a `warning`, not an `error` — that distinction is the product thinking.

**Profile gating:** `runner.ts` filters rules by `invoice.capabilities` before running. A MINIMUM invoice must not produce eleven false errors because it has no lines.

`R-PDF-01/02` are the genuinely interesting ones: they're the only checks that cross the PDF/XML boundary, and they're what the product feature is actually named after. A mismatch here means the supplier's visible document says something different from the data their system will book — the exact failure mode reebuild's FAQ describes.

---

## 7. UI

### Design direction

This is a dense operational tool for someone processing forty invoices before lunch, not a landing page. The aesthetic follows from that: information density, no decorative motion, no hero. Take the visual cue from the artifact itself — an Austrian construction invoice — rather than from SaaS convention.

- **Type:** a real utility grotesk for the interface, and a **tabular-figure monospace for every number in the app**. Amounts must align on the decimal comma down the column. If figures don't align, the tool is wrong before you've read it.
- **Colour:** near-neutral paper ground so the rendered PDF isn't fighting the chrome. Exactly two semantic accents — one for `error`, one for `warning` — and nothing else coloured. When ninety percent of the screen is grey, a single red row is unmissable.
- **Signature element:** the **gutter** between PDF and table. A finding draws a line from the row in the table to its location in the document. That single connective gesture is the whole product thesis — the two representations of one invoice, and where they diverge.
- Respect `prefers-reduced-motion`. Visible keyboard focus everywhere. It won't be usable on a phone; make it degrade to a readable single-column stack rather than pretending otherwise.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Rechnung 2024-0815 · Egger Bau GmbH   [EN 16931]   3 Fehler  │
├───────────────────────────────┬──────────────────────────────┤
│                               │ Positionen │ Prüfung │ XML   │
│                               ├──────────────────────────────┤
│         PDF                   │ Pos Bezeichnung  Menge  Netto│
│      (pdf.js canvas           │  1  Beton C25/30  12,5   ... │
│       + highlight overlay)    │  2  Bewehrung …    0,8   ●   │
│                               │                              │
│   ◀ Seite 1 / 3 ▶   [−][+]    │ [Alle prüfen] [Export ▾]     │
└───────────────────────────────┴──────────────────────────────┘
```

### Behaviour

- Right panel tabs: **Positionen** (table), **Prüfung** (findings), **Rohdaten** (pretty-printed XML with the current selection highlighted).
- Click a finding → PDF scrolls to the page and highlights the located text.
- Click a position → highlights its amount in the PDF and its node in the XML tab.
- Keyboard: `j`/`k` next/previous position, `a` accept, `f` flag, `?` shortcut overlay.
- Header shows profile badge and finding count. Profile banner appears when line items are unavailable.

### German UI, correct vocabulary

The whole interface is German. Use the real terms and get them right — this doubles as evidence of your German for a role that requires it: *Rechnungsnummer, Rechnungsposition, Menge, Einheit, Einzelpreis, Nettobetrag, Steuersatz, Steuerbetrag, Bruttobetrag, Skonto, Einbehalt, Freigabe, Korrekturblatt, Abweichung, Toleranz*.

Keep the code, comments, commits and README in English. Interface German, codebase English — that's how the actual product will be built.

### States to design deliberately

Not afterthoughts. These are where the "senior" reading happens.

| State | Behaviour |
|---|---|
| Empty | Drop zone + "Beispielrechnung laden" button |
| Loading | Progress for parse and render separately |
| No XML attachment | "Kein ZUGFeRD-Anhang gefunden" + offer PDF-only view |
| Unknown/missing profile | Parse defensively, banner, run only universal rules |
| MINIMUM / BASIC WL | Banner: no positions in this profile, totals-only check |
| Malformed XML | Show the parser error and the offending line, don't crash |
| Standalone XRechnung XML | Accept it, run all checks, disable the PDF pane |
| Encrypted PDF | Clear message, no stack trace |

Error copy states what happened and what to do next. No apologies, no vagueness.

---

## 8. Testing

The test suite *is* the seniority argument. Aim for near-total coverage of `core/`, essentially none of the components.

**`money.test.ts`** — the showpiece:
- rounding at the half-cent boundary in both directions
- accumulation error: 100 × €0,015 summed then rounded vs. rounded then summed
- four-decimal unit prices
- `BasisQuantity` of 100
- negative amounts (Gutschriften)
- zero quantity

**`parse.test.ts`** — one fixture per profile, plus deliberately broken files.

**`checks/*.test.ts`** — each rule gets a passing case, a failing case, and a within-tolerance case. Mixed VAT rates in a single invoice is mandatory: an invoice with 20% and 10% positions is where naive implementations fall over, and Austrian construction invoices routinely have both.

### Fixtures

Commit a small set to `tests/fixtures/`:
- Official **FeRD** ZUGFeRD sample invoices (one per profile).
- The **Mustangproject** repository's test files — valuable because it includes deliberately invalid invoices.
- Two hand-built broken files of your own: one with a line total that doesn't multiply out, one where the PDF's printed total differs from the XML.

That last one is the demo. Load it in front of an interviewer and the whole product argument lands in five seconds.

Bundle two fixtures in `public/` behind the "Beispielrechnung laden" button. Nobody evaluating your application has a ZUGFeRD invoice on their desktop, and that button is the difference between them seeing your work and closing the tab.

---

## 9. Milestones

Each is independently shippable. Stop at 4 if time runs short — 5 is polish, not substance.

**M1 — Pipeline.** Drop PDF → extract attachment → parse XML → dump the domain model as JSON to the screen. Ugly is fine. This proves the hard part works.

**M2 — Checks.** `money.ts`, the rule registry, the runner, full unit tests, CI green. Still no real UI.

**M3 — Two-pane view.** pdf.js rendering, positions table, findings list. This is a usable tool.

**M4 — The connection.** Text-layer location, click-to-highlight, the gutter. Profile handling and all the states in §7.

**M5 — Review + export.** Accept/flag, keyboard nav, `Korrekturblatt` as CSV and JSON.

---

## 10. Repo checklist for the application

The README is read before the code. Budget real time for it.

- [ ] Screenshot or 15-second GIF at the very top, showing a real mismatch being caught.
- [ ] Live demo link in the first three lines.
- [ ] **Two paragraphs on the problem**, in German — what a hybrid e-invoice is and why PDF and XML drift apart. Proves domain understanding *and* German in the same breath.
- [ ] **Architecture decisions** section: why `core/` is framework-free; why `Big` over integer cents; why tolerances exist; why no Schematron.
- [ ] **Known limitations**, stated plainly: text-layer matching is heuristic because CII carries no coordinates; Skonto parsing is best-effort; no full EN 16931 validation. Naming a limitation reads as senior. Hiding one reads as junior.
- [ ] **`CLAUDE.md` committed**, plus a README section on how you actually used AI tooling — where it accelerated you, where you overrode it, how you kept it away from the money module. reebuild names Codex and Claude Code as core to their development. Almost no applicant will address this directly, and it is free differentiation.
- [ ] CI badge, MIT licence, clean commit history that tells the story of the milestones.
- [ ] `docs/` with the domain notes from §3 — evidence you read the standard.

---

## 11. First session

```bash
npm create vue@latest rechnungsabgleich
cd rechnungsabgleich
npm install pdfjs-dist fast-xml-parser big.js
npm install -D @types/big.js tailwindcss @tailwindcss/vite
mkdir -p src/core/{cii,checks/rules} src/pdf src/stores tests/fixtures
```

Then, in order:

1. `src/pdf/pdfjs.ts` — worker wiring. Verify a PDF renders before anything else.
2. `src/pdf/extractAttachments.ts` — get the XML string out. This is the make-or-break moment; do it first.
3. `src/core/money.ts` **with its tests** — before any parsing. Write the tests first here specifically; it's the one module where TDD genuinely pays and where the resulting test file is a portfolio artifact in its own right.
4. `src/core/cii/parse.ts` — start with the EN 16931 profile only, ignore the rest.
5. First rule: `R-LINE-01`. Get one finding to appear. Then the rest are variations.
