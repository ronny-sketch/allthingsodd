# Brand system changelog

## 1.2 — 2026-09-21 · ODD on Instagram, second pass

`brand/social/` is now one set in one language: fifty-nine posts, five stories,
two carousels, two reel covers, six highlight covers, three planned editions of
the profile. The first-pass twenty were rebuilt in the signature or retired.

- **Everything is numbered 01–59 by family** (People, Evidence, Programme,
  Voice, Invitation, Place). The first pass mapped to the new numbers:
  01→12 · 02→11 · 03→34 · 04→26 · 05→17 · 06→47 · 07→57 · 08→16 · 09→09 · 10→19
  · 11→58 · 12→36 · 13→35 · 14→51 · 15→43 · 16→13 · 17→59 · 18→retired (the
  lockup lives in the highlight covers) · 19→07 · 20→45 · 21→13 · 22→02 · 23→37
  · 24→38 · 25→01 · 26→16 · 27→17 · 28→03 · 29→04 · 30→50 · 31→18 · 32→06 ·
  33→25 · 34→42 · 35→46 · 36→05 · 37→51.
- **New devices:** through one lobe (the mark bigger than the tile), three
  nights stacked, the diptych, the quiet tile, the greyscale archive series,
  the portrait series, the loud-figure series (274 · 150+ · 1,000+), the
  highlights series (eight events, one layout), the rooms series on Paper, the
  weekly as four cells, the credits carousel (every name, three frames).
- **Every post has alt text**, and the build warns when a caption's first
  sentence would be truncated by Instagram (125 characters).
- **Three editions** in `src/grid.mjs`, rendered as `grid-1..3.jpg`; `thumbs.jpg`
  shows every post at 120px — the legibility check: one thing per tile must
  read at that size.
- Renderer simplified: `posts.mjs` (posts, layout, helpers) + `extras.mjs`
  (stories, carousels, reels, covers); the `formats/` modules are gone. JPEG
  quality 90.
- The name wall reads the credits from `oddfest-2026.json` (lists and
  subgroups); a hand-typed slice is gone.

Still placeholders: photo credits read "Photo: ODDfest" until the
photographer's name is added; "Doors at 19." and "@handle" are template text.

## 1.1 — 2026-09-20 · ODD on Instagram

`brand/social/` grew from twenty formats to a signature. What changed and why:

- **The square is the photograph.** Instagram's profile grid shows only the
  centre square of a 4:5 post, so photographs now fill exactly 135–1215px and
  every word lives in the two Ink bands above and below. Scrims are gone from
  the social system: type never sits on a photograph.
- **Type as image** is a documented exception to the five sizes: one word or one
  figure may exceed Hero when it is the image (cropped by the tile), never a
  sentence. `post-21`, `reel-1`.
- **The mark as a window** (`post-22`, `story-5`) and **the mark, breathing**
  (`post-34`) reuse the site's own path and steam filter; neither is redrawn.
- **The strike-through** left the nav and became a way of saying what ODD is
  not (`post-23`, `post-24`, `story-4`). It is the only non-hairline rule.
- **The footer bar** (mark + URL on every tile) was retired. It made every post
  a template; the mark now appears where it means something.
- **Three-tile panorama** and **nine-frame sheet** formats, a planned edition
  of twelve (`src/grid.mjs`) rendered as the profile (`grid.jpg`, `phone.jpg`),
  two reel covers, and ideas 55–104 in the bank.
- Renderer: `formats/*.mjs` modules, `--only=` partial builds, `wide: 3`
  panoramas clipped into a/b/c.

Still placeholders: every photo credit reads "Photo: ODDfest" until the
photographer's name is added from the photobank. The panorama source is 1800px
wide (1.8× on a 3240px band); a larger export from the photographer is better.

## 1.0 — 2026-09-18 · the visual system, formalised

