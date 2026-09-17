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
    pages/*.json           11 fixed pages: home, oddfest, oddference, oddagency,
                            oddspace, work-with-odd, membership, about, media,
                            contact, privacy
  styles/
    tokens.css             Color, spacing, motion tokens (with provenance)
    typography.css         Five-step type ladder (hero → small), wrapping defaults
    global.css             Base element styles; the desktop root scale (1024 → 1440px)
    layout.css              Container widths, section rhythm
    motion.css               Reveal-on-scroll + marquee keyframes
  components/
    primitives/             Logo, Pill, SocialIcon — dumb, reusable
    navigation/              Nav, Footer, MobileMenu — read from site/global.json
    media/                    Cursor, SteamFilters — page-independent chrome
    sections/                 Hero, Converge, SubpageRail, ProgramGrid, … —
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

It's the wrong call here. ODD has **eleven pages, and most have a genuinely
different, bespoke layout**: the home page's photo mosaic hero and filmstrip
don't exist anywhere else; ODDfest/ODDference/ODDagency share a rail+grid
shape but each hero is a different variant (video split, image split,
full-bleed video). Forcing these into a generic "sections" abstraction would
mean either (a) building generic components that can't actually express this
site's real layouts, or (b) building one generic section type per page
anyway, which is a composer in name only.

Media, Contact, Membership and (since the 2026-08-30 rebuild) About are the
exception that proves the rule, not a contradiction of it: they're genuinely
simpler, more informational/editorial pages, so they get a plain shared
`PageIntro` header component instead of each inventing bespoke hero markup —
reuse where the content is actually generic, bespoke schemas where it isn't.
Work with ODD's own hero (`HeroCentered.astro`, added in the same 2026-08-30
rebuild) is centred like `PageIntro` but adds a real full-bleed photo behind
the text — its own component specifically so a change there can't regress
Contact/Media/Membership/About, which keep `PageIntro` untouched. Within
those (and within ODDfest/ODDference/ODDagency's now much longer pages), the
same logic repeats one level down: `FeatureGrid`, `ProgramGrid`,
`SectionIntro`, `ProofGrid`, `CaseGrid`, `ParticipateBand` and the other V2
section components (see
[V2](#v2) below) are reused wherever the
content genuinely has the same shape, and left page-specific where it
doesn't — About's own `argument`/`howWeMakeItHappen`/`impact` fields are the
bespoke part, the rest is the same component family as Work with ODD.

Instead, each page has a **fixed schema** (see `src/content.config.ts`'s
discriminated union on `template`) with named, real fields — and the
_repeating_ content within a page (news items, program cards, feature grids,
participate CTAs, timeline milestones) _is_ an editable array with an "add
new" structure in CloudCannon. That's real editing power scoped to where the
site actually repeats, not a composer pretending everything is generic.

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
   permanent slot in the primary nav — they're reachable from Work with
   ODD's pathway list and from CTAs throughout the site instead. See
   `src/content/site/global.json`'s `nav` array. **2026-08-30:** Work with
   ODD itself moved out of the primary nav too, into the "Info" dropdown
   (route unchanged; labelled "Work with us" until 2026-09-11, now "Work
   with ODD" like everywhere else) — it stopped being one of the three
   primary destinations (ODDfest/ODDference/ODDspace) and became the place
   organisations go to go further, which doesn't need equal top-level
   billing. The page itself was rebuilt around a tighter IA: hero → what we
   do/why ODD → four pathways (`PathwayList.astro`, not `ProgramGrid` —
   `ProgramGrid` stays as-is, it's shared with the homepage's own "What we
   do" section) → selected work (hidden until real cases exist) →
   organisations we've worked with (a page-specific curated `logos` field,
   not the sitewide `partners` list — see `network`'s `_inputs` comment in
   `cloudcannon.config.yml`) → the enquiry form.
3. **About rebuilt 2026-08-30 around the same component family as Work with
   ODD** (`about.astro`), replacing the earlier four-panel opening +
   panels/people/network/ambition structure (`AboutPanels.astro`; see git
   history for that version and for the pinned horizontal-scroll version it
   itself replaced 2026-08-21). Six sections, in order: a `PageIntro` hero
   (why ODD exists) + `argument` paragraphs for the deeper case; `story`
   (`Timeline`, unchanged, plus a `legalNote` caption carrying the New Nordic
   Way rf operator fact — About no longer has a separate People/organisation
   section for it); `howWeMakeItHappen` (`FeatureGrid` pillars — Events /
   Spaces / Relationships & projects — plus a `principles` "ways of working"
   `FeatureGrid`); `impact` (one `ProofGrid` row — see "Field-name
   collisions" below for why this isn't the shared `proof` field);
   `participate` (`ParticipateBand`, unchanged shape); and a closing
   `closingImage` (`PhotoBreak`). 2026-09-14: `closingImage` became
   `launchPhoto`, the ODDfest 2026 launch group photo, moved up to follow
   the argument; `impact` went from two year snapshots (2025's figures, an
   empty 2026 one) to Home's cumulative 2025–2026 figures with two buttons
   (`ctas`: the 2025 Impact Report, the ODDfest 2026 thank-you page); a
   `gallery` `PhotoWall` (ODDfest 2025/2026 Flickr, host events, ODDspace)
   follows it; and "What we have learned" was deleted. See
   `content.config.ts`'s `about` schema for the full shape. About no longer
   carries its own partner-logo wall (the `network` field), unlike Work with
   ODD's page-specific curated one — see point 2 above.
4. **Primary nav grouped via a one-level "Info" dropdown**
   (Work with ODD/Media/About/Contact — four flat top-level items:
   ODDfest/ODDference/ODDspace/Info) instead of growing to a flat list of
   seven. **Reordered 2026-09-11**: Work with ODD leads the dropdown rather
   than sitting behind About, because it is what most people opening this
   menu are actually after — About is the least-visited of the four — see `src/content/site/global.json`'s `nav[].children`. `Nav.astro`
   renders it
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
6. **The 2027 ODDference rebuild** (see commit history on
   `feature/oddference-2027-rebuild`, branched off the ODDfest 2027 rebuild
   in `feature/oddfest-2027-rebuild`) clarified ODDference's role once
   ODDfest itself became the distributed, city-wide Creative Week: ODDfest
   is the open programme across Helsinki; **ODDference is the centrally
   produced professional experience**, and it's the one that now absorbs
   the strongest artistic/experiential layer (installations, performances,
   scenography, spatial design) that used to sit inside the centrally
   booked ODDfest — not the two events merging, two distinct roles. The
   rebuilt page (`oddference.astro`/`oddference.json`) drops the old "Big
   Question"/Themes/Formats/Why attend/Connection/generic-FAQ sections for
   eight sections built around four real jobs: explain the product, prove
   2026 credibility, sell the currently active Blind Bird ticket, generate
   partnership enquiries. Three decisions worth recording:
   - **No invented ticketing URL.** No Blind Bird checkout integration
     exists anywhere in this repo. The hero's primary CTA anchors to the
     page's own ticket section (`#tickets`); the ticket card's own CTA is a
     real `mailto:ronny@oddfest.co` link (the existing partnerships/press
     address) as a functional interim path, flagged in `oddference.json`
     for a real Tiketti/Venga link once one exists — not a fabricated
     external URL.
   - **`Aftermovie.astro` was deliberately not reused.** It's a fixed
     3-brand (ODDfest/ODDference/ODDspace) logo marquee built around the
     homepage's one shared `home-aftermovie.mp4` — reusing it here would
     have mislabeled that generic footage as ODDference's. No dedicated
     ODDference aftermovie exists yet (checked this repo and the live 2026
     `oddfest.co/oddference/` page), so the new `aftermovie` field ships
     `undefined` and the section renders nothing until real footage exists
     — same "don't invent it, ship it empty" rule `oddfest.examples`
     already established.
   - **`partners` ships empty for the same reason.** The live 2026 page has
     no partners section, and `global.json`'s sitewide partner/press logos
     aren't attributable to ODDference specifically — showing them here
     would misrepresent them as current ODDference partners. The section
     (and its own `_structures.logo_item`-based CMS field, distinct from
     Global → Partner logos) is built and ready; it just needs a real,
     verified ODDference-specific list.

   Two components changed with blast radius beyond this one page:
   `FullbleedVideoHero.astro` gained optional `primaryCta`/`secondaryCta`
   props (additive — ODDfest's call passed neither at the time; it passes
   both as of the 2026-09-11 rebuild in point 7), and `PersonGrid.astro`
   gained an optional per-person
   `image` (also used by `personItem`, so About's photo-less team keeps its
   existing plain typographic card; ODDference's real, verified 2026
   speaker photos render the new photo-led card instead).

7. **The 2026-09-11 ODDfest rebuild**, at Ronny's direct request, put the
   page in the order a reader actually asks things in: hero, what it is,
   how it works, how to join, what has happened before, FAQ. Four
   decisions worth recording:
   - **The hero took ODDspace's anatomy, not its medium.** The brief was
     "same structure as the ODDspace page" — eyebrow, wordmark, h1, a
     support line, meta, two CTAs. It keeps the aftermovie behind all of
     that rather than adopting `SpaceHero`'s photo grid: the film is the
     only asset that shows what ODDfest felt like, and every prop needed
     already existed on `FullbleedVideoHero` from the ODDference rebuild.
     Nothing new was built. `secondaryCta`/`heroSupport` are declared on
     the oddfest branch of `content.config.ts`, mirroring how ODDference
     declares its own. **Superseded on 2026-09-14:** the hero moved to
     `frame="space"`, the same change ODDference got on 2026-09-11 — see
     the hero-variants note below. The eyebrow and support line are no
     longer rendered, `heroSupport` is removed from the oddfest branch, and
     `meta` is "Helsinki · 2027".
   - **"You make the event. ODD builds the shared layer." and "How it
     works" became one section**, because they were one argument told
     twice — who is responsible for what, then what actually happens. The
     `sharedLayer` field is now `ownership` and also carries the label
     above the steps; `howItWorks` stays a bare `featureCard[]` array
     rather than being folded in, because ODDspace/ODDagency/ODDstudio all
     have a field of that name and CloudCannon's `_inputs` are keyed by
     field name across the whole collection (the `caseTeaser` trap).
   - **The "shared platform" block was deleted, not moved.** It described
     2027 programme and discovery-platform features that are neither built
     nor confirmed — the same promise-ahead-of-the-build this codebase
     refuses everywhere else. `editorial-integrity.spec.ts` asserts it
     stays gone.
   - **The archived 2026 thank-you page was hosted, not rebuilt — until
     2026-09-17.** It first lived at `public/oddfest-2026/` as a standalone
     63KB static page with its own type, palette, audio and Flickr-hosted
     photography, with only its fonts, audio filename and a dated archive
     banner changed. **Superseded on 2026-09-17**, at Ronny's request that it
     follow the same rules as the rest of the site: it is now a real route,
     `src/pages/oddfest-2026.astro`, with every word in
     `src/content/pages/oddfest-2026.json` (template `oddfest2026`). It uses
     ODDfest's rails (`SubpageFrame slug="oddfest"`), ODDspace's photo-grid
     hero (`SpaceHero`), `PhotoBreak`, `PhotoWall` and `ParticipateBand`, the
     five-step type ladder and the spacing rhythm. The letter and the
     credits are unchanged. The June 2026 reflection (2026 plus a look ahead
     at a 2027 plan that has since changed) was rewritten the same day at
     Ronny's request: 2027 is gone, and the section tells what happened in
     2026 around one figure — the number of different names in the credits,
     counted by the page itself (274 at the time: 284 lines, ten names listed
     twice). Its facts are only ones the site already published (Media's
     archive entry, ODDfest's highlights, ODDference's FAQ). What did not survive, on purpose: a feedback form whose submit
     handler only changed its button text (the card now links to the
     contact form, `?topic=oddfest_2026_feedback`); two `href="#"` buttons
     (now the newsletter and `/oddspace/membership`); a runtime Flickr API
     call with its key in the page source, fetching up to 1,500 photos (the
     25 it had curated were downloaded into `src/assets/oddfest-2026/`, 24
     are used); and the oddfest.co button, because `/oddfest` carries the
     site's one labelled link to that domain. The "play the credits" roll
     survives as `src/scripts/oddfest-2026-credits.ts`: the hero's `#credits`
     link starts the soundtrack (`public/audio/`, fetched only on click) and
     a slow self-scroll that stops when the reader scrolls; under reduced
     motion the link just jumps to the credits and plays the soundtrack.

   One thing that is deliberately _not_ in the rebuild: the "what has
   happened before" section cites only figures this site already publishes
   elsewhere (About's 2025 snapshot and /media's archive record). ODDfest
   2026's own attendance was never published anywhere on this site, and the
   internal records disagree with each other about 2025's — so the section
   carries the 2025 numbers, names 2026 qualitatively, and invents nothing.
   **Superseded on 2026-09-14:** the "what has happened before" section was
   deleted at Ronny's request, along with its `history` field, and About's
   "What we have learned" (`whatWeLearned`) went with it.

8. **The 2026-09-11 ODDference restructure** took the page to the eight
   sections Ronny specified — hero, the premise, three reasons, past
   speakers, session highlights, who it's for, tickets & partnership, FAQ —
   in that order. What is worth recording beyond the ordering:
   - **The 2026 proof moved ahead of "who it's for".** A reader used to meet
     a list of job titles before seeing anything that had actually happened.
     The speaker roster also grew from the 10 that were in content to the
     full, real 25 from the live 2026 page, with their real portraits.
   - **`sessionHighlights` is new, and its source is not the website.**
     `oddfest.co/oddference` never published session-level content — only
     the three programme tracks and the speaker wall (verified against the
     rendered page and the WordPress REST API, which has a `lineup` post
     type and nothing programme-shaped). The twelve titles come verbatim
     from the event's own master stage schedule in Drive ("ODDference
     Ajolista"), with one typo corrected. Anything added here later must
     come from a comparable record, not from memory.
   - **"What changes in 2027" was removed**, not hidden: three cards of
     intent about an unbuilt programme, sitting between the 2026 proof and
     the ticket block. Its one load-bearing fact — ODDference runs alongside
     ODDfest week across Helsinki — is kept, in the FAQ.
   - **The ticket block stopped saying "Recommended".** On a ladder where
     exactly one tier can be bought, that word describes a choice the reader
     does not have; the badge now carries the real deadline instead
     (`badgeLabel` in content — the catalog has no field for it, so
     `oddference-tickets.ts` toggles the badge's visibility and never its
     text). The other two tiers render `locked`: dimmed, priced, and with
     their button hidden but still in the DOM, so the catalog can hand it
     back the moment it opens that tier. `locked` is a build-time fallback
     only — the runtime sync re-derives it from the catalog's `upcoming`
     status, and deliberately does _not_ apply it to a sold-out or closed
     tier, where "you missed it" is the thing the reader needs to see.
   - **The conversion section stacked.** Tickets and the partnership ask
     were side by side at `1.4fr 1fr`, which left the ticket grid 628px at
     1440px wide — room for two of `PricingGrid`'s 260px tracks, so the
     third tier always wrapped alone. Survivable when all three looked
     alike; not once two are dimmed. Full width fits all three in one row
     and the price progression reads left to right.

   **Cut down on 2026-09-17** at Ronny's request ("fewer things, shown
   better"): speakers 25 → 10 (two new to the page, Atte Jääskeläinen and
   Anna Brchisky, with their official portraits from the 2026 site's
   WordPress media library) in a 5 × 2 grid, 2 × 5 on phones; session
   highlights 12 → 5 as a ruled list directly under them, one of them ("New
   Media in the Attention Economy — What Has Changed?") newly taken from the
   same run sheet; "Who it's for" deleted with its `whoItsFor` field, schema
   entry and CMS input. The seventeen dropped speakers' portraits were
   deleted from `src/assets/speakers/` and are in git history. The page went
   from ~16,000px to ~9,150px tall at 1440px wide, and ~23,600px to ~10,300px
   at 390px.

9. **The 2026-09-11 editorial alignment pass** worked through the whole site
   against the September planning review, which asked for editorial
   simplification rather than a redesign. One rule ran through all of it:
   one headline = one quickly understood thought, and every section has one
   job. What changed, and the reasoning that is not obvious from the diff:
   - **The homepage hero split in two — reverted 2026-09-13.** The pass
     replaced the two-part mission h1 with a one-claim headline ("Creative
     work deserves better conditions than starting from zero every time")
     plus an `opening.support` line under it. Ronny judged the new copy
     weaker than the original and asked for the original headline back with
     no line beneath it, so the h1 is the full mission sentence again and the
     `support` prop, schema field and styles are gone.
   - **"Already in motion" stopped saying the numbers twice.** Its paragraph
     restated all four figures that the stat row underneath it already
     shows. `identity-integrity.spec.ts` guarded the old wording, so that
     assertion now guards the timeframe claim rather than one sentence of it.
   - **About's "Why now" section was removed, not shortened.** Its headline —
     "When execution gets easier, judgment matters more" — was strategy
     thinking that read well in a deck and told a visitor nothing about ODD.
     Its one load-bearing fact (Finland's own creative-economy goals already
     assume this expertise matters more) survives inside the opening
     argument, which came down from five paragraphs to three. "What we have
     learned" lost the two items the timeline and the impact numbers already
     tell.
   - **ODDfest gained a partner route.** The page converted hosts and nobody
     else, while partners are the other audience it genuinely has. It is a
     bordered band after the proof chapter, deliberately quieter than the
     host ask, routing into the existing Work with ODD partnerships enquiry
     rather than a second form.
   - **ODDnetwork says the name is provisional**, because it is.

**Nav breakpoint: 1024px, not 760px.** Originally set because "Work with
ODD" was a genuinely long label next to the site's other single-word nav
items — at anything narrower than 1024px, the 5-item desktop nav collided
with the Pre-register button, and that broken state got baked straight into
the visual-regression baseline without anyone noticing (a pixel-diff test
only catches _changes_ from a baseline, not whether the baseline itself is
good — caught here by an actual tablet-width screenshot, not assumed).
`Nav.astro`'s `.nav-links` now switches to the mobile hamburger menu at
1024px, covering every common tablet portrait width (iPad Mini/Air/Pro:
768–1024px), not just phones. **2026-08-30:** "Work with ODD" moved out of
the flat nav into the "Info" dropdown (see point 4 above), leaving four flat
items (ODDfest/ODDference/ODDspace/Info) — the 1024px value is left as-is
rather than tightened on an unverified assumption; re-check with a real
tablet-width screenshot before lowering it.

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
style always beats a stylesheet rule. `ProofGrid`/`CaseGrid` (and, until
2026-09-17, `PersonGrid`) deliberately keep `auto-fit` wrapping instead —
those can legitimately hold many items (Media's 8-stat highlight grid, a
large speaker roster), where
forcing one row would recreate the very overflow bug documented above instead
of fixing anything. (`FeatureGrid` has since moved on twice: a capped
auto-fit track in the 2026-08-31 pass, and in the 2026-09-13 typography pass
a centred flex-wrap whose card width is derived from the Heading type role,
so a short last row centres rather than stranding a card, and ODDfest's
forced four-across row was retired for the same 2x2 block as any four-card
grid — see `FeatureGrid.astro`. `ProofGrid` rows of four figures go
two-by-two between 701 and 1024px.)

**Photo interludes on the subpages.** `PhotoBreak.astro` — a full-bleed,
uncaptioned image, real ODD archive photography (`src/assets/hero/`), used as
breathing room between text-heavy sections on ODDfest/ODDference/ODDagency/
Membership/About. (Work with ODD dropped it in the 2026-08-30 rebuild — its
own hero now carries a full-bleed photo instead, so a second one lower down
the page would have been redundant.) No overlay text by design: the site's
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
`proofSection` — everywhere else it's used). Same reason About's figures
are their own `impact` field, not `proof` — About's carries a `ctas` array
of buttons where `proofSection` (Home/ODDference/ODDspace) has one `cta`, a
different shape a shared `_inputs.proof` cascade entry can't also describe. Adding a new field name:
grep `src/content.config.ts` for it first.

**Narrow-column placeholder text.** A few components lay real content into a
fixed-width slot designed for short values — `ProofGrid`'s big stat number,
`Timeline`'s year column, `ProgrammeList`'s date column. A long
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

## Homepage order

The homepage's section order is a real editorial decision, not an accident of
what got built when, and it has been changed by three separate passes — so
before moving anything, read `src/pages/index.astro`'s own section-order
comment and `tests/functional/editorial-integrity.spec.ts`, which asserts the
order on the rendered page. A visual snapshot cannot tell a moved section from
an unchanged one; that test is the only thing that can.

Current order (2026-09-11 reorg):

```
Hero
Why ODD               premise + point, one photo in an emptied grid, the passage
Who ODD is for        creatives left, business right, two buttons each
What we do            ODDfest / ODDference / ODDspace
Work with ODD         full-width band, directly under those three
Already in motion     the cumulative numbers
Featured in           press logos, same chapter as the numbers
Aftermovie            the one moving image, between argument and ask
The way in is by doing  four CTAs, grouped under For creatives / For business
```

The principle: the page answers a reader's questions in the order they
actually arrive — _why does this exist → is it for me → what is it, concretely
→ how do I go deeper → why should I believe any of it → what does it feel like
→ pick a door._

Two of those positions reverse an earlier pass, deliberately:

- **"Who ODD is for" above "What we do."** The 2026-09-02 pass put the
  audience split after the proof module, reasoning that "what" precedes "who."
  In review that lost the reader: ODDfest/ODDference/ODDspace are three
  invented names that mean nothing until you know which one is aimed at you.
- **"Work with ODD" directly under "What we do."** The 2026-09-03 pass moved
  this band away from the product grid because, sitting flush under it, it
  read as a fourth product card. The real fix for that was the band's own
  styling (no photo, no grid cell, full width, `--space-10` of air above it),
  not its position — its question, _"want something bigger than one of those
  three?"_, only lands while the three are still on screen.

**Creatives before business, everywhere.** Wherever the site splits what ODD
does by audience, the creative side comes first — ODD is a creative
organisation that business is invited into, not the other way round. On the
homepage that is `Converge`'s `creativeFirst` prop and the order of
`index.json`'s `participate` array; both are asserted by
`editorial-integrity.spec.ts`, because both take their order from content and
would otherwise regress silently on a reordered JSON array.

## Hero variants

**Corrected 2026-08-31** — this section previously described an earlier
state (ODDference/ODDagency both on `SplitHero`) that had already changed by
the time of the final implementation pass; it's rewritten here to match the
actual current code, not left as a comment describing false architecture.

The three primary product subpages — ODDfest, ODDference, ODDspace — share
`SubpageFrame.astro` (the fixed side rails + a full-frame `hero` slot + the
normal padded content column). ODDagency moved off this shared frame
entirely in the 2026-08-31 final implementation pass (see below).

- **ODDfest** and **ODDference** — both use `FullbleedVideoHero`: full-bleed
  video behind the page title, matching the original site's own layout
  choice. `FullbleedVideoHero` takes an `accent` prop (`'ultraviolet'`
  default for ODDfest, `'signal'` for ODDference) so the two heroes read as
  distinct product identities from one shared component rather than forking
  it — see the component's own comment and `docs/design-system.md`.

  Since 2026-09-11 it also takes a `frame` prop. That is a second,
  orthogonal knob: `accent` picks the color identity, `frame` picks the
  _proportions_. `'default'` is the original frame (a small headline under a
  very wide wordmark, light scrim, standard `Pill` sizing); `'space'`
  reproduces `SpaceHero`'s — display-sized headline, a darker centred scrim,
  the larger CTA pills ODDspace got the same day — on each page's own video,
  so the pages read as siblings without giving up their film for a photo
  grid. ODDference moved to `frame="space"` on 2026-09-11 and ODDfest on
  2026-09-14, so no page currently renders `'default'`. In that frame the
  wordmark is sized to one rendered _height_, not one width: each wordmark
  scales the tuned widths by its own aspect ratio (`logoScale` in the
  component), so ODDfest's squarer wordmark does not render taller than
  ODDference's. Every other value in that block is lifted from
  `SpaceHero.astro` rather than re-derived; if one is retuned, retune the
  other to match. Asked for directly; the alternative considered and
  rejected was moving ODDference onto `SpaceHero` itself.

- **ODDspace** — `SpaceHero`: an asymmetric grid of real space photography
  instead of one video (its brief asks for the space itself, shown through
  photography, to be the protagonist).
- **ODDagency** — `HeroCentered`, the same hero Work with ODD uses: a single
  centered photo hero, no side rails, no video. ODDagency is a deeper way to
  work with ODD, not a fourth core masterbrand product, so it deliberately
  doesn't share ODDfest/ODDference/ODDspace's product-hero chrome — see
  `content.config.ts`'s oddagency extend-block comment and
  `oddagency.astro`.

`SplitHero` (`split-video`/`split-image` variant) still exists as a
component but has no current callers — kept rather than deleted since
another subpage could plausibly need it later, not because anything still
uses it today.

**Hero-frame architecture (2026-08-31, requirement 23 — full-frame product
heroes):** `SubpageFrame.astro` exposes a named `hero` slot in addition to
its default slot. A hero passed into `slot="hero"` renders in its own
zero-padding zone between the rails — flush to the sticky nav above and both
rails' inner edges on either side, no gutter — while everything in the
default slot keeps the normal `.oddf-center` reading gutters (1.75rem
mobile, 88px desktop) untouched. Before this, every hero rendered as the
first child of that same padded column, inheriting padding meant for
article text. `FullbleedVideoHero`/`SpaceHero` size themselves to
`calc(100svh - var(--nav-h))` (nav + hero = one first viewport, with a fixed
`min-height` floor for short viewports) and carry no bottom margin of their
own any more — the hero→content transition space is owned once, by
`.oddf-center`'s top padding, not by a margin and a padding stacking into an
accidental double gap. See `SubpageFrame.astro`'s own comment for why no
padding math needs to match the rails' 68px width: `SubpageRail` is
`position: fixed` with an opaque fill, so it already visually overlays/masks
its own width regardless of what's underneath.

## Consent

Rebuilt 2026-09-03. Four categories — necessary / preferences / statistics /
marketing — matching the vocabulary Cookiebot and EU guidance use, and the
one oddfest.co already shows visitors through its own Cookiebot install.

```
src/scripts/consent-config.ts   what exists, in which category  (pure data)
src/scripts/consent.ts          the store: read/write/subscribe/withdraw
src/scripts/analytics.ts        GA4, subscribed to `statistics`
ConsentBanner.astro             the banner, rendered from consent-config
LegalDocument.astro             the cookie table, rendered from consent-config
```

**Why not Cookiebot.** oddfest.co loads `consent.cookiebot.com/uc.js` with
`data-blockingmode="auto"` and Google Consent Mode v2 defaults, which is the
right answer for a site with a marketing stack: Cookiebot auto-blocks
trackers nobody registered, keeps a server-side consent log, and generates
its own declaration. This site has one analytics tag and, since 2026-09-11, no embeds at all
(see "ODDspace events" below). Adopting
a CMP here would add a third-party script on every page and make the site
_less_ private, because Consent Mode still pings Google before consent —
cookielessly, but it still contacts them. Not requesting `gtag.js` at all is
the stricter position, and it's only available to us because the surface is
small enough to enumerate by hand. If a marketing pixel is ever added, that
trade flips and this decision should be revisited.

**What we gave up, and how each gap is covered.** No auto-blocking: the
declaration in `consent-config.ts` is the manual substitute, and the reason
both the banner and the privacy table render from it is that a tracker
without an entry can't be gated, so the two can't drift apart silently. No
consent log: `decidedAt` on the stored value is the closest honest
equivalent, and it is client-side only — we cannot prove to a regulator who
consented when. That is a real, accepted limitation, not an oversight.

**The two gaps this fixed.** Before this, the banner only knew about GA4, so
the ODDspace calendar embed (since removed) loaded regardless of the
answer; and a stored
choice could not be changed, which GDPR Article 7(3) requires to be as easy
as giving it. The footer's "Cookie settings" button and the one on
`/privacy/` both call `openConsentSettings()`, which clears the stored value
before reopening — so abandoning the reopened banner fails closed.

**`preferences` is now an empty category, and that is deliberate.** The
Google Calendar embed was its only entry; removing the embed (2026-09-11)
left the category declared but with `entries: []`, which
`togglableCategories()` drops from the banner entirely — the same contract
`statistics` has when no GA4 property is configured. The category stays in
the file so the next embed has an obvious place to be declared, and so a
future reader can see that "we ask about embeds" was a considered position,
not an omission. If you add an embed, add its entry here: that is what
restores the toggle, and nothing else will.

`tests/functional/consent.spec.ts` asserts on the network, not the banner's
appearance: the requests are the thing that would actually breach ePrivacy
Article 5(3), and they are invisible in a screenshot. Its ODDspace test now
asserts the absence — no iframe on the page, no Preferences row in the
banner — because "we removed the embed" is only true while both hold.

## ODDspace conversion pages

`/oddspace/membership` and `/oddspace/venue` (2026-09-11) are the two
journeys `/oddspace` deliberately does not carry. That page's job is to make
someone want the place; these two exist so that someone who already does can
finish deciding — or plan a real event — without writing to us first. Both
were asked for directly in the September website review: "someone seriously
considering membership should be able to get all the necessary information
before contacting us", and for the venue, "someone should be able to read it
and know almost everything necessary before asking: is 27 October available?"

Three decisions worth keeping:

- **They are ODDspace pages, not new products.** Both reuse `_slug:
"oddspace"`, so `SubpageFrame` gives them ODDspace's rails, logo and
  frame, and both reuse `SpaceHero`/`SpaceShowcase`/`PricingGrid`/
  `FeatureGrid`/`FAQList` rather than introducing components. Nothing new
  was built except two page-scoped list/rate blocks.
- **The membership page puts "what's not included" beside "what's
  included", at the same size.** The studio carve-out and the absence of a
  private desk are exactly what a member would otherwise discover after
  paying. A layout where one column is a list and the other is a footnote
  converts better and works worse.
- **The venue page publishes what the site can stand behind and names the
  rest as questions it answers per enquiry.** Member rates (€200 gallery
  day, €100 auditorium half-day) are published because `/oddspace` already
  publishes them. Capacities, dimensions, AV inventory, accessibility,
  load-in, catering and non-member pricing are not, because nobody has
  verified them: the internal rental guide marks its capacities "TBD —
  confirm before publishing externally" and, as of 2026-09-11, carries three
  mutually contradictory price lists. The `askUs` block is not a placeholder
  waiting to be filled with plausible numbers — when a figure is genuinely
  verified it moves into the page proper and leaves that list.

`tests/functional/oddspace-conversion.spec.ts` asserts both halves: the
commercial facts a visitor came for, and the absence of the internal draft's
unconfirmed capacities.

## ODDspace events

The consent-gated Google Calendar embed on `/oddspace` was replaced on
2026-09-11 by `events` in `src/content/pages/oddspace.json`, rendered
through the existing `ProgrammeList` component. Three reasons, all of them
true of the embed as it shipped:

1. A month grid could not distinguish a weekly open morning anyone can walk
   into from a one-off booked festival — and both were on it, alongside
   internal room bookings nobody can attend.
2. Nothing rendered at all until the visitor accepted third-party cookies,
   so the most common first view of "what's happening here" was a consent
   placeholder.
3. It was the only thing on the site keeping a third-party embed, and with
   it gone the `preferences` consent category empties out (above).

The cost is real and worth stating: the list is hand-kept, so a moved or
cancelled date stays wrong until someone edits the JSON. The internal
booking calendar stays the operational source of truth; this is a
deliberately small, curated public subset of it. If it drifts often enough
to matter, the fix is a build-time fetch of the public feed into the same
`events` shape — not putting the iframe back.

## ODDspace photography

Replaced 2026-09-14 at Ronny's request: the previous set (an empty-rooms
office shoot) was out of date. Everything on `/oddspace` now comes from the
shared ODDspace Drive folder — the opening shoot, everyday phone pictures and,
for the auditorium only, a frame from the office shoot. The rule is people and
activity first, rooms second.

- `heroPhotos` and the room cards show the space in use wherever a truthful
  photo exists. The auditorium card is the exception, because no photo of that
  room in use exists yet. ODDstudio's photo (`podcast-studio.jpg`) was
  deliberately kept, in both the hero and its card.
- `gallery` renders `PhotoWall.astro` under the events list. See that
  component's header for how it packs any number of mixed-orientation photos
  without leaving holes.
- Alt text describes what is visible. Nobody in these photos is named.
- Sources are resized to 1800px on the long edge (2400px for the hero's lead
  cell and the full-bleed `PhotoBreak`), re-encoded, and stripped of EXIF — the
  phone originals carried GPS coordinates. `public/og/oddspace.jpg` was
  regenerated from the same opening shoot.
- As of 2026-09-14, `/oddspace/membership` and `/oddspace/venue` still use the
  older set.

## ODDspace Instagram

The wall of recent `@oddspace.co` posts under the ODDspace events list
(`InstagramGallery.astro` + `src/scripts/instagram-gallery.ts`), added
2026-09-03.

**Provider: Behold, via its JSON feed, not its widget.**
`GET https://feeds.behold.so/<feedId>` returns the posts as data — id,
permalink, media type, captions, a colour palette, and pre-sized media at
400/700/1000/2000px webp with real dimensions. That is what makes this
section ODD's own markup in ODD's own tokens rather than an embedded widget:
no iframe, no provider stylesheet, no Instagram logo, no like or follower
counts. The pre-sized media is also what lets the grid reserve space and ship
a responsive `srcset` instead of hotlinking Instagram originals behind
expiring URLs.

**It is not a consent-gated tracker, and that was checked rather than
assumed.** Behold sets no cookies and writes no `localStorage`, so ePrivacy
Article 5(3) is not engaged and there is no entry in `consent-config.ts` — an
entry there would describe storage that does not exist. Elfsight, the obvious
alternative, sets an `elfsight_viewed_recently` cookie and would have needed
declaring, disclosing and gating before the request.
`tests/functional/instagram-gallery.spec.ts` asserts the absence of cookies
and storage on the real browser, so the claim fails loudly if the provider
ever changes.

Behold is still a third-party processor, and `/privacy` names it — but only
while it is actually running. That is what the `onlyWhen` form of a legal
list item does (see `content.config.ts`): the item lives in `privacy.json`
like any other copy, and `privacy.astro` renders it only when the feed is
configured. A processor that ships switched off must not be disclosed as if
it were running, and must be impossible to forget once it is.

**Configuration.** `PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID`, read once in
`src/scripts/oddspace-instagram-config.ts`. A feed ID is public by design (in
Behold's own widget it is an HTML attribute), so it is not a secret and does
not belong in a Worker. With no ID the section is not rendered at all — the
same "inert until configured" contract as `analytics-config.ts` and
`tickets/config.ts` — so a build without the account connected ships no empty
gallery and no skeleton. The account connection itself is a one-time human
OAuth step; see `FINAL_IMPLEMENTATION_MATRIX_2026-09-03.md` blocker B8.

**Cost.** Below the fold, so nothing is requested until the section is within
400px of the viewport. The six tiles are server-rendered at final size before
any image exists, so filling them shifts nothing. Reels show poster media; no
`<video>` element is ever created.

**Failure.** A provider outage sets `data-state="unavailable"`, which swaps
the grid for one quiet line and the follow link, with no error of our own in
the console — deliberately not `console.error`, since a third party being down
is not this site's bug and would turn the visual suite's per-route console
check red on something no deploy can fix. The same fallback covers a visitor
with no JavaScript: the grid is opt-in via `data-state`, so it is never left
as six empty squares.

## ODDference ticket sync

`/oddference` sells tickets; `/tickets` sells them. Until 2026-09-03 both
described the same three ticket types independently, and they had drifted:
the marketing page advertised Blind Bird at €300 while
`GET /api/tickets/catalog` — the price Stripe charges — said €250. A green
build, green lint and green screenshots all agreed, because nothing compared
them.

`src/scripts/oddference-tickets.ts` now re-reads price, sale state, benefits
and CTA for each ticket card from the catalog at runtime, keyed by the
`syncSlug` field on the content's ticket tiers (`content.config.ts`'s
`pricingTier`). Membership's tiers have no catalog behind them and omit it.

It is progressive enhancement on purpose. The server-rendered card already
carries a truthful price and status, so a blocked fetch, an offline visitor or
a crawler sees a complete, honest ticket section rather than a spinner; the
script only ever corrects it. Nothing here reaches checkout — price, inventory
and sale phase are still resolved authoritatively by the Worker and D1, and
the browser is never trusted with a total (see the ticketing section of
`AGENTS.md`).

`tests/functional/oddference-tickets.spec.ts` drives it against a mocked
catalog — live values, the active→upcoming boundary, sold-out, an unreachable
backend — plus one live check that the build-time fallback still agrees with
the real catalog, which annotates and skips rather than failing when the
backend is unreachable.

## Visual regression

`tests/visual/pages.spec.ts` screenshots all 11 routes at 5 viewports
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
production build through 2026-08-19 and is preserved as historical/provenance
reference for this migration (see CLAUDE.md's "What this is") — not a
design-parity requirement for changes made since. Its own files/repo are
untouched by this project, but **its `npx surge .` deploy path is no longer
what serves odd-field-guide.surge.sh** — cutover happened 2026-08-20; running
that command again would revert that domain back to the old site, so don't.
Since the 2026-09-03 domain migration the canonical production host is
`allthingsodd.co`; odd-field-guide.surge.sh is still published with the same
build, which is precisely why running the old command remains dangerous. See
[deployment.md](deployment.md) for the current deploy path and
[deployment.md#domain-migration](deployment.md#domain-migration) for the
cutover.
