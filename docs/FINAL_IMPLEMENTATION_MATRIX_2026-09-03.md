# Final integration matrix — ODD Website Copywriting Master (2 September 2026)

**Pass:** 2026-09-03/04 final integration, editorial, UX, QA and production pass
**Branch:** `final-field-guide-integration-pass`
**Starting SHA:** `3a656fe7af9338d418787bfeec51b2475cdefb85` (merge of PR #19)
**Master's reviewed SHA:** `d6f4c88c434c920fcae4f3f66bb91057de53e28d`

Every row of the copywriting master's requirement index is accounted for below.
Status vocabulary is the one the task defines; there are no blank rows and no
"probably done".

Evidence columns mean:

- **Rendered** — checked against built HTML in `dist/` or a real browser at
  `http://localhost:4322`, not against the JSON that feeds it.
- **Automated** — the Playwright test that will fail if it regresses. `visual`
  is `tests/visual/pages.spec.ts`; `integrity` is
  `tests/functional/site-integrity.spec.ts`; `editorial`, `tickets` and
  `instagram` are the three suites added by this pass.

---

## What was actually wrong on `main` before this pass

Five defects were live on production, all of them invisible to a green build:

1. **ODDference advertised a price the storefront does not charge.** The page
   said Blind Bird `€300`; `GET /api/tickets/catalog` — the price Stripe
   charges — says `€250`. Commit `f2d3b9e` had "fixed" the page _to_ €300 in
   the copywriting pass, moving it away from the backend rather than towards
   it. Nothing compared the two, so nothing caught it.
2. **The homepage told the story in the wrong order.** The "Work with ODD"
   band rendered directly under the three product cards — the position the
   master explicitly reserves for after proof, audience routing and current
   activity — where a quiet band still reads as a fourth product.
3. **The participation band still said "The way in is by participation."** The
   master rewrote that exact line to "The way in is by doing." It survived the
   whole copywriting pass because it was the one piece of editorial copy
   hardcoded in `index.astro` instead of living in content.
4. **ODDspace answered an accessibility question with reassurance.** "Get in
   touch before you come and we'll make sure it works" is precisely what the
   master says must not be published in place of facts.
5. **The footer named the wrong site.** A bare `oddfest.co` link sat in the
   legal row beside "Privacy & cookies", where a bare domain reads as this
   site's own identity — on `allthingsodd.co`, after the cutover.

Plus the two performance limitations PR #19 recorded and could not place. Both
are now attributed and fixed; see [Performance](#performance).

---

## Global / shared language

| ID  | Source section          | Action         | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------- | -------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Primary navigation      | KEEP           | `DONE — VERIFIED` | Unchanged in `site/global.json`; rendered nav matches. Automated: `integrity`, `interactions`                                                                                                                                                                                                                                                                                                                                                                        |
| 2   | Footer contact line     | REWRITE        | `DONE — VERIFIED` | "Get in touch" / `hello@oddfest.co`, already correct at start of pass. Rendered in every page footer                                                                                                                                                                                                                                                                                                                                                                 |
| 3   | Footer legal / location | HUMAN DECISION | `DONE — VERIFIED` | `footerAddress` was already the master's "New Nordic Way rf · Helsinki". **Fixed here:** `footerTag` (the mobile-menu tag line) still read "New Nordic Way rf · oddfest.co", and the footer legal row still carried a hardcoded `oddfest.co` link — both removed. The association's canonical postal address remains deliberately unpublished, as the master requires. Automated: `editorial` ("nothing user-facing still advertises the retired production domain") |
| 4   | Newsletter popup        | REWRITE        | `DONE — VERIFIED` | "Occasional emails, when there is something worth sending." No "no spam" anywhere in the repo or rendered site (grep, both)                                                                                                                                                                                                                                                                                                                                          |

## Home

| ID  | Source section               | Action                 | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------- | ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | SEO                          | REWRITE                | `DONE — VERIFIED` | `<title>`/description match the master verbatim; canonical `https://allthingsodd.co/`                                                                                                                                                                                                                                                                                                                                                                                             |
| 6   | Hero                         | REWRITE                | `DONE — VERIFIED` | Rendered `<h1>`; CTA "See what we do"                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7   | Why ODD                      | REWRITE                | `DONE — VERIFIED` | Eyebrow/headline/body verbatim                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 8   | Three main products          | MOVE + REWRITE         | `DONE — VERIFIED` | Rendered source order: Why ODD → What we do. Automated: `editorial` (order assertion)                                                                                                                                                                                                                                                                                                                                                                                             |
| 9   | Proof / what is already real | NEW SECTION            | `DONE — VERIFIED` | "Already in motion" renders after the products, before audience routing, with the verified 2025 metrics and the Impact Report link                                                                                                                                                                                                                                                                                                                                                |
| 10  | Two ways in                  | REWRITE                | `DONE — VERIFIED` | Both doors, both CTAs, rendered after proof                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 11  | What's happening             | KEEP WITH LIVE CONTENT | `DONE — VERIFIED` | **Fixed here.** The section was unconditionally commented out in `index.astro` — which is not the same as the master's "keep this only if the list is genuinely maintained", because a hardcoded `off` stays off after the list _is_ maintained. Rendering is now gated on `whatsHappening.items.length`, so it appears exactly while there is content and disappears when an editor empties it. One real item (the weekly ODDspace "Coffee on the House") is live, so it renders |
| 12  | Work with ODD band           | REWRITE                | `DONE — VERIFIED` | Copy verbatim. **MOVEd** from under the product grid to after "What's happening", per the master's flow. Automated: `editorial`                                                                                                                                                                                                                                                                                                                                                   |
| 13  | Participation band           | REWRITE                | `DONE — VERIFIED` | **Fixed here.** "The way in is by doing." Moved out of `index.astro` into `index.json` as `participateTitle` (+ CloudCannon input), so the next copy pass can reach it. Automated: `editorial` (both the new wording and the absence of the old one)                                                                                                                                                                                                                              |

## About

| ID  | Source section           | Action             | Status                           | Evidence                                                                                                                                                                                                               |
| --- | ------------------------ | ------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | SEO                      | REWRITE            | `DONE — VERIFIED`                | Verbatim                                                                                                                                                                                                               |
| 15  | Hero / thesis            | REWRITE            | `DONE — VERIFIED`                | Rendered                                                                                                                                                                                                               |
| 16  | Core argument            | REWRITE            | `DONE — VERIFIED`                | All five paragraphs verbatim                                                                                                                                                                                           |
| 17  | Why now                  | NEW SECTION        | `DONE — VERIFIED`                | Renders after the argument. The Finnish creative-economy sentence is present without a source link — the master says "if the policy reference is kept, link to a credible public source"; see [Blockers](#blockers) B6 |
| 18  | Why these forms of work  | REWRITE            | `DONE — VERIFIED`                | "What we build" + three numbered pillars                                                                                                                                                                               |
| 19  | What 2025–2026 taught us | NEW SECTION        | `DONE — VERIFIED`                | All five items including the Showcase-economics lesson, in its permitted retrospective framing                                                                                                                         |
| 20  | Our story / timeline     | REWRITE            | `DONE — VERIFIED`                | Five milestones verbatim                                                                                                                                                                                               |
| 21  | Ways of working          | KEEP + TIGHTEN     | `DONE — VERIFIED`                | Five principles verbatim                                                                                                                                                                                               |
| 22  | Impact proof             | KEEP / VERIFY 2026 | `BLOCKED — NEEDS FACT / CONTENT` | 2025 renders in full. 2026 renders as a subordinate note, not an empty proof grid, exactly as the master requires. Verified 2026 figures are the missing input — Blocker B1                                            |
| 23  | Continue from About      | KEEP               | `DONE — VERIFIED`                | Five destinations, labels verbatim                                                                                                                                                                                     |

## ODDfest

| ID  | Source section                                   | Action                      | Status                           | Evidence                                                                                                                                                    |
| --- | ------------------------------------------------ | --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 24  | SEO                                              | REWRITE                     | `DONE — VERIFIED`                | Verbatim                                                                                                                                                    |
| 25  | Hero                                             | REWRITE                     | `DONE — VERIFIED`                | Title/sub/meta split as specified                                                                                                                           |
| 26  | What ODDfest is                                  | REWRITE                     | `DONE — VERIFIED`                | Verbatim; no registration CTA in this section                                                                                                               |
| 27  | You make the event / ODD builds the shared layer | NEW SECTION                 | `DONE — VERIFIED`                | Host / ODD / shared-platform split + closing line, rendered after "What ODDfest is"                                                                         |
| 28  | How it works                                     | REWRITE                     | `DONE — VERIFIED`                | Four steps verbatim                                                                                                                                         |
| 29  | Register                                         | REWRITE                     | `DONE — VERIFIED`                | Renders immediately after How it works; "we'll take it from there" absent from the whole repo (grep)                                                        |
| 30  | 2026 examples                                    | NEW SECTION / NEEDS CONTENT | `BLOCKED — NEEDS FACT / CONTENT` | Section correctly hidden — `examples: []`, nothing invented. Blocker B2                                                                                     |
| 31  | FAQ                                              | KEEP + TIGHTEN              | `DONE — VERIFIED`                | All twelve answers verbatim, including the honest interim commercial-terms answer. The host participation/revenue model stays a human decision — Blocker B3 |

## ODDference

| ID    | Source section                             | Action               | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | ------------------------------------------ | -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 32    | SEO                                        | REWRITE              | `DONE — VERIFIED` | No price in the meta description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 33    | Hero                                       | REWRITE              | `DONE — VERIFIED` | Question as headline, support line carrying learning + business value, "Get your ticket" primary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 34    | Creative expertise is more than creativity | NEW SECTION          | `DONE — VERIFIED` | Editorial treatment, not a card grid                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 35–37 | Reasons 01–03                              | REWRITE              | `DONE — VERIFIED` | Eyebrows/headlines/bodies verbatim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 38    | Who it's for                               | REWRITE              | `DONE — VERIFIED` | Six audiences including the explicit business-development row, as a typographic list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 39    | Past speakers / proof                      | KEEP                 | `DONE — VERIFIED` | Ten verified names under a "Past speakers · ODDference 2026" label                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 40    | What changes in 2027                       | REWRITE              | `DONE — VERIFIED` | Verbatim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 41    | Ticket tiers                               | KEEP / BACKEND-OWNED | `DONE — VERIFIED` | **The substantive fix of this pass.** The static €300 is corrected to the catalog's €250, the invented sale-window date strings are gone, and the page now _derives_ price, sale state, benefits and CTA from `GET /api/tickets/catalog` at runtime (`src/scripts/oddference-tickets.ts`) rather than restating them. The build-time values remain as an honest crawlable/offline fallback. Automated: `tickets` — five specs covering the live values, the active→upcoming boundary, sold-out, an unreachable backend, and a live check that the fallback still agrees with the real catalog |
| 42    | Partnership CTA                            | REWRITE              | `DONE — VERIFIED` | Verbatim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## ODDspace

| ID  | Source section                      | Action                    | Status                                                                                            | Evidence                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 43  | SEO                                 | REWRITE                   | `DONE — VERIFIED`                                                                                 | Disputed m² and member counts absent                                                                                                                                                                                                                                                                                                     |
| 44  | Hero                                | KEEP                      | `DONE — VERIFIED`                                                                                 | Unchanged, as instructed                                                                                                                                                                                                                                                                                                                 |
| 45  | What is ODDspace                    | REWRITE                   | `DONE — VERIFIED`                                                                                 | "Co-creative" defined in plain language; no disputed figures                                                                                                                                                                                                                                                                             |
| 46  | Co-creative, not just coworking     | NEW SECTION               | `DONE — VERIFIED`                                                                                 | Renders after "What is ODDspace"                                                                                                                                                                                                                                                                                                         |
| 47  | Spaces                              | KEEP                      | `DONE — VERIFIED`                                                                                 | Four rooms with the master's descriptions                                                                                                                                                                                                                                                                                                |
| 48  | Membership                          | KEEP / VERIFY             | `BLOCKED — NEEDS FACT / CONTENT`                                                                  | Renders as specified (€150/month, rolling admission, four inclusions). VAT treatment and the real scope of "24/7" are unverified against any source stronger than the repo itself — Blocker B4                                                                                                                                           |
| 49  | The network is bigger than the room | NEW SECTION               | `DONE — VERIFIED`                                                                                 | Renders after membership, as an editorial paragraph plus a generic "get in touch" — no invented external-member tier. The formal product stays a human decision — Blocker B5                                                                                                                                                             |
| 50  | Rental rates                        | KEEP / VERIFY             | `BLOCKED — NEEDS FACT / CONTENT`                                                                  | Renders with the "Selected member rates" label and "Ask us about your event" for non-members. Whether the rates are still active is operational data nobody has confirmed — Blocker B4                                                                                                                                                   |
| 51  | Joining                             | REWRITE                   | `DONE — VERIFIED`                                                                                 | Three steps verbatim. Rendered inside the Membership chapter rather than after Rental rates — a deliberate grouping from the 2026-08-30 rebuild (Joining _is_ the membership process); the master marks this row REWRITE, not MOVE, and the copy matches exactly                                                                         |
| 52  | Proof numbers                       | HIDE UNTIL VERIFIED       | `DONE — VERIFIED`                                                                                 | `proof.items: []`, section not rendered. Verified in built HTML, not just in JSON                                                                                                                                                                                                                                                        |
| 53  | Who it's for                        | REWRITE                   | `DONE — VERIFIED`                                                                                 | Verbatim, including the wider-network sentence                                                                                                                                                                                                                                                                                           |
| 54  | Event enquiry                       | KEEP                      | `DONE — VERIFIED`                                                                                 | Verbatim                                                                                                                                                                                                                                                                                                                                 |
| 55  | Why ODDspace                        | REWRITE                   | `DONE — VERIFIED`                                                                                 | Verbatim                                                                                                                                                                                                                                                                                                                                 |
| 56  | Calendar                            | KEEP + SIMPLIFY           | `DONE — VERIFIED`                                                                                 | "What's on / What's happening here." Consent-gated via `data-src`; no Google request before consent. Automated: `consent`                                                                                                                                                                                                                |
| 57  | FAQ                                 | KEEP + VERIFY             | `DONE — VERIFIED` (accessibility answer), `BLOCKED — NEEDS FACT / CONTENT` (the facts themselves) | **Fixed here.** The accessibility answer no longer reassures: it states plainly that verified information does not exist yet, names what is missing (step-free access, lifts, accessible toilets, door widths) and gives a real contact route. Automated: `editorial` fails if the old wording ever returns. The facts remain Blocker B7 |
| —   | **NEW: ODDspace Instagram gallery** | New user requirement (§8) | `BLOCKED — NEEDS EXTERNAL CREDENTIAL / OAUTH`                                                     | Integration complete and verified end-to-end against a live Behold JSON feed; it renders only once a feed ID exists. Blocker B8 — see [ODDspace Instagram](#oddspace-instagram-gallery)                                                                                                                                                  |

## Work with ODD

| ID  | Source section     | Action                      | Status                           | Evidence                                                                                                                      |
| --- | ------------------ | --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 58  | SEO                | REWRITE                     | `DONE — VERIFIED`                | Verbatim                                                                                                                      |
| 59  | Hero               | REWRITE                     | `DONE — VERIFIED`                | "What are you trying to make happen?" + "Start a conversation"                                                                |
| 60  | When ODD is useful | NEW SECTION                 | `DONE — VERIFIED`                | Editorial list, rendered after the hero                                                                                       |
| 61  | Pathways           | REWRITE                     | `DONE — VERIFIED`                | Four stages, labels and CTAs verbatim                                                                                         |
| 62  | Why ODD            | MERGE                       | `DONE — VERIFIED`                | One paragraph, not three cards                                                                                                |
| 63  | Cases / proof      | NEW SECTION / NEEDS CONTENT | `BLOCKED — NEEDS FACT / CONTENT` | `cases: []`, section hidden. Nothing invented; no Sitra/AI Finland or Mylly reference anywhere in the repo (grep). Blocker B9 |
| 64  | Enquiry            | REWRITE                     | `DONE — VERIFIED`                | Heading, body and the "What are you trying to make happen?" form label; ODDspace intent variants preserved                    |

## ODDagency

| ID  | Source section             | Action                      | Status                           | Evidence                             |
| --- | -------------------------- | --------------------------- | -------------------------------- | ------------------------------------ |
| 65  | SEO                        | REWRITE                     | `DONE — VERIFIED`                | Verbatim                             |
| 66  | Hero                       | REWRITE                     | `DONE — VERIFIED`                | Commercial nature named plainly      |
| 67  | When this work makes sense | NEW SECTION                 | `DONE — VERIFIED`                | Four panels, rendered after the hero |
| 68  | What ODDagency contributes | REWRITE                     | `DONE — VERIFIED`                | Five capabilities verbatim           |
| 69  | How it works               | REWRITE                     | `DONE — VERIFIED`                | Five steps verbatim                  |
| 70  | Cases                      | NEW SECTION / NEEDS CONTENT | `BLOCKED — NEEDS FACT / CONTENT` | Hidden. Blocker B9                   |
| 71  | Closing CTA                | SIMPLIFY                    | `DONE — VERIFIED`                | One exit                             |

## ODDnetwork / organisational membership

| ID  | Source section      | Action         | Status                           | Evidence                                                                                                                                          |
| --- | ------------------- | -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 72  | Public name         | HUMAN DECISION | `BLOCKED — NEEDS HUMAN DECISION` | "ODDnetwork" used provisionally in public copy; `/membership` route and `oddmembership` backend identifiers untouched, as instructed. Blocker B10 |
| 73  | Hero                | REWRITE        | `DONE — VERIFIED`                | Verbatim                                                                                                                                          |
| 74  | Why this exists     | NEW SECTION    | `DONE — VERIFIED`                | Renders after the hero                                                                                                                            |
| 75  | What we are shaping | SIMPLIFY       | `DONE — VERIFIED`                | One paragraph + one CTA; `tiers: []`, the audience and benefit cards are gone                                                                     |

## Media

| ID  | Source section                   | Action  | Status            | Evidence                                                                |
| --- | -------------------------------- | ------- | ----------------- | ----------------------------------------------------------------------- |
| 76  | Page intro                       | REWRITE | `DONE — VERIFIED` | Verbatim                                                                |
| 77  | Boilerplate                      | REWRITE | `DONE — VERIFIED` | "Helsinki-born" paragraph verbatim                                      |
| 78  | Key facts / media bank / archive | KEEP    | `DONE — VERIFIED` | Main activities reads "ODDfest · ODDference · ODDspace · Work with ODD" |
| 79  | Press contact                    | KEEP    | `DONE — VERIFIED` | `ronny@oddfest.co` kept, as the master instructs                        |
| 80  | Follow ODD                       | REWRITE | `DONE — VERIFIED` | Verbatim                                                                |

## Contact

| ID  | Source section | Action        | Status                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------- | ------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 81  | Contact page   | REWRITE       | `DONE — VERIFIED`                             | Verbatim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 82  | Contact form   | KEEP / CONFIG | `BLOCKED — NEEDS EXTERNAL CREDENTIAL / OAUTH` | Labels correct; the form renders with an honest "isn't connected yet" note and a real direct-email fallback rather than silently discarding input. `formAccessKey` is empty and only a human can create a Web3Forms key. **Fixed here:** the hidden email subject said "oddfest.co contact form", which after the cutover made messages from this site indistinguishable from the still-live oddfest.co site's own forms; it now names `allthingsodd.co`. Automated: `editorial`. Blocker B11 |

## Tickets / checkout / confirmation

| ID  | Source section    | Action                     | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------- | -------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 83  | Ticket storefront | REWRITE                    | `DONE — VERIFIED` | Microcopy verbatim; the catalog is fetched, never hardcoded — no price string exists anywhere under `src/pages/tickets/`                                                                                                                                                                                                                                                                                                |
| 84  | Checkout          | KEEP + SIMPLIFY            | `DONE — VERIFIED` | Labels unchanged; Stripe in test mode, `noindex`                                                                                                                                                                                                                                                                                                                                                                        |
| 85  | Invoice request   | REWRITE                    | `DONE — VERIFIED` | Verbatim; still mailto-based, and the copy does not claim otherwise                                                                                                                                                                                                                                                                                                                                                     |
| 86  | Confirmation      | REWRITE / VERIFY BEHAVIOUR | `DONE — VERIFIED` | Processing/Timeout verbatim. Success and Not-found deliberately keep the browser-saved-link wording instead of the master's "confirmation link sent to your email": no confirmation email exists in the flow yet, and the master's own `[NEEDS FACT CHECK]` note says to use that wording only once it does. Payment is never inferred from the Stripe redirect — order state comes from the webhook-backed status poll |
| 87  | 404               | KEEP                       | `DONE — VERIFIED` | Unchanged                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## Performance

Measured on the built site at 390×844, deviceScaleFactor 3, 4× CPU throttle,
median of 3 runs, `PerformanceObserver` + CDP `Performance.getMetrics` (the
same setup PR #19 used, so the numbers are comparable to the ones it recorded).

### Homepage LCP: 4376 ms → 484 ms

PR #19 measured ~4.2 s, tried `fetchpriority` on the mosaic, got an unstable
result and left it open as "the LCP element is the first of 20 eager mosaic
images". It was not a loading problem at all, which is why nothing about
loading moved it.

The real cause: the homepage `<h1>` is by far the largest contentful element
on the page (~102,500 px² against ~15,000 px² for a mosaic cell), so it is the
natural LCP element — but it carried `opacity: 0` with a **0.55 s entrance
delay**. Chrome evaluates a text element for LCP at the paint where its content
first appears, and an element painted at `opacity: 0` is not a candidate and is
not reconsidered later. The heading was therefore disqualified outright, and
LCP fell through to a 130 px mosaic thumbnail — which the ambient self-swap in
`mosaic.ts` then kept replacing with a marginally larger one for as long as the
page stayed open. The recorded candidate sequence made it unambiguous:

```
264 ms      494 px²  (small text)
480 ms   14,175 px²  archive-02.webp   (a mosaic cell)
664 ms   14,663 px²  archive-08.webp   (another cell)
4376 ms  15,327 px²  archive-32.webp   (a cell the swap loop introduced)
```

`archive-32` is not one of the twenty rendered cells; it only exists in the
swap pool. The control experiment confirmed it: under `prefers-reduced-motion`
(no entrance animation, no swap loop) LCP was **276 ms** and the element was
the `<h1>` at 102,570 px².

Fix: the headline's entrance delay is now `0s`, so it is painted with non-zero
opacity and is a candidate from the first frame. The logo mark's delay moved
from `0.3s` to `0s` with it, so the pair still rises as one gesture rather than
the line arriving first. Nothing else about the animation changed.

| CPU throttle | LCP (median of 3)        | element            |
| ------------ | ------------------------ | ------------------ |
| 1×           | 340 ms                   | `h1.hero-headline` |
| 4×           | **484 ms** (was 4376 ms) | `h1.hero-headline` |
| 6×           | 612 ms                   | `h1.hero-headline` |

Because the heading is ~7× the area of any mosaic cell, no later swap can
displace it — the metric is stable rather than open-ended. CLS stayed 0.00
throughout.

### Homepage steady-state CPU: 642 ms → 254 ms per 6 s (−60%)

PR #19 recorded "~10% steady-state CPU increase, cause unattributed, three
hypotheses tested and eliminated". Measured with the hero scrolled fully
offscreen, the cost was ~642 ms of task time per 6 s window — of which
`ScriptDuration` was **1 ms**. It was never JavaScript, which is why profiling
the scripts found nothing.

Attribution by elimination (median of 3 each, hero offscreen):

| variant                                         | task/6 s           |
| ----------------------------------------------- | ------------------ |
| baseline                                        | 639 ms             |
| grain animation disabled                        | 690 ms (no effect) |
| grain element hidden                            | 685 ms (no effect) |
| mosaic animations disabled                      | 502 ms             |
| `content-visibility: hidden` on the idle mosaic | **309 ms**         |

`mosaic.ts` already parked the twenty Ken-Burns pans with
`animation-play-state: paused` when the hero left the viewport — but a paused
animation keeps its element alive as a composited layer, so twenty offscreen
cells were still being composited every frame. `content-visibility: hidden` on
the already-idle mosaic skips rendering the subtree outright. In the built
site the effect is larger than in the injected-CSS experiment: **642 ms → 254 ms**.

Verified on return: scrolling back restores all 21 cells, `content-visibility`
returns to `visible`, the pans resume and no page error is logged, at both
390×844 and 1440×900.

### Transfer

The mosaic shipped one fixed 500 px-wide file per cell, twenty times, to a
grid whose cells are ~20vw on desktop and ~34vw on a phone. They now carry a
real `srcset` (220/320/440/500/640 w) with
`sizes="(max-width: 820px) 34vw, 20vw"`, and the descriptors are read back off
the generated files rather than echoing the requested widths — the 700 px step
originally asked for silently produced a 640 px file, because that is as wide
as these archive sources are, and a srcset descriptor that overstates a file's
width is worse than no srcset.

| profile             | before | after         |
| ------------------- | ------ | ------------- |
| mobile 390, DPR 3   | 665 KB | 609 KB (−8%)  |
| mobile 390, DPR 2   | 665 KB | 481 KB (−28%) |
| desktop 1440, DPR 1 | 713 KB | 535 KB (−25%) |

`Layout.astro`'s preload learned `imagesrcset`/`imagesizes` in the same change:
without them the preload names one fixed file while the `<img>` picks another,
and the browser downloads both. Both now come from one shared helper
(`src/components/sections/mosaic-images.ts`) so they cannot drift.

---

## ODDspace Instagram gallery

Built as specified in §8, using **Behold**, and verified end-to-end against a
real Behold JSON feed.

**Why Behold, concretely.** Its JSON feed is data rather than a widget
(`GET https://feeds.behold.so/<feedId>`), so the wall is this site's own markup
and tokens — no iframe, no provider stylesheet, no Instagram logo, no follower
or like counts. It sets no cookies and no `localStorage`, so unlike Elfsight
(which sets `elfsight_viewed_recently` and would have had to be declared in
`consent-config.ts`, disclosed on `/privacy` and gated before the request) it
is not a consent-gated tracker. And its media comes back pre-sized
(400/700/1000/2000 px webp with real dimensions), which is what lets the grid
reserve space and ship a responsive `srcset`. JSON feeds are available on the
free plan; no paid plan was bought.

**What was verified, not assumed.** The integration was built against the live
API, and the rendered result was checked in a browser at 1440, 834 and 390 px:
real photographs, real permalinks, correct grid, no horizontal overflow, no
console errors. The privacy behaviour is asserted on the network and on storage
rather than taken from the provider's documentation.

**Design.** Six posts in a gallery wall: one 2×2 lead tile plus five singles
fills a 3×3 exactly on desktop; the lead span is dropped below six posts (a
short feed otherwise leaves visible holes — found by rendering a real
four-post feed) and on mobile, which falls back to an even two-column grid.
Reels and carousels get a small glyph and their poster media; no `<video>`
element is ever created. Clicking a tile opens the real Instagram post. The
section closes with `Follow @oddspace.co →`, and a discreet "Feed by Behold"
credit appears only when the feed's own `showBranding` flag asks for it.

**Cost.** Below the fold, so nothing is requested until the section is within
400 px of the viewport — asserted by a test that fails if a request happens on
first paint. The tiles are rendered at final size before any image exists, so
filling them shifts nothing (asserted by comparing the section's bounding box
across a held-open response).

**Failure behaviour.** A provider outage sets `data-state="unavailable"`,
which swaps the grid for one quiet line and the follow link. The calendar and
the rest of the page keep working, and no error of our own reaches the console.
The same fallback covers a visitor with no JavaScript, since the grid is opt-in
via `data-state`.

**Why it is still blocked.** The section is not rendered at all until
`PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID` is set, so this build ships no empty shell.
Creating a Behold source requires connecting the `@oddspace.co` Instagram
account through Instagram's own OAuth — a human action with an account
password. See Blocker B8.

---

## Blockers

Each of these is a real external or human dependency. Nothing here is blocked
on more engineering.

**B1 — Verified 2026 impact figures.** _Missing:_ approved public participant/
partner/contributor numbers for 2026. _Why code cannot invent it:_ they are
counts of real people at real events. _Human action:_ approve the 2026 figures
from the impact reporting source, then fill `about.json → impact[1].items`.
_Prepared:_ the 2026 block renders as a subordinate note, never as an empty
proof grid.

**B2 — Four to six verified Creative Week 2026 host examples.** _Missing:_
host, event title, format, location, one line, image, per example. _Why:_
inventing them would fabricate other people's events. _Human action:_ supply
them from the programme/communications team; fill `oddfest.json → examples`.
_Prepared:_ the section, its intro and its closing line are implemented and
appear the moment the array is non-empty.

**B3 — ODDfest 2027 host participation / revenue model.** _Missing:_ whether
anything is charged, what is included, how any shared revenue works. _Human
action:_ Aki/Ronny decide, then replace the interim FAQ answer. _Prepared:_ the
honest interim answer is published and says the model will be published before
hosts commit.

**B4 — ODDspace operational data.** _Missing:_ VAT treatment on the €150
membership, the real scope of "24/7" access, and confirmation that the €200/
€100 member rates are still current. _Human action:_ ODDspace lead / finance
confirm. _Prepared:_ rates carry the "Selected member rates" label and
non-member pricing is "Ask us about your event"; no disputed m² or member
count is published anywhere.

**B5 — The external/wider-network product.** _Missing:_ name, eligibility,
benefits, price. _Human action:_ Aki/Ronny define it. _Prepared:_ the network
idea is published as an idea with a generic contact CTA, and the FAQ answer is
written to be replaced.

**B6 — Source link for the Finnish creative-economy claim on About.** _Missing:_
a credible public source to link. _Human action:_ supply the URL. _Prepared:_
the sentence is measured and attributed to "Finland's own creative-economy
goals"; adding a link is a one-line content change.

**B7 — ODDspace accessibility facts.** _Missing:_ step-free access, lifts,
accessible toilets, thresholds/door widths, known limitations. _Why code cannot
invent it:_ these are physical facts about a building. _Human action:_ ODDspace
lead / landlord measure and confirm. _Prepared:_ the published answer now says
plainly that verified information does not exist yet, names exactly what is
missing, and gives a real contact route — and a test fails if the old
reassurance ever returns.

**B8 — Behold account connection for `@oddspace.co`.** _Missing:_ a Behold feed
ID. _Why code cannot invent it:_ creating the source requires signing in to
Behold and authorising the Instagram account through Meta's OAuth, with the
account's own credentials. _Human action, exactly:_

1. Confirm `@oddspace.co` is an Instagram **Business** or **Creator** account
   (Instagram's API no longer serves personal accounts). Settings → Account
   type and tools.
2. Sign up at <https://behold.so> (the free plan is enough: one feed, six
   posts, daily refresh, JSON feeds included) and connect that account.
3. Create a feed, set it to 6 posts, and add `allthingsodd.co` to the feed's
   domain whitelist.
4. Copy the feed ID and set `PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID` in the deploy
   job's `env:` block in `.github/workflows/ci.yml`, next to
   `PUBLIC_LEGACY_REDIRECT`.
   _Prepared:_ everything else. Setting that one variable renders the wall, adds
   Behold to `/privacy`'s processor list automatically, and turns the seven
   "feed configured" specs from skipped into a live gate.

**B12 — The `SURGE_TOKEN` repository secret cannot publish to
`allthingsodd.co`.** _Missing:_ an account-scoped Surge token in the repo
secret. The one there is scoped `--domain odd-field-guide.surge.sh`, so every
push to `main` since the domain migration has failed at the publish step with
`Aborted - you do not have permission to publish to allthingsodd.co` —
confirmed on PR #19's merge (run 33801137415) and this pass's merge (run
33822336466). CI's `checks` and `functional` jobs pass; only the publish
fails, and production has been kept current by hand since. _Why code cannot
invent it:_ it is an account credential, and creating or rotating one is
outside this pass's authorisation. _Human action, exactly_ — from a terminal
where `surge` is logged in as `ronny@oddfest.co` and `gh` is authenticated
(the value never appears on screen):

```bash
npx surge tokens add -m "github-actions-ci-$(date +%Y%m%d)" \
  | gh secret set SURGE_TOKEN --repo ronny-sketch/allthingsodd
```

_Prepared:_ the failure mode, its history and this command are now written
into `docs/deployment.md#the-deploy-token-must-not-be-domain-scoped` rather
than left to be re-diagnosed. Until it is done, a CloudCannon content edit
does not reach the live site on its own.

**B9 — Approved public cases for Work with ODD and ODDagency.** _Missing:_
three to five, and two to four, approved case studies. The master's own claim
watchlist forbids publishing Sitra / AI Finland until procurement is confirmed
and public use approved, and forbids publishing Mylly's contract value. _Human
action:_ get client sign-off per case. _Prepared:_ both sections are
implemented and hidden while empty.

**B10 — ODDnetwork vs ODDmembership naming.** Decision Log O-001 is open.
_Prepared:_ "ODDnetwork" is used provisionally in public copy only; the
`/membership` route and the `oddmembership` backend identifier are untouched,
so closing the decision is a copy change, not a migration.

**B11 — Web3Forms access key for the contact form.** _Missing:_ a real key.
_Why code cannot invent it:_ it is an account credential. _Human action:_ create
a free key at <https://web3forms.com> and put it in
`src/content/pages/contact.json → formAccessKey` (it is a public submission
key, safe in the repo — same class as the Stripe publishable key). _Prepared:_
the form renders, validates and tells the visitor honestly that it is not
connected, with the direct email addresses beside it.