The website's design language became a brand system: a designed brand book at
`/brand-book/`, one canonical asset set, machine-readable tokens, an editable
deck system, and the guides that keep all of it honest. Full findings:
`brand/AUDIT.md`.

Nothing here is a redesign. Every change below either removes an accident,
fixes a measured accessibility failure, or gives an existing decision a name.

### Colour

| Change                                                                                                   | Why                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Added `--color-heat`, and replaced ~30 hardcoded `--color-amber-bright` hover rules with it.             | Ember-as-hover was already the rule everywhere; it just had no name. Under ODDspace's light theme it also measured **3.2:1** — the token now becomes Amber there (**4.9:1**).                                                                                                        |
| Added `--color-paper-35` / `--color-ink-35`.                                                             | The outline-control border was a literal in four components, each with a hand-written light-theme mirror. Four overrides deleted.                                                                                                                                                    |
| Added `--color-clay-read` (flips light/dark).                                                            | The footer's contrast-corrected clay was six hex literals.                                                                                                                                                                                                                           |
| Renamed `--color-ticket-blue` → `--color-signal-deep`.                                                   | Named for its role — Signal deep enough to carry Paper text (4.8:1) — not for the page that introduced it.                                                                                                                                                                           |
| Consent banner and legal "Cookie settings" buttons moved from `--color-signal` to `--color-signal-deep`. | Paper on Signal is **3.3:1**, under AA for the Small size every button uses. Now 4.8:1.                                                                                                                                                                                              |
| Light ramp retuned: `--color-ink-60` 60% → 70%, `--color-ink-40` 55% → 62%.                              | The mirrored opacity measured **4.1:1** on Paper and 3.9:1 on a raised card — under AA for every eyebrow on ODDspace, in the mobile menu and in the newsletter panel. Ink on Paper needs more opacity than Paper on Ink for the same ratio; both ramps are now tuned by measurement. |
| `rgb(36 34 32 / …)` → the Ink ramp; `#000`/`rgb(0 0 0 …)` → Ink; `#fff` → Paper.                         | A third near-black and two absolutes had crept in. Scrims and shadows are Ink, not print black — the palette's whole premise.                                                                                                                                                        |

### Shape

| Change                                                                                                                             | Why                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Added `--radius-pill` and replaced 22 `999px` literals.                                                                            | The pill comes from the mark; it deserves a token.                                                                                                               |
| Consent banner 16px, ticket sheet 16px, legal table 8px, skip link 6px, media copy button 3px → `--radius-panel`, square, or pill. | Five one-off radii beside the two documented ones. The system is now: square content, 10px floating panels, pill actions — nested corners derived with `calc()`. |
| ODDfest's partner box and ODDspace's venue ask box: radius removed.                                                                | Every other content block on the site is square.                                                                                                                 |
| Consent banner's shadow literal → `--shadow-panel`.                                                                                | One elevation for every floating surface.                                                                                                                        |

### Logos

| Change                                                                                                                          | Why                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every lockup is now generated by `brand/logos/build.py` from the mark path and Forta.                                           | The construction (cap height 0.484H, baseline 0.7398H, gap 0.2709H, tracking 0.09em) was reverse-measured from the ODDfest master in the approved kit, and reproduces it to within 0.05 units. A new product now costs one line. |
| ODDspace's lockup moved its suffix out by 0.12 × the mark height.                                                               | It sat closer to the mark than the master. Now identical construction.                                                                                                                                                           |
| ODDference is an SVG; the PNG is deleted. Its two hand-tuned size compensations (Aftermovie 47px, hero ratio comment) are gone. | A raster mark forced per-component fudges. Equal height now means equal mark.                                                                                                                                                    |
| Artwork fill `#EAE5E1` → Paper `#E2DFDE`; the ODDfest master's clipped T is fixed.                                              | An off-palette off-white, and a clip-path narrower than the artwork.                                                                                                                                                             |
| New: ODDstudio, ODDagency and ODDcity lockups, ink/paper SVG + PNG for everything, and the app icon.                            | Proof the construction scales, and one canonical file per thing.                                                                                                                                                                 |

