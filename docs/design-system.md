# Design system

Every value in this system traces back to something real: the "Signal & Ember"
palette was measured from a K-means census of 1,478 real ODDfest Flickr
photos, not picked from a swatch book. Read the comment block at the top of
`src/styles/tokens.css` before changing a color — it explains what each one
means and why it's used where it is.

## Hierarchy

```
tokens (src/styles/*.css)
  ↓
primitives (src/components/primitives/*.astro — Logo, Pill, SocialIcon)
  ↓
sections (src/components/{navigation,media,sections}/*.astro)
  ↓
pages (src/pages/*.astro)
```

New work reuses a layer before inventing at it. A new CTA button is a `<Pill
variant="...">`, not a new button component. A new headline size is a
`--text-*` role from `typography.css`, not a new `clamp()`.

## Color

- `--color-ink` / `--color-bg` — the near-black ground (rose-tinted, not print
  black — see the token file's comment).
- `--color-paper` (+ `-80`/`-60`/`-40`/`-20`/`-12`/`-06`/`-03` opacity steps) —
  the one light neutral, used only for the specific "daytime" moments the
  original design reserved it for (menu overlay, What's-on band, opening
  line band, Ways-to-participate cards).
- `--color-signal` / `--color-signal-bright` — business/ODDference accent.
- `--color-amber` / `--color-amber-bright` — creative/ODDfest accent.
- `--color-backstage`, `--color-clay`, `--color-indigo`,
  `--color-ultraviolet` — secondary surface, muted text, hero scrim tint, and
  a single rare accent used once (ODDfest page only) — see the token comment
  for why that one is a literal value, not meant to spread.

**Don't add a new color without provenance.** If a design needs a new accent,
it should trace back to the same photo-archive study the rest of the palette
came from, or be explicitly called out as a deliberate, documented departure.

**Check contrast before shipping a new opacity value.** Several of the
archive-measured opacity steps (`--color-paper-40`, and the light-band
`whats-on-desc` text) originally fell just under WCAG AA's 4.5:1 for the text
they're used on — found by actually computing contrast on the composited
(alpha-blended) color, not the token's face value, since a translucent color
reads differently depending on what's behind it. Both were nudged up just
enough to clear 4.5:1, with the reasoning left as a comment at the point of
change — same pattern the original design already used once for
`.foot-bottom`'s reading of `--color-clay`. Do the same check (composite
the actual rgba against its real background, not eyeball it) before adding a
new low-opacity text color.

## Typography

Two font families: `--font-display` (Forta — headlines) and `--font-body`
(Gabarito — everything else). Roles in `typography.css`:

`display-xl` → `display-lg` → `heading-lg` → `heading-md` → `heading-sm` →
`body-lg` → `body` → `small` → `utility` → `caption` (the `.eyebrow` label
style).

All fluid via `clamp()` — the exact values were lifted from the real site,
not re-derived, so a heading that "looks like" an existing one almost
certainly already has a role here.

## Spacing & layout

`--space-1` through `--space-32` (4px base). `.wrap` (1180px contained) and
`.wrap-wide` (1280px, wider gutters) are the two container widths the entire
site uses; `.bleed` breaks a contained element to full viewport width (used by
the news filmstrip and program grid). `section` gets a consistent
`--space-24` vertical rhythm by default.

## Motion

`src/styles/motion.css` defines the shared `.reveal` scroll-fade hook and the
marquee keyframes. Two motion mechanisms exist in this codebase and both
respect `prefers-reduced-motion` without exception:

1. **CSS `@keyframes`**, gated with `@media (prefers-reduced-motion:
no-preference)` around the animation declaration itself (not just a
   reduced-motion override after it — the animation simply never attaches
   under reduced motion).
2. **JS `requestAnimationFrame` loops** (mosaic Ken Burns, hero tilt, filmstrip
   drift) — each checks
   `window.matchMedia('(prefers-reduced-motion: reduce)')` before starting and
   either no-ops or falls back to a static equivalent. Autoplaying video gets
   the same treatment via `src/scripts/reduced-motion-video.ts`, which
   replaces the `<video>` element outright with its poster `<img>` — not just
   `.pause()`, which still leaves a decode/paint race.

Anything new that moves needs the same treatment.

## Buttons (why CloudCannon doesn't get raw CSS)

`Pill.astro` has exactly three variants — `outline`, `solid`, `ticket` — and a
`magnetic` boolean. That's the entire vocabulary of buttons this site has. An
editor picks a variant; they can't set `font-size: 63px` or
`border-radius: 13px` because those aren't real inputs CloudCannon exposes
(see `cloudcannon.config.yml`) — the design system defines the language,
CloudCannon lets editors compose inside it, not around it.

If a real new button shape is needed, it's added here — as a fourth named
variant with the same reasoning documented on it — not as an arbitrary style
override somewhere else.
