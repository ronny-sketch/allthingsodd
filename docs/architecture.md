# Architecture

## The stack

```
GitHub  →  Astro  →  (deploy target)
   ↑
CloudCannon (edits content through the same git history)
```

- **GitHub** is the canonical repository. Every change — code or content —
  is a commit.
- **Astro** builds the site to static HTML/CSS/JS (`astro build` → `dist/`).
  No server runtime, no database, no API routes — same deployment shape as
  the original single-file site, just generated instead of hand-written.
- **CloudCannon** is a visual editing layer on top of the git repo. An editor's
  save becomes a git commit to `src/content/**/*.json`, which triggers a
  rebuild through whatever CI/deploy hook is wired up (see
  [deployment.md](deployment.md)).

## Where things live

```
src/
  content.config.ts       Zod schemas for every content collection
  content/
    site/global.json      Nav, footer, social, contact — shared everywhere
    pages/*.json           5 fixed pages: home, oddfest, oddference, oddagency, about
  styles/
    tokens.css             Color, spacing, motion tokens (with provenance)
    typography.css         Fluid type-scale roles (display-xl → caption)
    layout.css              Container widths, section rhythm
    motion.css               Reveal-on-scroll + marquee keyframes
  components/
    primitives/             Logo, Pill, SocialIcon — dumb, reusable
    navigation/              Nav, Footer, MobileMenu — read from site/global.json
    media/                    Cursor, SteamFilters — page-independent chrome
    sections/                 Hero, Converge, SubpageRail, AboutParallax, … —
                               page-specific, each reads its own content props
  scripts/                  Vanilla-TS client behavior, one file per interaction
  layouts/Layout.astro      <html> shell: fonts, nav, footer, cursor, sitewide scripts
  pages/*.astro             Route files — thin: fetch content, pass to sections
```

## Why not a page composer

CloudCannon (and most modern CMSs) can support a "stack of interchangeable
sections" model — an editor drags a Hero, then a Quote, then a Gallery, in any
order, onto any page. That's the right call for a blog or a marketing site
with many similar landing pages.

It's the wrong call here. ODD has **five pages, and every one has a
genuinely different, bespoke layout**: the home page's photo mosaic hero and
filmstrip don't exist anywhere else; the three subpages share a rail+hero+grid
shape but each hero is a different variant (video split, image split,
full-bleed video); the about page is a scroll-pinned horizontal parallax
unlike anything else on the site. Forcing these into a generic "sections"
abstraction would mean either (a) building generic components that can't
actually express this site's real layouts, or (b) building one generic
section type per page anyway, which is a composer in name only.

Instead, each page has a **fixed schema** (see `src/content.config.ts`'s
discriminated union on `template`) with named, real fields — and the
_repeating_ content within a page (news items, program cards, feature grids,
participate CTAs, about-page panels) _is_ an editable array with an "add new"
structure in CloudCannon. That's real editing power scoped to where the site
actually repeats, not a composer pretending everything is generic.

## Hero variants

Subpages share `SubpageFrame.astro` (the fixed side rails + center column) but
use one of three hero components depending on their content:

- **ODDference** — `SplitHero` in `split-video` mode: video on one side, text
  on the other.
- **ODDagency** — `SplitHero` in `split-image` mode: same layout, static
  image instead of video (ODDagency's source page never had its own video).
- **ODDfest** — `FullbleedVideoHero`: a completely different shape, full-bleed
  video behind the page title, matching the original site's own layout choice.

`SplitHero` takes a `variant` prop rather than being two separate components
because the split-video/split-image cases share ~90% of their markup and
CSS — only the media element differs. `FullbleedVideoHero` is separate because
its structure genuinely doesn't overlap.

## Visual regression

`tests/visual/pages.spec.ts` screenshots all 5 routes at 5 viewports
(mobile/tablet/laptop/desktop/wide) against committed baselines in
`tests/visual/pages.spec.ts-snapshots/`.

Two things make this suite deterministic on a highly-animated site:

1. **`reducedMotion: 'reduce'`** in `playwright.config.ts` — this project's own
   JS respects `prefers-reduced-motion` everywhere (see CLAUDE.md's
   Design-system rules), so setting it in the browser context makes every rAF
   loop (mosaic Ken Burns, hero tilt, filmstrip drift, marquees) skip itself
   entirely. This isn't a test-only hack — it's the same code path a real
   visitor with reduced-motion preferences gets.
2. **Masked photographic regions** — the hero mosaic, news filmstrip, program
   cards, hero video/poster, and about-page photos are masked out of the pixel
   comparison (`mask:` option). Large full-page screenshots of photographic
   content have inherent sub-pixel compositing noise between runs on this
   scale of canvas; that's noise in the _photo_, not a layout regression. The
   suite still catches real regressions — spacing, typography, structural
   layout, everything _around_ the photos — which is what it's actually for.

To intentionally update a baseline after a real design change:

```bash
npm run build && npm run preview &
npm run test:update-snapshots
```

Review the diffs before committing — a snapshot update should have a reason
you can point to.

## Old site relationship

`../ODD NEW WEBPAGE/index.html` (the single-file build, still live at
odd-field-guide.surge.sh at the time of writing) is **not modified by this
project** and its own `npx surge .` deploy path is untouched. This repo is a
from-scratch parallel build; cutting the live domain over to it is a
deliberate, separate, explicit-sign-off step — see
[deployment.md](deployment.md).
