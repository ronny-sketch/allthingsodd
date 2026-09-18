# Visual audit — All Things ODD, 2026-09-18

What the identity already was, before anything was changed. Everything below
was read off the live site at `origin/main` (7419ccd): 20 routes, 45 section
components, 5 stylesheets, 4 logo files, ~380 photographs, plus the
pre-existing "Signal & Ember" guideline set from 2026-08-21.

The short version: **the identity is much more systematic than it looks, and
its personality is concentrated in about a dozen decisions.** The work was to
name those decisions, delete the accidents around them, and make the whole
thing usable off the website.

---

## 1. What is distinctly ODD

Remove the logo from any page and these still say ODD:

1. **The rose-tinted near-black ground.** Not print black, not grey. Measured
   from the archive (32.7% of all pixels), so the site is the colour of the
   rooms.
2. **Forta in a display role and nothing else.** A soft, rounded, unicase face
   in one weight. It is the loudest decision in the identity and it is used
   with unusual discipline: never for a paragraph, never mixed with a second
   display face.
3. **The hairline grid.** 1px rules at 12% opacity, cells separated by gaps
   that show the ground through. It appears as the hero mosaic, the "Why ODD"
   grid, every card grid, every list, every table.
4. **Numbered structure.** 01–04 on steps, pillars, reasons, highlights. A
   catalogue habit inside a festival brand.
5. **Premise, then point.** Two-sentence headlines where the first sentence is
   set quiet and the second full. One size, two weights of ink.
6. **The strike-through nav.** Hovering a nav word crosses it out; the current
   page stays crossed out. Nobody else does this.
7. **The two-sided split.** "For creatives" in Ember, "For business" in Signal,
   mirrored columns, creative always first.
8. **Archive photography as evidence.** Real nights, real rooms, motion blur and
   stage light included. Credits by name, alphabetically; 274 of them on the
   2026 thank-you page.
9. **The pill.** One button shape, derived from the mark's own lobes, on a site
   where everything else is square-cornered.
10. **The living layer.** Steam displacement on the mark, film grain, drifting
    rails, warping headlines, a hand-drawn cursor — all small, all optional,
    all with a still fallback.
11. **The inversion.** ODDspace flips the entire palette with one class on
    `<body>`, and no component knows about it.
12. **Fluid restraint.** Five type sizes, two container widths, four rhythm
    tokens, one root-size ramp between 1024 and 1440px.

## 2. What was already systematic

- `src/styles/tokens.css` — colour with written provenance, a 4px spacing scale,
  four fluid rhythm tokens, motion tokens, one panel shape.
- `src/styles/typography.css` — five roles, each with size, line-height and
  tracking, plus documented reuse patterns and seven documented exceptions.
- `src/styles/layout.css` — two containers, `.bleed`, one section-rhythm rule,
  `.flow`, `.section-head`.
- `Pill.astro` — three variants and a magnetic flag; the entire button vocabulary.
- One-owner-per-gap spacing (rebuilt 2026-09-17), with page-level overrides
  already removed.
- Reduced-motion branches on every animation, and a reveal pattern that can
  never hide content.
- A visual-regression suite, a mobile-motion suite, an identity-integrity suite
  and a source-side identity scan.

That is an unusually strong base. It is why this work is a formalisation, not a
rebrand.

## 3. What was accidental

Found by census (`grep` over every component, then reading each site), listed
with what happened to it.

