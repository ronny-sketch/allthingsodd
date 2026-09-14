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
description text in the since-removed `WhatsOn` component) originally fell
just under WCAG AA's 4.5:1 for the text
they're used on — found by actually computing contrast on the composited
(alpha-blended) color, not the token's face value, since a translucent color
reads differently depending on what's behind it. Both were nudged up just
enough to clear 4.5:1, with the reasoning left as a comment at the point of
change — same pattern the original design already used once for
`.foot-bottom`'s reading of `--color-clay`. Do the same check (composite
the actual rgba against its real background, not eyeball it) before adding a
new low-opacity text color.

## Typography

Two faces: `--font-display` (Forta — the expressive, display face) and
`--font-body` (Gabarito — the functional, reading face). Three kinds of text —
display, body, UI — set on **one five-step ladder** for the entire site,
defined in `src/styles/typography.css` (2026-09-13; it replaced a ten-role
scale that components had drifted away from with dozens of local sizes).

| Role    | Shorthand        | Face         | Size                                            | Line-height | Tracking   | For                                                                |
| ------- | ---------------- | ------------ | ----------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------ |
| Hero    | `--text-hero`    | Forta 400    | `clamp(3.25rem, 6vw, 5.25rem)`                  | `0.98`      | `-0.02em`  | Rare, genuinely dominant page statements                           |
| Display | `--text-display` | Forta 400    | `clamp(2.125rem, 4vw, 3.25rem)`                 | `1.04`      | `-0.015em` | Page titles, major editorial statements, headline figures          |
| Heading | `--text-heading` | Forta 400    | `clamp(1.5rem, 2.4vw, 2rem)`                    | `1.12`      | `-0.01em`  | Section, card, column, list, FAQ and pricing titles                |
| Body    | `--text-body`    | Gabarito 400 | `clamp(1rem, calc(0.96rem + 0.2vw), 1.0625rem)` | `1.55`      | normal     | Every sentence a visitor is meant to read, and every form field    |
| Small   | `--text-small`   | Gabarito     | `0.875rem`                                      | `1.4`       | normal     | Eyebrows, metadata, dates, labels, buttons, helper and status text |

The size, line-height and tracking of each step also exist on their own
(`--font-size-*`, `--line-height-*`, `--tracking-*`), plus two tracking values
for uppercase Small: `--tracking-eyebrow` (0.16em) and `--tracking-caps`
(0.05em).

### Rules

- **These are the only five font sizes.** There is no body-large, caption,
  utility or heading-small. Hierarchy inside a role comes from weight, colour,
  measure, position, spacing and capitalisation — never from a near-identical
  sixth size. If larger type exposes a cramped component, fix its spacing or
  layout; don't shrink that one component's text.
- **Use the shorthand with its tracking:**

  ```css
  font: var(--text-heading);
  letter-spacing: var(--tracking-heading);
  ```

  `font` resets weight to 400, so emphasis goes after it (`font-weight: 600`).

- **Reading copy is Body — including inside cards.** Small is for supporting
  information only. Nothing on the site is set below 14px.
- **Only the display steps are fluid.** Body moves one pixel across the whole
  range (16px → 17px) and Small doesn't move. Don't add breakpoint-specific
  sizes; the tokens already work at every width.
- **Body's 1rem floor is the iOS no-zoom guarantee.** Every input, select and
  textarea uses Body, so no component needs its own `font-size: 16px` mobile
  override — and a smaller desktop override on a field is a bug (one in the
  newsletter popup silently re-enabled zoom-on-focus before this pass).
- **Heading level is semantics, the role is design.** Pick `h2`/`h3` by
  document structure, then pick the role by what the text is.
- **Wrapping:** `h1`–`h4` get `text-wrap: balance` and `p`/`li`/`dd` get
  `text-wrap: pretty` globally, from `typography.css`. Balance never changes a
  heading's line count, which WarpingText's measured replacement relies on.
- **Measure:** running prose holds to `--measure-prose` (52ch, roughly 65
  characters of Body a line); short centred editorial intros can sit
  narrower. Paragraph spacing is margin or gap, never extra line-height.

### Reuse patterns that are not new sizes

