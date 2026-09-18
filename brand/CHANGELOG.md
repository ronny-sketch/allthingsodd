# Brand system changelog

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
