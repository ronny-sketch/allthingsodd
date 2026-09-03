# ODD Field Guide — project constitution

```
THIS REPOSITORY IS THE ODD PUBLIC WEBSITE.

Do not implement CRM systems, marketing automation,
cross-system integrations, commercial schemas or Growth OS
infrastructure here.

If a request requires Growth OS work:
1. identify that it belongs to ../odd-growth-os;
2. do not start implementing it in this repository;
3. tell the user the work belongs to Growth OS;
4. switch project/repository before implementation.

Website integrations must stop at a documented API boundary — see
"Growth OS integration" below.
```

Read this before making changes. It's the load-bearing context for how this repo
is meant to be worked on — not generic Astro advice (that's linked at the bottom).

## What this is

The production rebuild of the ODD website — "Signal & Ember / Field Guide 005," a
co-creation platform site for New Nordic Way rf (ODDfest, ODDference, ODDspace,
Work with ODD). Migrated 2026-08-19 from a single 13MB hand-authored static
`index.html` (see `../ODD NEW WEBPAGE/` — no longer deployed as of 2026-08-20,
kept only as historical reference) into
Astro + structured content + CloudCannon, without losing the original's visual
identity, motion, or interaction design at migration time.

**The site has kept evolving since — deliberately.** Preserve the current
approved ODD design system (`src/styles/`, `docs/design-system.md`) and
intentional design decisions as they stand today; the old hand-authored file
is historical/provenance reference for _why_ something looks the way it does,
not an unconditional visual-parity requirement. A later, deliberate redesign
(a new homepage section, a page flipped to a light theme, a component
reworked) is not a regression to "fix" back toward the old file — when in
doubt, compare against the current live site and this repo's own commit
history, not against the pre-migration single-file build.

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
full reasoning and `docs/editing.md` for what's now editable. Page content
is real, launch-ready copy across every page as of the editorial pass
following V2 — check `src/content/pages/*.json` directly for the current
state of any given field, not this file, if in doubt.

## Architecture

```
GitHub (canonical repo, version history)
  → Astro (production frontend, static output)
  → CloudCannon (edits src/content/**/*.json through the git history)
```

- **Content** lives in `src/content/pages/*.json` (10 fixed pages: home,
  oddfest, oddference, oddagency, oddspace, work-with-odd, membership, about,
  media, contact) and
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
   video) has a reduced-motion branch. For video that's
   `src/scripts/autoplay-video.ts`: the poster `<img>` is a real, permanent
   sibling layer and the `<video>` only fades in over it once playback is
   _confirmed_, so reduced motion simply never starts the video (and never
   downloads it) rather than swapping DOM around. It replaced
   `reduced-motion-video.ts` in the 2026-09-02 mobile pass.
5. **An animation may never be the only thing making content visible.**
   `.reveal`'s hidden state is scoped to `html.reveal-js`, which
   `src/scripts/reveal.ts` adds itself — so a script error, a blocked bundle
   or an old browser renders plain visible content instead of a blank page.
   Any new entrance animation follows the same convention: gate the _hidden_
   half on `:global(html.reveal-js)`, and gate the `.in` half too so the
   relative specificity still resolves. See `src/styles/motion.css`.

## CMS rules

- Content lives in `src/content/`, presentation lives in `src/components/` —
  never hardcode real editorial copy into a `.astro` file's markup.
- `cloudcannon.config.yml` is the editing contract. If you add a new content
  field that a real ODD editor would plausibly want to change, add it there too
  (see `docs/editing.md`). If it's implementation detail (CSS classes, layout
  variants, technical config), it stays out of CloudCannon on purpose — see
  `docs/design-system.md` and cloudcannon.config.yml's own comments on why raw
  CSS values are never exposed to editors.
