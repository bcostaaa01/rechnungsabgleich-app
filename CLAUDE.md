# CLAUDE.md

Guidance for Claude Code (and any other AI tooling) working in this repository.
Full product/domain spec lives in `SPEC.md` — read that first for anything
non-obvious. This file is the operating manual for *how* to work in the repo,
not what the product does.

## What this is

`rechnungsabgleich` — a browser-only reviewer for German/European hybrid
e-invoices (ZUGFeRD / Factur-X). Loads a PDF client-side, extracts the
embedded CII XML, cross-checks arithmetic and PDF-vs-XML consistency.
Portfolio piece targeting reebuild GmbH (Wien).

**No backend. No database. No auth.** Everything runs in the browser. Static
deploy only (Vercel/Netlify). If a task seems to need a server, it's out of
scope — check `SPEC.md` §1 before adding one. (The `packages/design-system`
Storybook instance is a dev-time tool the running app never talks to at
runtime — it doesn't count as a backend.) Two narrow, documented exceptions
to "no file persistence" — review decisions in `localStorage`, and now the
invoice PDFs themselves in `IndexedDB` — see the Tech stack section below.
Nothing leaves the browser; this is still 100% client-side.

## Tech stack

Vue 3 (`<script setup>`, Composition API) · TypeScript `strict: true` · Vite
· Vue Router · Pinia (two stores max) · pdfjs-dist · fast-xml-parser ·
big.js · Tailwind CSS v4 · Vitest · ESLint + Prettier · GitHub Actions CI.

Note: `SPEC.md` §2 says "Router: No" — the actual project deviates and
includes Vue Router (decided during setup, not in the original spec). Keep
this in mind when `SPEC.md` and reality disagree on this one point.

Note: `SPEC.md` §1 lists "no file persistence" and "no multi-invoice
management" as explicitly out of scope. The project deviates narrowly, for
review decisions only: accept/flag/note per position is cached in
`localStorage`, keyed by a hash of the invoice's embedded XML
(`src/stores/reviewPersistence.ts`), so reloading the *same* invoice — this
session or a later one — restores prior decisions. This adds no backend, no
database, no invoice list/dashboard, and no general file persistence; it's
a client-side convenience scoped to one store's state. Capped at the 20
most recently updated invoices (oldest evicted first) and documented in
README's "Known limitations", including the remaining non-cryptographic
hash caveat.

Note: on top of the above, the project *also* caches the invoice PDF itself
(not just its review metadata) so a previously-worked-on invoice can be
reopened into the live preview, not just summarised. This is the bigger of
the two deviations — it's the actual document, which is exactly what "no
file persistence" was written to rule out — so it's kept deliberately
separate: `src/stores/invoiceFilePersistence.ts` is a raw `IndexedDB`
wrapper (localStorage can't hold `Blob`/`File` data at any useful size),
same `hashXml` key as the decisions cache but its own store, its own
lifecycle, its own delete action. Surfaced via a persistent left-edge rail
(`App.vue`) that opens `SavedInvoicesSidebar.vue` — deliberately placed
adjacent to where the panel itself opens, not tucked into the top-right
utility row, since a trigger and the thing it triggers should be next to
each other. Same cap-and-evict treatment as the decisions cache (20 most
recently updated files, oldest evicted first), documented in README's
"Known limitations" alongside its other, permanent scope boundaries (no
export/import, delete-independence from the decisions cache).

Do not introduce a different framework, UI kit, or state library without
asking — the stack is otherwise deliberately narrow (see `SPEC.md` §2).

**Repo layout is an npm workspaces monorepo**, not a single package: root
`package.json` has a `workspaces` field; `packages/design-system` is a
Storybook-based component library (`Button`, `Badge`, shared Tailwind
tokens) the main app depends on via
`@rechnungsabgleich/design-system`. Design tokens live in
`packages/design-system/src/tokens.css` — edit them there, not in the
main app's `src/assets/base.css` (which just imports them). See
`DESIGN.md` at the repo root for the visual language itself.

## Non-negotiable architecture rule

`src/core/` knows nothing about Vue, the DOM, or pdf.js. Pure TypeScript in,
pure TypeScript out, fully unit-testable in Node. Everything uncertain or
hard to test (rendering, file I/O, text-layer positioning) lives outside it,
in `src/pdf/`, `src/stores/`, or `src/components/`.

Before adding an import to anything under `src/core/`, check it doesn't pull
in `vue`, `pdfjs-dist`, or any browser-only API.

## Non-negotiable money rule

Never use `number` for a monetary or quantity value that came from the XML.
Parse to `Big`, compute in `Big`, round only at defined boundaries, format to
string for display. `src/core/money.ts` is the **only** module that imports
`big.js`. See `SPEC.md` §5 for why (four-decimal unit prices, fractional
quantities — integer cents don't work here).

## Language convention

- **UI strings**: German, correct domain vocabulary (Rechnungsnummer,
  Nettobetrag, Steuersatz, Skonto, Korrekturblatt, etc. — full list in
  `SPEC.md` §7).
- **Code, comments, commit messages, this file**: English.

## Commits

Small, one milestone-step or one logical change per commit. Commit message
style: imperative mood, concise, explains *why* when the reason isn't
obvious from the diff (e.g. why `Big` over cents, why a rule is gated by
profile). Don't bundle scaffolding + first feature in one commit.

## Testing

`core/` is the seniority argument — aim for near-total coverage there,
essentially none of the components. `money.ts` gets tests written *before*
implementation (the one module where TDD is worth it). See `SPEC.md` §8 for
the required fixture list and edge cases (rounding boundaries, 4-decimal
prices, `BasisQuantity`, negative amounts, mixed VAT rates).

## Commands

Filled in once the project is bootstrapped via `npm create vue@latest`
(first commit). Expect the create-vue defaults:

```bash
npm run dev         # local dev server
npm run build        # typecheck + production build
npm run test:unit    # Vitest
npm run lint          # ESLint
npm run format         # Prettier
```

## Working notes

- Profile detection (`MINIMUM` / `BASIC WL` have no line items) gates which
  checks run — never assume `invoice.lines` is non-empty.
- `pdfjs-dist` is imported in exactly one place: `src/pdf/pdfjs.ts`. Pin the
  exact version (no caret) — the worker build must match the library build.
- Milestones (M1–M5) are defined in `SPEC.md` §9 and are the unit of
  planning — each one is independently shippable.
