# ODD Field Guide — project constitution

Read this before making changes. It's the load-bearing context for how this repo
is meant to be worked on — not generic Astro advice (that's linked at the bottom).

## What this is

The production rebuild of the ODD website — "Signal & Ember / Field Guide 005," a
co-creation platform site for New Nordic Way rf (ODDfest, ODDference, ODDspace,
Work with ODD). Migrated 2026-08-19 from a single 13MB hand-authored static
`index.html` (see `../ODD NEW WEBPAGE/` — no longer deployed as of 2026-08-20,
but kept as the visual reference) into
Astro + structured content + CloudCannon, without losing any of the original's
visual identity, motion, or interaction design. That original file is the source
of truth for "does this still look/feel right" — when in doubt, compare against it,
not against a generic Astro sensibility.

**Do not repeat the WordPress detour.** An earlier session built a _different_
site on Next.js + headless WordPress, wired to the wrong app entirely, and it was
scrapped. WordPress is not part of this stack. CloudCannon is the CMS.

**V2 (2026-08-20 → present) rebuilt the site's architecture and content
scaffold** — not a redesign, the visual identity above is unchanged — around
what ODD is actually becoming: ODDfest as a distributed/open Creative Week
platform (not a centrally booked festival), ODDference as a flagship event
built on "what can business learn from creative expertise," and a new **Work
with ODD** B2B gateway covering ODDference/Membership/Agency/Partnerships so
those don't compete for one nav slot. See `docs/architecture.md#v2` for the
full reasoning and `docs/editing.md` for what's now editable. Most page
content is intentionally still `[PLACEHOLDER — ...]` text, not final copy —
see the V2 delivery report for the page-by-page list of what still needs
real content.

## Architecture

```
GitHub (canonical repo, version history)
  → Astro (production frontend, static output)
  → CloudCannon (edits src/content/**/*.json through the git history)
```

- **Content** lives in `src/content/pages/*.json` (9 fixed pages: home, oddfest,
  oddference, oddagency, work-with-odd, membership, about, media, contact) and
  `src/content/site/global.json` (nav, footer, social, partner/press logos —
  shared across every page). Schema: `src/content.config.ts`.
- **Design system** lives in `src/styles/` — `tokens.css` (color/type/space/motion
  tokens, all with provenance comments — read them before adding a value),
  `typography.css`, `layout.css`, `motion.css`.
- **Components** follow `src/components/{primitives,navigation,media,sections}/`.
  Primitives are dumb and reusable (Logo, Pill, SocialIcon). Sections are
  page-specific composition (Hero, Converge, SubpageRail, AboutPanels, …).
- **Client-side interaction** (mosaic Ken Burns, custom cursor, filmstrip drift,
  magnetic buttons) lives in `src/scripts/*.ts` as small
  vanilla-JS modules, each imported via a `<script src="...">` tag from the
  component that needs it. No framework, no bundler abstraction beyond what
  Astro/Vite already does.
- **Why not a generic page composer:** this is a small bespoke brand site where
  most pages' layouts are genuinely different (home ≠ subpage ≠ about). A
  CloudCannon "drag-and-drop sections" composer would be over-engineering for
  content that doesn't actually recombine — though several section components
  (`FeatureGrid`, `ProgramGrid`, `ParticipateBand`, `SectionIntro`, `CaseGrid`,
  …) are deliberately reused across many pages where the content really is the
  same shape. See `docs/architecture.md`.

## Design-system rules

1. **Tokens first.** A color, font size, spacing value, or easing curve that
   isn't already a token in `src/styles/tokens.css` needs a reason to exist as a
   new one-off — check there before writing a raw value.
2. **Reuse before inventing.** A new card/button/section that looks like an
   existing one should extend that component, not fork a near-duplicate.
3. **Component hierarchy:** tokens → primitives → sections → pages. Pages
   compose sections; sections compose primitives; nothing skips a layer.
4. **Motion respects `prefers-reduced-motion`, always.** Every animation in this
   codebase (CSS `@keyframes`, JS `requestAnimationFrame` loop, or autoplay
   video) has a reduced-motion branch. See `src/scripts/reduced-motion-video.ts`
   for the pattern used for video specifically — swap to a static poster
   `<img>` entirely, don't just pause in place (leaves a decode-timing race).

## CMS rules

- Content lives in `src/content/`, presentation lives in `src/components/` —
  never hardcode real editorial copy into a `.astro` file's markup.
- `cloudcannon.config.yml` is the editing contract. If you add a new content
  field that a real ODD editor would plausibly want to change, add it there too
  (see `docs/editing.md`). If it's implementation detail (CSS classes, layout
  variants, technical config), it stays out of CloudCannon on purpose — see
  `docs/design-system.md` and cloudcannon.config.yml's own comments on why raw
  CSS values are never exposed to editors.
