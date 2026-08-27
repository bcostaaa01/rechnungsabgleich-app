# Subcontractor invoice intake — a `zugferd-validator` example

A small React app demonstrating one real construction-industry use case
for [`zugferd-validator`](https://www.npmjs.com/package/zugferd-validator):
a general contractor batch-validating a stack of subcontractor invoices
before they reach accounting.

**[Try it live](https://bcostaaa01.github.io/rechnungsabgleich-app/subcontractor-intake/)** —
built and deployed to the same GitHub Pages site as the package's
[docs](https://bcostaaa01.github.io/rechnungsabgleich-app/) via `npm run build:pages`
(see `package.json`), which outputs straight into `../../docs/subcontractor-intake/`.

**Deliberately a different stack than the main app.** `rechnungsabgleich`
(the project this package was extracted from) is Vue; this is React. The
point is to demonstrate that `zugferd-validator` is genuinely
framework-free — not "framework-free except secretly built for Vue."

**Deliberately separate from the rest of the repo.** This isn't an npm
workspace member — it has its own `package.json` and depends on the
package via a plain `file:` path
(`"zugferd-validator": "file:../../packages/zugferd-validator"`), the same
shape a `npm install zugferd-validator` from the real registry would take
once the package is published. It's excluded from the root `eslint`/`oxlint`
runs, since those are configured for the main (Vue) app.

## The scenario

A general contractor ("Hochbau Reiter GmbH") is running one site — Neubau
Wohnanlage Seestraße — and has five invoices in from five different
subcontractors: electrical, plumbing, drywall, concrete, and scaffolding.
Someone would normally have to open and check every one by hand before it's
cleared for payment. This app parses and validates all five at once and
shows which are clean and which need a human.

Two of the five have a deliberate problem baked into their fixture XML
(`src/fixtures/`):

- **Beton Fischer GmbH** — the line total doesn't match quantity × unit
  price (fires `R-LINE-01`).
- **Gerüstbau Meier** — the IBAN on the invoice fails its checksum (fires
  `R-IBAN-01`).

The other three are clean, including one (`Trockenbau Winter`) with mixed
20%/10% VAT rates on the same invoice, to show that isn't a special case.

## Run it

```bash
npm install
npm run dev
```

Everything runs synchronously in the browser on load — no backend, no
network request, none of the five invoices ever leaves the page. Click a
flagged row to expand its findings.

## What this is not

Not a UI you'd ship as-is — no file upload, no real intake pipeline behind
it (the five invoices are bundled fixtures, not fetched from anywhere), no
tests of its own. It's a demo of the *package*, which already carries the
real test coverage; duplicating that here would just be scope creep. See
the main [README](../../README.md) and
[`packages/zugferd-validator`](../../packages/zugferd-validator) for that.