### Documentation, tokens and tooling

- **`/brand-book/`** — a 20-chapter designed brand book, built out of the system
  it documents, with live specimens rather than screenshots. `noindex`, not in
  the nav or the sitemap.
- **`brand/tokens/brand-tokens.json`** — every colour, role, contrast pair, type
  role, space, radius, motion value, image ratio and logo number, for tools that
  are not the website.
- **`scripts/check-brand-tokens.mjs`** (`npm run check:brand`, in `npm run
quality` and CI) — fails the build when the JSON drifts from `src/styles/`.
- **`brand/BRAND-GUIDE.md`** — the instruction manual for a person or an agent:
  new page, new section, campaign, new sub-brand, deck, print, and what to do
  when the system seems to need something new.
- **`brand/AUDIT.md`**, this changelog, and `brand/README.md`.
- **`brand/fonts/`** — Forta and three static Gabarito cuts, with both OFL texts,
  so decks and print have real files to install.
- **`brand/deck/`** — the 16:9 template (21 archetypes) and an example deck,
  generated by PptxGenJS from these tokens, with previews. Isolated tooling: the
  website never imports it.

### Tested against an agent, then fixed

`BRAND-GUIDE.md` and `brand-tokens.json` were handed to an agent with **no
access to this repository** and asked to build a page for a product that does
not exist yet (ODDcity). It came out recognisably ODD — the lockup, a
premise-then-point statement, an eyebrow over a centred head with its hairline,
empty ruled cells where photographs would go, and copy that says out loud that
nothing is announced. What it had to guess became these:

- **`brand/tokens/odd.css`** — the website's CSS assembled into one file
  (tokens, the five roles, `.wrap`, `.flow`, `.section-head`, `.eyebrow`, the
  section rhythm, the base rules, the grain, the Pill, `.theme-light`).
  Generated by `brand/tokens/build-css.mjs` from `src/styles/`, and
  `npm run check:brand` fails when it is stale. Half the guide used to be
  pointers into files an outsider cannot read.
- `brand-tokens.json` now carries the composed `font` shorthand and the size /
  tracking variable names per role, and the **real opacity** of every ramp step
  (the step names are historical: "40" is 55% on Ink and 62% on Paper).
- **§3.5 Working outside this repository** — the page skeleton, the hero
  anatomy (which element is the `h1`, lockup size, meta line, scrim), the grid
  convention behind the breakpoints, the 44px touch target, and the one that
  was a genuine contradiction: "no boxes" versus "card borders" — hairlines are
  the grid, a border around one lone card is not.
- **§6.5 When the thing is not announced yet** — what the ask is when there is
  no channel (`hello@oddfest.co`, never a dead button, never "Coming soon"),
  and what goes where a photograph belongs but none exists.
- **§10.5 Voice, in ten real lines** — the guide had voice principles and not
  one example, so an unfamiliar writer drifted to generic fastest. Ten real
  site lines, plus the banned constructions.

### Superseded

The August 2026 "Signal & Ember" guideline set (`~/Projects/AI/apps/odd-brand-guidelines/`)
documented a ten-role type scale, 0.32em eyebrow tracking, a 6rem section rhythm
and a 4px footer rule. All four were superseded by the site itself between
2026-09-13 and 2026-09-17. This system replaces that set and is generated from
the live tokens so the same drift cannot happen twice.

### Deliberately not changed

- The strike-through nav, the Ember keyline, the single Ultraviolet wash, the
  steam filter, the grain, the custom cursor, the warping headlines, the
  drifting rails, ODDspace's full inversion, the centred section heads.
- The five-size ladder, both container widths, the spacing system: they were
  already right.
- Component-level breakpoints, which are content decisions.
- The open items in `brand/AUDIT.md` §5, which need their own passes.
