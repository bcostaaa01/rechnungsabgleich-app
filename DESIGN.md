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

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#ffffff` | App background |
| `--color-ink` | `#18181b` | Primary text, primary-button fill |
| `--color-border` | `#e4e4e7` | Dividers, outlines, neutral badge border |
| `--color-muted` | `#71717a` | Secondary text |
| `--color-error` | `#b91c1c` | Error findings, error badges/counts |
| `--color-warning` | `#b45309` | Warning findings |

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

## What's deliberately not themed

Tabs (`HomeView.vue`'s Positionen/Prüfung strip) are a selected/unselected
pattern, not a discrete action — they stay bespoke markup rather than
being forced into `Button`.