- The `pages` collection's ten files are fixed (`disable_add: true` in
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
  suites, twelve browser projects total:
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
  - `tests/mobile/*.spec.ts` — mobile QA **with motion enabled**, on
    Chromium and WebKit (`mobile-motion-*` projects). Added 2026-09-02
    because every other project inherits this config's global
    `reducedMotion: 'reduce'`, under which motion.css keeps all `.reveal`
    content visible unconditionally — so no existing test could see a
    reveal, video or touch defect at all. Covers: nothing left invisible
    after a real-speed scroll, tall reveal targets, per-route/per-width
    overflow with the offending element named, the video lifecycle
    (poster-before-playback, refused autoplay, failed fetch, offscreen
    pause), mobile nav, 44px touch targets.
  - `tests/mobile-reduced/*.spec.ts` — the other half of the same contract
    (`mobile-reduced-*` projects): reduced motion suppresses motion and
    never content, and no video is even requested.

  **Known gap, not yet fixed:** `reducedMotion` declared on a project's
  `use` block does not reach the browser in this Playwright/engine
  combination — verified directly. The visual suite's screenshots are
  therefore captured with motion running despite this config asking for
  `reduce`, and `tests/mobile-reduced` has to call
  `page.emulateMedia({ reducedMotion: 'reduce' })` itself (it asserts the
  preference really applied before testing anything else). Relatedly, the
  visual suite is currently flaky on pages carrying WarpingText: an
  unmodified `origin/main` failed 10 of its own committed baselines on the
  same machine that failed 8 with this branch, with the failing set moving
  between runs. Treat a visual diff on those pages as unproven until it
  reproduces.

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

**Hosting migration status** (full history: `../odd-growth-os/ops/DECISIONS.md`
D1/D13): production is still Surge. A Cloudflare cutover was explored while
Growth OS's Worker lived in this repo; as of the 2026-08-28 repo split that
Worker moved to `../odd-growth-os` and now deploys independently, reached
via `/api/*` (see "Growth OS integration" below). This repo no longer
contains any Cloudflare/Worker code or config — Astro is a plain static
build deploying to Surge. If a future DNS/hosting cutover changes how this
repo's own build is served, that decision and its config belong here; the
Growth OS side of it belongs in `../odd-growth-os`.

## Definition of done

A change is done when: `npm run check`, `npm run lint`, `npm run build`, and
`npm test` all pass; new/changed editorial content is in `src/content/`, not
hardcoded; new CMS-relevant fields are reflected in `cloudcannon.config.yml`;
and the visual result has been checked against the current live site — not
just "looks fine in isolation," and not against the old pre-migration file
(see "What this is" above on why that's provenance reference, not a
parity requirement).

## Development server

This project's `astro dev`/`astro preview` run as managed background daemons on
this machine, not foreground processes:

```
astro dev --background
```

Manage with `astro dev stop`, `astro dev status`, `astro dev logs` (same
pattern for `astro preview`).

## Growth OS integration (the API boundary — read before touching the two forms)

**Corrected 2026-09-01:** the newsletter/business-enquiry forms were the
entire contract until the 2026-08-31 ticketing pass added a second, larger
surface — `src/scripts/tickets/*.ts` (catalog fetch, checkout, order-status
polling, attendee assignment on `/tickets`, `/tickets/checkout`,
`/tickets/confirmation`) calling `../odd-growth-os/worker/src/tickets/*`'s
`/api/tickets/*` routes: `GET /api/tickets/catalog`,
`POST /api/tickets/checkout`, `GET /api/tickets/order/:id/status`, and the
attendee-assignment/check-in routes documented in
`../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md`. Same boundary
discipline as the two forms below: this repo only ever calls those routes
by URL/shape, never imports Growth OS code, and the backend (D1, Stripe,
webhook verification, inventory) lives entirely in `../odd-growth-os`.

The original two forms remain the simpler half of the same contract —
`src/components/sections/WorkEnquiryForm.astro` (via
`src/scripts/work-enquiry-form.ts`) POSTs to `/api/business-enquiry`, and
the newsletter form POSTs to `/api/newsletter`. Neither of those two files
imports any Growth OS code, and neither should ever start to — the same
now applies to every file under `src/scripts/tickets/`.