| #   | Finding                                                                                                                                                                                                | Verdict                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | **ODDspace's lockup** set its suffix 17 units closer to the mark than the ODDfest master in the approved Drive kit (0.15H vs 0.27H).                                                                   | Fixed — all lockups regenerated from one construction.                                           |
| 2   | **ODDference existed only as a PNG** (1080×167), with two hand-tuned height compensations in components to make it match the other two.                                                                | Fixed — canonical SVG; both compensations deleted.                                               |
| 3   | **Wordmarks shipped `fill="#EAE5E1"`**, an off-white that is in no palette.                                                                                                                            | Fixed — Paper `#E2DFDE`.                                                                         |
| 4   | The ODDfest master SVG **clipped the final T** by 0.38 units (a clip-path narrower than the artwork).                                                                                                  | Fixed by construction.                                                                           |
| 5   | **A third near-black**, `rgb(36 34 32)`, in the mobile menu and the "Ways to take part" cards.                                                                                                         | Fixed — the Ink ramp.                                                                            |
| 6   | **Pure `#000` and `#fff`** in scrims, video letterboxes, drop shadows and one Instagram badge.                                                                                                         | Fixed — Ink and Paper.                                                                           |
| 7   | The **outline-control border** (`35%`) was a literal in four places, each with a hand-written `.theme-light` mirror.                                                                                   | Fixed — a ramp step that flips itself; four overrides deleted.                                   |
| 8   | The **footer's lightened clay** was four hex literals plus two theme overrides.                                                                                                                        | Fixed — one token that flips.                                                                    |
| 9   | The **hover colour** was `--color-amber-bright` hardcoded in ~30 rules. On ODDspace's light ground it measured **3.2:1** — under AA.                                                                   | Fixed — `--color-heat`, which becomes Amber (4.9:1) under the light theme.                       |
| 10  | **Consent and legal buttons** put Paper text on Signal: **3.3:1**, under AA, on the banner every visitor sees.                                                                                         | Fixed — `--color-signal-deep` (4.8:1).                                                           |
| 11  | The **light theme's quiet step** was a mirror of the dark one at the same opacity: 4.1:1 on Paper, 3.9:1 on a raised card — under AA for every eyebrow on ODDspace, the menu and the newsletter panel. | Fixed — the Ink ramp is now tuned by measured contrast (62% / 70%), not mirrored.                |
| 12  | **Five one-off radii** (16, 8, 6, 3px) beside the documented 10 and 999.                                                                                                                               | Fixed — pill / panel / square, with nested corners derived.                                      |
| 13  | Two "ask" boxes were **rounded** where every other content block is square.                                                                                                                            | Fixed — square.                                                                                  |
| 14  | `--color-ticket-blue` was **named after the page that introduced it**.                                                                                                                                 | Fixed — `--color-signal-deep`, named for its role.                                               |
| 15  | The **August 2026 guideline set** documented a ten-role type scale, 0.32em eyebrow tracking, a 6rem section rhythm and a 4px footer rule — all superseded by the site between 2026-09-13 and 09-17.    | Superseded — this system is generated from the live tokens, and a drift check keeps it that way. |
| 16  | `--radius-pill` did not exist; `999px` was a literal in 22 places.                                                                                                                                     | Fixed — token.                                                                                   |

## 4. Deliberate irregularities that were kept

Not every unusual thing is a defect. These were examined and left alone, or
formalised as-is:

- **The strike-through nav** (2.5px, the only non-hairline rule on the site).
- **The one Ember keyline** on Home's "Work with ODD" band — 2px, the only
  accent edge in the system. Now explained as "the band is a link".
- **Ultraviolet**, used exactly once as a wash on the ODDfest hero. The rarest
  colour in the archive, kept rare.
- **The steam filter, the grain, the hand-drawn cursor, the warping headlines
  and the drifting rails.** They are the identity's personality; they are
  cheap, optional and reduced-motion-safe.
- **ODDspace's full inversion**, rather than a "light section" treatment.
- **Component-level breakpoints** (700, 760, 860, 900px …) where a component's
  own content breaks. They are content decisions, not layout ones.
- **Forta at the Body size** for navigation, session titles and names — a reuse
  that keeps brand character without adding a size.
- **Centred section heads** on a site that otherwise reads left-aligned.

## 5. Open, not fixed

- **Inverse surfaces** (the mobile menu, the "Ways to take part" cards) still
  hand-roll their opacity steps, because the token ramps describe figure-on-ground
  and these surfaces invert _locally_. A `.inverse` scope would fold them into
  the theme system; it needs its own pass and its own screenshots.
- **The ticket-flow buttons** on `/tickets*` are raw `class="pill"` markup that
  `Pill.astro`'s scoped styles never reach, so they render in the browser's
  default font. Pre-existing, tracked in `docs/design-system.md`.
- **Heat on a raised surface** (Ember Bright on Backstage) measures 3.75:1, so
  hovers on a raised card take the heat in the underline or border and the text
  goes to full figure. Two components were corrected this way (`PricingGrid`,
  Home's Work-with-ODD band); check any new one.
- **Amber on the light raised surface** measures 4.16:1 — fine for the large
  text and keylines it is used for, short of AA for small text. Do not put
  small hover text on a raised card on ODDspace.
- **oddfest.co and oddspace.co** still serve their own older sites with their
  own visual identities. That is a DNS/redirect job, not a design one — see
  `docs/IDENTITY_LAUNCH_MATRIX_2026-09-04.md`.
- **Photography of ODDference and Work with ODD** is thinner than ODDfest's.
  The archive covers festivals well and business rooms poorly; shoot the next
  conference accordingly.

## 6. How the decisions were made

Where the site disagreed with itself, the tie went to whichever version was
(a) in the approved master artwork, (b) measurably more accessible, or (c)
already the majority pattern. Three examples:

- **Lockup geometry:** the ODDfest file in the shared logo kit is the
  designer's master and matches the ODDference raster; ODDspace was the
  outlier, so the master won and ODDspace moved.
- **Hover colour:** Ember-as-hover was already the majority (30 rules against
  none), so it became a role — but the light theme's reading had to change to
  pass AA.
- **Corner radius:** square is overwhelmingly the majority for content and the
  pill is unambiguous for actions, so the five one-offs resolved to the two
  ends plus the panel.