- The `pages` collection's five files are fixed (`disable_add: true` in
  cloudcannon.config.yml) — the routes in `src/pages/*.astro` depend on those
  exact filenames.

## Development rules

- **Inspect before modifying.** This codebase came from a careful line-by-line
  migration of the original hand-authored site — read the component/script
  you're touching fully before changing it, the reasoning is usually in a
  comment.
- **Reuse before inventing.** Check `src/components/primitives/` and
  `src/styles/` before writing new CSS or a new component from scratch.
- Minimal dependencies, minimal client JS, semantic HTML, no framework beyond
  Astro unless an interaction genuinely requires client-side state a vanilla
  script can't reasonably provide.

## Performance & accessibility requirements

- Core Web Vitals targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- All images go through `astro:assets` (`<Image>` / `getImage()`), never a raw
  `<img src="/something.jpg">` for content that lives in `src/assets/`.
- Every interactive element needs a visible focus state and a real accessible
  name — check `src/styles/global.css`'s `:focus-visible` rules aren't being
  overridden.
- `prefers-reduced-motion` is not optional — see Design-system rules above.

## Testing requirements

- `npm run check` (Astro + TypeScript), `npm run lint` (ESLint), and
  `npm run build` must all pass before considering a change done.
- `npm test` runs the full Playwright suite against a running preview server
  (`npm run preview` first — see `docs/deployment.md#local-preview`, this
  project's dev/preview servers are managed background daemons, not
  foreground processes, so Playwright doesn't own their lifecycle). Two
  suites, eight browser projects total:
  - `tests/visual/pages.spec.ts` — full-page screenshot regression + a
    per-route console-error check, one engine per breakpoint (mobile →
    wide). A layout/structure change that intentionally changes a page's
    appearance needs `npm run test:update-snapshots` and the new screenshots
    committed alongside it — see `docs/architecture.md#visual-regression`.
  - `tests/functional/interactions.spec.ts` — real interaction QA (nav
    clicks, mobile menu open/close/Escape, external-link attributes, 404
    routing) run across chromium, firefox, _and_ webkit — see
    `playwright.config.ts`'s `functional-*` projects. This is what actually
    catches a cross-browser interaction bug; the visual suite alone can't.

## Deployment workflow

See `docs/deployment.md`. Short version: GitHub is canonical, CI
(`.github/workflows/ci.yml`) gates `main`, and CloudCannon commits content
changes back into the same repo. **This build is live** at
`odd-field-guide.surge.sh` (cut over 2026-08-20) — the old single-file
site's own deploy path is no longer what's serving that domain.

**Corrected 2026-08-21:** deploy is CI-automated, not manual — the `deploy`
job in `.github/workflows/ci.yml` runs `npx surge dist
odd-field-guide.surge.sh` automatically on every push to `main` that passes
`checks`/`functional` (this is what makes a CloudCannon content commit go
live with no one running a manual command). A prior version of this file
said deploys were manual; that was stale. Treat any push to `main` as a real
production action — it deploys automatically, there's no separate manual
step to forget.

**Cloudflare migration in progress** (`ops/DECISIONS.md` D1): production
hosting is moving from Surge to a single Cloudflare Worker (Workers Static
Assets serving Astro's build + `/api/*` routes for the two Growth OS forms).
Astro itself is not changing — still a static build, no adapter. See
`wrangler.toml` and `worker/`. Until that migration's acceptance criteria
pass (`ops/DECISIONS.md` D1's step list), **Surge remains production** —
don't point DNS or the CI `deploy` job at Cloudflare yet.

## Definition of done

A change is done when: `npm run check`, `npm run lint`, `npm run build`, and
`npm test` all pass; new/changed editorial content is in `src/content/`, not
hardcoded; new CMS-relevant fields are reflected in `cloudcannon.config.yml`;
and the visual result has been compared against the original
`../ODD NEW WEBPAGE/index.html` (or the current live site) for parity, not just
"looks fine in isolation."

## Development server

This project's `astro dev`/`astro preview` run as managed background daemons on
this machine, not foreground processes:

```
astro dev --background
```

Manage with `astro dev stop`, `astro dev status`, `astro dev logs` (same
pattern for `astro preview`).

## ODD Growth OS (commercial systems, separate from the website build above)

Everything above this section is about the Astro/CloudCannon website itself.
This section is about the commercial operating system ODD is layering on top
of it — CRM, newsletter, Notion, analytics — tracked in `ops/` and
`schemas/`, not in `docs/` (that prefix stays reserved for the website).
Full spec: `ops/GROWTH_OS_GUIDE.md`. Live status:
`ops/SETUP_STATUS.md` — read it before doing any Growth OS work, it has the
current real state, not the guide's assumed state.

- **Source-of-truth boundaries:** Google = identity/email/calendar; Notion =
  human strategy/SOPs/projects; GitHub = code + canonical schemas
  (`schemas/*.yml`); Attio = B2B/B2G people/companies/deals; beehiiv =
  editorial subscribers; ticketing (Tiketti/Venga) = transactions; GA4/Search
  Console = web measurement. Never build a second authoritative copy of the
  same data in another system.
- **MCP is the control plane, not the data plane.** Claude may use MCP to
  search/analyze/summarize/prepare drafts/update approved fields
  interactively. Deterministic production data movement (a website form
  reaching a CRM) must go through real server code, never through an LLM
  deciding what record to create.
- **No new SaaS without a documented reason.** Don't add HubSpot, Brevo,
  Mailchimp, Make/Zapier/n8n, Airtable, or similar just because a workflow
  would be one step shorter — see guide §60 for the required justification
  format.
- **This repo's production is Surge, not Cloudflare** — static Astro build,
  auto-deployed on push to `main` (see Deployment workflow above). The Growth
  OS guide assumes Cloudflare Workers/Pages as the server runtime for
  form → CRM/newsletter integrations; that assumption does not hold here yet.
  Do not add Cloudflare-dependent code until `ops/SETUP_STATUS.md` shows
  Decision D1 resolved.
- **No autonomous strategic outreach.** Claude may draft partner/sales
  emails and CRM next-actions; a human sends them. Never send, never change
  deal value/consent fields from inference, never bulk-delete CRM records.
- **No destructive production actions without explicit approval** —
  this includes DNS changes, deploying to `main` (which auto-publishes to
  the live site), and any Attio/beehiiv write beyond a clearly-labeled TEST
  record.

## Further reading

- `README.md` — install/run instructions
- `docs/architecture.md` — how the system fits together, in more depth
- `docs/design-system.md` — the token/component rules, with the reasoning
- `docs/editing.md` — what a non-developer can do in CloudCannon
- `docs/deployment.md` — how a change reaches production
- Astro docs: https://docs.astro.build
  ([routing](https://docs.astro.build/en/guides/routing/),
  [content collections](https://docs.astro.build/en/guides/content-collections/),
  [astro:assets](https://docs.astro.build/en/guides/images/))
- CloudCannon docs: https://cloudcannon.com/documentation/