**Corrected 2026-08-28:** these are cross-origin `fetch()` calls to the
Worker's own `workers.dev` URL, not same-origin relative paths. Production
here is Surge, which has no Cloudflare zone in front of it, so a same-origin
Cloudflare Route was never actually possible until a real DNS cutover
happens — the relative-path version deployed to production 404'd on every
submission (confirmed live 2026-08-28; see `../odd-growth-os/ops/DECISIONS.md`
for the fix). Both scripts now import the target URL from
`src/scripts/api-base.ts` — that's the one file to change at DNS cutover
time (back to `''`, i.e. relative), alongside adding the Worker's
`[[routes]]` entry in `../odd-growth-os/wrangler.toml`.

As of the 2026-08-28 repo split, `/api/*` is served by an independent
Cloudflare Worker living in `../odd-growth-os` (not by this repo) — see
that repo's `AGENTS.md`/`ops/ARCHITECTURE.md` for how it works. This repo
does not know or care what's on the other side of that boundary; it only
needs the request/response shape (field names, success/error JSON) to keep
matching what `../odd-growth-os/worker/src/validate.ts` expects.

**The one real cross-repo coupling to know about:**
`WorkEnquiryForm.astro`'s hardcoded `PRODUCTS` array (UI copy, kept out of
CloudCannon per the CMS rules above) must match
`../odd-growth-os/schemas/products.yml`'s enum by hand — there's no shared
package or codegen yet (a deliberate scope decision at split time). If you
change one, check the other. Same applies, with smaller blast radius, to
any `?interest=` deep-link value in `src/content/pages/*.json` — it must be
a value `products.yml` actually defines.

**If a request needs anything beyond that boundary** — a new CRM field, a
new integration, adapter/schema changes, Growth OS operational docs — it
belongs in `../odd-growth-os`, not here. Don't start implementing it in
this repo; tell the user it belongs to Growth OS and stop.

## Ticketing architecture

Added 2026-08-31 (`ops/TICKETING_IMPLEMENTATION_PLAN.md` in
`../odd-growth-os` is the authoritative build record; this section is the
short version a future agent needs before touching `/tickets/*`):

```
/tickets, /tickets/checkout, /tickets/confirmation (this repo, static)
  → fetch() → ../odd-growth-os Worker's /api/tickets/* routes
      → D1 (TICKETS_DB: events, ticket_types, orders, tickets, attendees)
      → Stripe Checkout Sessions, ui_mode: 'embedded' (embedded_page)
          → Stripe-signed webhook → Worker verifies + marks the order paid
              (the *only* path that ever issues tickets — the confirmation
              page polls order status, it never trusts Stripe's redirect
              alone)
```

