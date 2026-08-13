# Design spec — rechnungsabgleich

This documents the visual language shipped in the app and its component
library, `packages/design-system`. Live components: `npm run storybook -w
@rechnungsabgleich/design-system` (http://localhost:6006).

## Direction

White, modern, rounded. This is a revision of an earlier "paper ground"
direction (see `SPEC.md` §7's history) — same operational-tool discipline
(dense layout, no decorative motion, exactly two semantic accent colours),
lighter and more contemporary execution.

What's unchanged from the original direction and still holds:

- **Tabular-figure monospace for every number.** Amounts and quantities
  must align on the decimal comma down a column, or the tool reads as
  untrustworthy before anyone's checked a figure. The `.num` utility class
  (`src/assets/base.css`) applies this.
- **Exactly two semantic accents — error and warning.** Nothing else in
  the interface gets colour. A single red row must stay unmissable against
  the rest of the screen.
- **Visible keyboard focus everywhere**, and `prefers-reduced-motion` is
  respected globally.

## Colour

Defined once in `packages/design-system/src/tokens.css`, consumed by both
the running app (`src/assets/base.css` imports it) and Storybook
(`.storybook/preview.css`) — one source of truth, so they can't drift.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#ffffff` | `#18181b` | App background |
| `--color-ink` | `#18181b` | `#f4f4f5` | Primary text, primary-button fill |
| `--color-border` | `#e4e4e7` | `#3f3f46` | Dividers, outlines, neutral badge border |
| `--color-muted` | `#71717a` | `#a1a1aa` | Secondary text |
| `--color-error` | `#b91c1c` | `#f87171` | Error findings, error badges/counts |
| `--color-warning` | `#b45309` | `#fbbf24` | Warning findings |

### Dark mode

A `.dark` class on `<html>` overrides the same custom properties (see the
table above) — every existing component re-themes automatically since
colour is only ever consumed through `var(--color-*)`, never hardcoded.
State lives in `src/composables/useTheme.ts`: explicit user choice
(`localStorage`, key `rechnungsabgleich:theme`) wins over OS preference
(`prefers-color-scheme`, followed live until the user makes an explicit
choice). A tiny inline script in `index.html`'s `<head>` applies the
resolved class before any CSS/JS loads, to avoid a flash of the wrong
theme. Toggle: `ThemeToggle.vue`, in the persistent nav bar.

## Typography

- **UI text:** Inter (system sans fallback stack) — `--font-sans`.
- **Every number:** `ui-monospace`/system monospace stack with
  `font-variant-numeric: tabular-nums` — `--font-mono`, applied via the
  `.num` class. This includes amounts, quantities, rule IDs (`R-LINE-01`),
  and business-rule codes (`BR-CO-10`) — anything code-like or
  columnar gets it.

## Shape

No custom radius tokens — Tailwind's built-in scale already covers what's
needed:

| Element | Class | Value |
|---|---|---|
| Buttons | `rounded-lg` | `0.5rem` |
| Badges / pills | `rounded-full` | fully round |
| Drop zone | `rounded-lg` | `0.5rem` |

## Components

### Button (`packages/design-system/src/Button.vue`)

`variant`: `primary` \| `secondary` \| `ghost` (default `secondary`).

- **primary** — solid ink fill, paper text. The one clearly-primary action
  on screen at a time (e.g. "Datei auswählen" in the empty state).
- **secondary** — bordered, transparent fill. Default; most buttons.
- **ghost** — no border, subtle hover background. Dense/low-emphasis
  controls (PDF page nav, zoom) where visual weight should stay low.

Renders a native `<button type="button">`; `disabled` and other native
attributes pass through automatically (not declared as explicit props).

### Badge (`packages/design-system/src/Badge.vue`)

`tone`: `neutral` \| `error` \| `warning` (default `neutral`).

- **neutral** — bordered, muted text. Profile codes (`EN16931`), rule IDs
  in secondary contexts.
- **error** / **warning** — tinted background matching the severity
  colour. Finding severity tags, the header error count.

### Tooltip (`packages/design-system/src/Tooltip.vue`)

`label: string`, `placement`: `top` \| `bottom` (default `top`).

Wraps a single trigger element (usually a ghost `Button`) and shows a small
floating label on hover or keyboard focus. CSS-only (`group-hover`/
`group-focus-within`, no positioning library) — matches the "no decorative
motion" rule via the global `prefers-reduced-motion` override in
`src/assets/base.css`. The bubble is `aria-hidden`: it's a sighted/mouse
affordance only, since every icon-only trigger it wraps already carries its
own `aria-label` for screen readers.

Used on icon-only controls where the icon alone doesn't carry enough
meaning: the theme toggle, the PDF page-nav/zoom buttons, the header
shortcuts button, and the per-row accept/flag buttons in the position
table. Buttons that already pair an icon with visible text (e.g. "Neue
Rechnung laden") don't need one.

## Icons

[`@lucide/vue`](https://lucide.dev) — ISC licence, tree-shakeable
per-icon imports (`import { Sun } from '@lucide/vue'`). Chosen over
Heroicons/Tabler for fitting "utility grotesk, functional not
expressive" better than Heroicons' rounder style or Tabler's much larger
but less curated set.

Used only where an icon adds real functional clarity, not decoratively:
theme toggle (`Sun`/`Moon`), PDF page nav/zoom (`ChevronLeft`/
`ChevronRight`/`ZoomIn`/`ZoomOut` — replacing plain ◀▶−+ characters with
standard recognisable icons), the drop zone (`Upload`), "Neue Rechnung
laden" (`RotateCcw`), finding severity (`AlertCircle`/`AlertTriangle`),
and the Info nav link (`Info`). Tabs and most badges stay text-only —
not every element needs one.

## What's deliberately not themed

Tabs (`HomeView.vue`'s Positionen/Prüfung strip) are a selected/unselected
pattern, not a discrete action — they stay bespoke markup rather than
being forced into `Button`.