- **Forta at the Small size** for the footer nav (one step quieter than the
  header, and it keeps the footer's top row on one line from about 1150px),
  ODDference's reason numbers and the cookie-table header row.
- **Forta at the Body size** for compact, brand-voiced UI: primary nav links,
  the SubpageRail/SubpageTicker word beats, Media's resource-row titles,
  price figures in the ODDspace and ODDstudio rate lists, the order total and
  stepper count on `/tickets`, the ticket label on `/tickets/confirmation`,
  consent category names, and legal subsection (`h3`) labels. The nav, rail
  and ticker words keep their own small literal tracking (0.01–0.02em).
  `font-family: var(--font-display); font-size: var(--font-size-body);`
- **Gabarito 600 at the Body size** for run-in titles that sit directly on
  their own paragraph: Timeline rows, About's "Ways of working", Work with
  ODD's "When ODD is useful".

Emphasis without size: `SectionIntro`'s `lead` prop (Home's "Why ODD",
ODDference's premise) keeps Body and sets it in `--color-paper-80` on a
wider measure; ODDstudio's "not included" paragraph uses full `--color-paper`.

### Component mapping

| Role    | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero    | `HeroCentered` title when it carries a photograph (Work with ODD, ODDagency), above 640px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Display | `PageIntro`, `SplitHero`, plain `HeroCentered` (About), `SpaceHero` and `FullbleedVideoHero frame="space"` h1s; `SectionIntro` headlines; `ProofGrid` figures; mobile menu links; 404 and ticketing page titles                                                                                                                                                                                                                                                                                                                                                                                   |
| Heading | Home hero line under the logo; ODDfest's default-frame hero line; `.section-head h2` and every closing-ask h2; `Converge` column titles; `ProgramGrid`, `FeatureGrid`, `CaseGrid`, `OddfestExamples`, `SpaceShowcase`, `PersonGrid` and `ParticipateBand` titles; CaseGrid figures, Timeline years and PathwayList numbers; the Work-with-ODD band; pricing tier names and prices; FAQ questions; programme, pathway, audience and archive-year titles; the filmstrip heading and captions; the LogoStrip label; legal section h2s; the Contact aside and Media section h2s; the newsletter popup |
| Body    | All explanatory paragraphs, card descriptions, intros, FAQ answers, benefit lists, legal prose, notices, form fields, dropdown menu links                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Small   | `.eyebrow` and every label/meta/category/date line, `Pill` and the site's other button styles, form labels, status and helper notes, footer contact and legal line, stat labels, rate-list notes, cookie table                                                                                                                                                                                                                                                                                                                                                                                    |

Eyebrows are Small at 600, uppercase, `--tracking-eyebrow` (the `.eyebrow`
class). Buttons and CTA labels are Small at 600, uppercase, `--tracking-caps`.

### Documented exceptions

1. **Mobile menu on short viewports.** Links are Display, and step down to
   Heading below 560px of viewport height so seven links and both bars fit.
   The step is to the next role, not to a height-scaled size.
2. **`FullbleedVideoHero frame="space"` on short viewports.** The h1 steps from
   Display to Heading below 620px of height, for the same reason.
3. **`HeroCentered`** takes Hero only with a photograph and only above 640px:
   on phones Hero's 3.25rem floor is wider than a column for one long word,
   so the title steps to Display. Its plain variant is laid out like
   `PageIntro` and takes Display at every width.
4. **Icon glyphs.** The Instagram tile badge and the ticket stepper's +/− use
   `line-height: 1` so the glyph centres in its box; the ticket sheet's ×
   close glyph uses the Heading size. None of them is text.
5. **Cookie table storage keys** on `/privacy` use the platform monospace at
   the Small size — the only deliberate third family on the site.

Known gap, pre-existing and tracked separately: the ticket-flow buttons on
`/tickets`, `/tickets/checkout` and `/tickets/confirmation` are written as raw
`class="pill"` markup, which Pill.astro's scoped styles never reach, so they
still render in the browser's default button font and size.

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
   the same treatment via `src/scripts/autoplay-video.ts`, which keeps the
   poster `<img>` as a permanent sibling layer and only fades the `<video>`
   in over it once real playback is confirmed — so reduced motion never
   starts (or even downloads) the video, and a refused autoplay anywhere
   leaves a photograph rather than an empty frame.

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
