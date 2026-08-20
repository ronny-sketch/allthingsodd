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
    site/global.json      Nav, footer, social, contact, partner/press logos — shared everywhere
    pages/*.json           9 fixed pages: home, oddfest, oddference, oddagency,
                            work-with-odd, membership, about, media, contact
  styles/
    tokens.css             Color, spacing, motion tokens (with provenance)
    typography.css         Fluid type-scale roles (display-xl → caption)
    layout.css              Container widths, section rhythm
    motion.css               Reveal-on-scroll + marquee keyframes
  components/
    primitives/             Logo, Pill, SocialIcon — dumb, reusable
    navigation/              Nav, Footer, MobileMenu — read from site/global.json
    media/                    Cursor, SteamFilters — page-independent chrome
    sections/                 Hero, Converge, SubpageRail, AboutPanels, … —
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

It's the wrong call here. ODD has **nine pages, and most have a genuinely
different, bespoke layout**: the home page's photo mosaic hero and filmstrip
don't exist anywhere else; ODDfest/ODDference/ODDagency share a rail+grid
shape but each hero is a different variant (video split, image split,
full-bleed video); the about page opens with a four-panel sequence unlike
anything else on the site. Forcing these into a generic
"sections" abstraction would mean either (a) building generic components that
can't actually express this site's real layouts, or (b) building one generic
section type per page anyway, which is a composer in name only.

Media, Contact, Work with ODD and Membership are the exception that proves
the rule, not a contradiction of it: they're genuinely simpler, more
informational pages, so they get a plain shared `PageIntro` header component
instead of each inventing bespoke hero markup — reuse where the content is
actually generic, bespoke schemas where it isn't. Within those (and within
ODDfest/ODDference/ODDagency's now much longer pages), the same logic repeats
one level down: `FeatureGrid`, `ProgramGrid`, `SectionIntro`, `CaseGrid`,
`ParticipateBand` and the other V2 section components (see
[V2](#v2) below) are reused wherever the
content genuinely has the same shape, and left page-specific where it
doesn't.

Instead, each page has a **fixed schema** (see `src/content.config.ts`'s
discriminated union on `template`) with named, real fields — and the
_repeating_ content within a page (news items, program cards, feature grids,
participate CTAs, about-page panels) _is_ an editable array with an "add new"
structure in CloudCannon. That's real editing power scoped to where the site
actually repeats, not a composer pretending everything is generic.

## V2

2026-08-20 → present: a content-and-architecture rebuild, not a redesign — the
visual system (tokens, mosaic hero, cursor, rails, motion) is untouched. Three
real decisions worth recording:

1. **The old shared "subpage" template split into three real templates**
   (`oddfest`/`oddference`/`oddagency` in `src/content.config.ts`). V1 gave
   all three the same schema because their content genuinely overlapped at
   the time; V2 gives each real, distinct sections (ODDfest's programme/open
   call, ODDference's speakers/tickets, ODDagency's cases/capabilities), and
   forcing those into one shared bag of `.optional()` fields would have
   violated the same "named schema over generic composer" rule this doc
   argues for above. They still share a `subpageBase` (rail + hero + features
   - participate) via Zod's `.extend()`, since that part is genuinely common.
2. **"Work with ODD" is the one B2B gateway**, not two competing nav items.
   ODDmembership and ODDagency both need real pages, but neither needed a
   permanent slot in a five-item primary nav — they're reachable from Work
   with ODD's pathway grid and from CTAs throughout the site instead. See
   `src/content/site/global.json`'s `nav` array.
3. **About's four-panel opening** (trimmed from five panels to four, content
   updated) carries the conceptual opening — What is ODD / Why we exist / How
   it works / One platform — as a plain stacked sequence (`AboutPanels.astro`;
   see `docs/deployment.md`'s history or git log for the pinned
   horizontal-scroll version this replaced 2026-08-21, dropped for a more
   direct page). The V2 sections a real About page also needs (Story/timeline,
   Proof, People, Network, Ambition) continue as a normal vertical page below
   it. Same "reuse where generic, bespoke where not" call as Media/Contact
   above, just inside a single page instead of across the sitemap.
4. **Primary nav grouped to five items via a one-level "Info" dropdown**
   (About/Media/Contact) instead of growing to seven flat items — see
   `src/content/site/global.json`'s `nav[].children`. `Nav.astro` renders it
   as a CSS-only hover/focus-within dropdown (no JS — a keyboard user tabbing
   onto the "Info" link is itself inside `.nav-dropdown`, which satisfies
   `:focus-within` before Tab moves into the menu). `Footer.astro` flattens
   `children` back into ordinary links (a footer doesn't need a dropdown);
   `MobileMenu.astro` renders the parent as a normal link with its children
   as a smaller indented group beneath it. Any nav item can get `children`
   the same way — it's not special-cased to "Info".
5. **Media became a real press kit**, not just a logo strip — accreditation,
   key facts, highlights, boilerplate, press releases, info packs, assets,
   named press contact, social. All of it is real content pulled directly
   from the live oddfest.co press page, not invented — see `media.json`.

**Nav breakpoint: 1024px, not 760px.** "Work with ODD" is a genuinely long
label next to the site's other single-word nav items — at anything narrower
than 1024px, the 5-item desktop nav collided with the Pre-register button,
and that broken state got baked straight into the visual-regression baseline
without anyone noticing (a pixel-diff test only catches _changes_ from a
baseline, not whether the baseline itself is good — caught here by an actual
tablet-width screenshot, not assumed). `Nav.astro`'s `.nav-links` now switches
to the mobile hamburger menu at 1024px, covering every common tablet
portrait width (iPad Mini/Air/Pro: 768–1024px), not just phones.

**Featured In's infinite scroll direction.** `LogoStrip`'s `scroll` mode
uses `marquee-right` (see motion.css) with `animation-direction: reverse` —
plain `marquee-right` on this component's doubled track empirically reads as
right-to-left content motion (verified by screenshotting the same named
logos at two points in time and comparing their pixel position, not assumed
from the keyframe's name/math). `reverse` is what actually produces
left-to-right, which is what was asked for.

**Grids that orphan a lone item onto their own row.** `FeatureGrid` was a
hardcoded `repeat(3, 1fr)` and `ParticipateBand` was `repeat(auto-fit,
minmax(240px, 1fr))` — both strand a lone item alone on a second row whenever
the real item count doesn't divide evenly (ODDfest's 4-step "How it works",
Home's 5-item "Ways to participate", ODDagency's 5-step process, and more).
Both now size to `repeat(var(--cols), 1fr)` with `--cols` set inline per
instance to the real item count, via a CSS custom property rather than a
direct inline `grid-template-columns` — the latter would out-rank the mobile
media query's single-column override regardless of viewport, since an inline
style always beats a stylesheet rule. `ProofGrid`/`CaseGrid`/`PersonGrid`
deliberately keep `auto-fit` wrapping instead — those can legitimately hold
many items (Media's 8-stat highlight grid, a large speaker roster), where
forcing one row would recreate the very overflow bug documented above instead
of fixing anything.

**Photo interludes on the subpages.** `PhotoBreak.astro` — a full-bleed,
uncaptioned image, real ODD archive photography (`src/assets/hero/`), used as
breathing room between text-heavy sections on ODDfest/ODDference/ODDagency/
Work with ODD/Membership/About. No overlay text by design: the site's
minimal layout exists specifically to leave room for a photo to be the whole
moment. Works cleanly inside `SubpageFrame`'s fixed side rails too (the
`.bleed` full-viewport-width pattern renders under the rails, which sit at a
higher z-index) — verified via an actual `document.documentElement.
scrollWidth` check across all six pages, not assumed, given `.bleed`'s
`calc(50% - 50vw)` centering trick has a real history of producing horizontal
overflow when used carelessly (see `Converge.astro`'s own comment).

**Field-name collisions across templates.** CloudCannon's `_inputs` are keyed
by field name across the whole `pages` collection, not per-template — so two
templates using the same key for a _different_ shape (e.g. an early draft had
both Home's single case teaser and About's milestone timeline named `story`)
silently break the CloudCannon editing UI for one of them. Home's is
`caseTeaser`; About's stays `story`. Membership's closing CTA is `finalCta`
(not `contact`, which Work with ODD uses for its embedded-form intro), and
its pre-logo-strip note is `network` (not `proof`, which means a stats grid —
`proofSection` — everywhere else it's used). Adding a new field name: grep
`src/content.config.ts` for it first.

**Narrow-column placeholder text.** A few components lay real content into a
fixed-width slot designed for short values — `ProofGrid`'s big stat number,
`Timeline`'s year column, `ProgrammeList`/`WhatsOn`'s date column. A long
`[PLACEHOLDER — description]` string in one of those overflows its column and
visually collides with the next one (caught during V2 build via an actual
screenshot, not assumed). Convention: those specific fields get a short
placeholder (`—`, `TBD`) with the descriptive `[PLACEHOLDER — ...]` text
living in the field next to them instead; every other text field is safe to
use the full bracketed description in. See each page's JSON for the pattern.
The same failure mode recurred later with a genuinely real, non-placeholder
value (`ProofGrid`'s "€400K" on the Media page overflowed into its neighbor
the same way) — the durable fix landed in `ProofGrid.astro` itself: grid items
default to `min-width: auto`, which refuses to shrink narrower than their own
content, so a value wider than its column overflows into the next one
regardless of what the text says. `min-width: 0` on `.proof-item` plus a wider
column minimum is the actual fix; short placeholders were only ever a
workaround for content wide enough to trigger the same underlying bug.

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

`tests/visual/pages.spec.ts` screenshots all 9 routes at 5 viewports
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

**Local-only, deliberately.** Playwright's default snapshot filenames bake
in the OS (`*-darwin.png`) — every baseline in this repo was generated on
macOS. `.github/workflows/ci.yml`'s `functional` job runs everything else
(`npx playwright test --grep-invert "full page|404 page"`: the full
cross-browser interaction suite, plus the console-error check, neither of
which compares pixels) but skips the screenshot comparisons outright —
running them on the Linux CI runner would fail every single one looking for
`*-linux.png` files that don't exist, for a reason with nothing to do with
whether the site actually broke. Maintaining a second Linux baseline set was
considered and rejected: it doubles the file count with no local dev
workflow (all work on this project happens on macOS) that would ever
generate or review a Linux baseline, making it dead weight that goes stale
silently. Run `npm test` locally before pushing, same as this project always
has; see docs/deployment.md#ci-history for how this was discovered.

## Old site relationship

`../ODD NEW WEBPAGE/index.html` (the single-file build) was the site's
production build through 2026-08-19 and is preserved as the visual reference
for this migration (see CLAUDE.md's "What this is"). Its own files/repo are
untouched by this project, but **its `npx surge .` deploy path is no longer
what serves odd-field-guide.surge.sh** — cutover happened 2026-08-20; running
that command again would revert the live domain back to the old site, so
don't. See [deployment.md](deployment.md) for the current deploy path.