- **Stripe.js/API mode is fixed, not a free choice**: `stripe.js` is loaded
  from `https://js.stripe.com/dahlia/stripe.js` (see
  `src/scripts/tickets/config.ts`'s `STRIPE_JS_URL`) and mounted via
  `stripe.createEmbeddedCheckoutPage(...)` (see
  `src/scripts/tickets/stripe-loader.ts`) — the vanilla-JS "full embedded
  page" API for `ui_mode: 'embedded'`/`'embedded_page'` Checkout Sessions,
  confirmed against Stripe's own docs at build time (2026-08-31). Do not
  "correct" this to a redirect/hosted Checkout flow or to Stripe Elements —
  those are different UI modes with a different client-side API and would
  desync from what the backend actually creates
  (`../odd-growth-os/worker/src/tickets/stripe.ts`). If either side is ever
  changed, change both together and re-verify against Stripe's current
  docs, not from memory.
- **Publishable key**: `src/scripts/tickets/config.ts`'s
  `STRIPE_PUBLISHABLE_KEY` ships `null` (same inert-until-configured
  pattern as `analytics-config.ts`) — `/tickets/checkout` shows an honest
  "payment isn't connected yet" state instead of a broken Stripe.js call.
  Setting a real `pk_test_...`/`pk_live_...` here is safe (publishable
  keys are meant to be browser-visible); it must point at the same Stripe
  account/mode as the Worker's `STRIPE_SECRET_KEY`.
- **The frontend is presentation and intent only** — price, currency,
  inventory, ticket status and sale-phase are resolved authoritatively by
  the Worker/D1, never trusted from the browser. This repo's job stops at
  catalog display, cart UX, buyer input, mounting the embedded Checkout,
  and rendering whatever the Worker's order-status/confirmation responses
  say.
- **Stripe secrets never enter this repo.** `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` / `TICKET_SIGNING_SECRET` /
  `CHECKIN_API_KEY` live only as Worker secrets in `../odd-growth-os`
  (`wrangler secret put`, never `.dev.vars` beyond local test-mode values,
  never this repo). See that repo's `ops/TICKETING_IMPLEMENTATION_PLAN.md`
  "Launch checklist" before ever pointing this at live-mode keys.

## Analytics (GA4)

Added 2026-08-28. **Corrected 2026-09-01: live, not a placeholder** —
`src/scripts/analytics-config.ts`'s `GA_MEASUREMENT_ID` is a real property
(`G-9Q90CQMBK8`, stream "ODDpage") as of the 2026-08-29 Growth OS
activation (`../odd-growth-os/ops/DECISIONS.md` D17/D20); this file
previously said it shipped `null` until a property existed, which is no
longer true. The "ships inert until configured" pattern it describes is
still the real mechanism (a `null` ID keeps the consent banner and
gtag.js request fully off) — it's just no longer the _current_ state.
`src/components/navigation/ConsentBanner.astro` gates everything on an
explicit Accept/Reject (GDPR/ePrivacy applies — ODD is a Finnish
association, GA4 cookies aren't "strictly necessary" — see that file's
header comment for why this is a simpler "don't request gtag.js until
accepted" pattern rather than Google's Consent Mode default-denied one).
`src/scripts/analytics.ts` exports `trackEvent()`, called from
`work-enquiry-form.ts`/`newsletter-form.ts`/`src/scripts/tickets/*.ts` on a
real successful submission/funnel event — a safe no-op whenever consent
hasn't been granted. A future rotation to a different property is still a
one-file change in `analytics-config.ts`, same mechanism as before.

## Scope-creep guardrail

Before implementing a newly discovered requirement, classify it:

```
A. same task + same system (website)   → continue
B. prerequisite inside this system     → continue only if required
C. related but independent task        → record as a follow-up, don't derail
D. belongs to ../odd-growth-os         → stop here, route to that repo
```

Never implement a new independent system simply because it was discovered
while implementing a website feature.

## Git workflow rules

1. One branch = one coherent objective.
2. Never use a website branch to develop Growth OS, or vice versa.
3. Never mix unrelated dirty work.
4. Run `git status` before starting a task; if unrelated modifications
   exist, stop and classify them before continuing.
5. Don't silently stash unrelated work and continue.
6. Never deploy from a dirty tree.
7. Prefer PR → main for production changes — a push to `main` auto-deploys,
   see Deployment workflow above.

## Doctrine

- **No autonomous strategic outreach.** Claude may draft partner/sales
  copy; a human sends it. This repo has no CRM writes of its own (see
  "Growth OS integration" above) — that rule lives fully in
  `../odd-growth-os/CLAUDE.md` now, this is the website-side echo of it.
- **No destructive production actions without explicit approval** — this
  includes DNS changes and deploying to `main` (which auto-publishes to
  the live site, see Deployment workflow above).
- The broader source-of-truth/MCP-control-plane/no-new-SaaS doctrine that
  used to live here pre-split now lives in `../odd-growth-os/CLAUDE.md`,
  where the systems it governs (Attio, beehiiv, Notion) actually live.

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
