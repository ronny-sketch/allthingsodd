# Launch readiness — All Things ODD, 2026-09-21

What was inspected, what was changed, what was measured, and what is still
blocked. The operational sequence is `docs/LAUNCH_RUNBOOK.md`.

Every number here was measured during this pass. Where something could not be
verified, it says so rather than guessing — including in the two places where
that verdict is uncomfortable.

---

## The one thing to read

**Production was selling a ticket nobody could pay for.**

`/tickets` served ODDference 2027 Blind Bird as `active` with ten available at
€299 + VAT, and `/tickets/checkout` loaded `pk_test_51UAbRuEWKid…` — a Stripe
**test-mode** publishable key. A real buyer could fill a cart, enter their
details and reach a payment form that could never take their money. The ticket
store recorded **eleven orders and €6,036 attempted between 1 and 17
September, against zero payments and zero tickets issued.**

Nothing in the repository could see it. The build is fast, the quality gate is
green, and all six CI test shards pass — every one of them against
`localhost`, where a test-mode key is exactly right. The defect was invisible
precisely where it was tested and real only on the one host nobody tests.

That is now fixed by deriving the sale state instead of configuring it, and it
is the reason three other findings in this report are phrased as "nothing
could see it" too.

---

## Score

| Area                           | Score        | Why not higher                                                                                                                                                                                                                       |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website and design             | 94 / 100     | Two visual baselines flake on unmodified `main`. Six `og:image` cards are photo crops rather than designed cards, and `/oddfest/`'s is nearly black at thumbnail size.                                                               |
| Forms and CRM                  | 88 / 100     | Rate limiting is written and merged but inert until a D1 migration is applied. `upsertCompany` with no domain (any Gmail sender) is untested and may create duplicate companies. Attio `source` is hardcoded until the Worker ships. |
| Analytics and consent          | 95 / 100     | Complete and tested, but GA4 cannot be verified end to end without a real production session after deploy.                                                                                                                           |
| Ticketing                      | 70 / 100     | Test mode is fully verified; live mode is untested by definition and requires one real purchase. Correctly and honestly disabled meanwhile, which is why this is 70 and not 40.                                                      |
| SEO                            | 92 / 100     | Metadata, canonicals, sitemap and robots are correct. No `Event` structured data, because the dates conflict (below). Eleven descriptions run over 160 characters.                                                                   |
| Domains and email              | 55 / 100     | `oddfest.co` and `oddspace.co` still serve their own sites. Three intended group addresses do not exist. Both need credentials these repositories do not hold.                                                                       |
| Legal and factual completeness | 72 / 100     | Privacy is accurate and now complete. Refund, transfer, cancellation, invoice and venue-rental terms have no approved wording, and ODDspace's accessibility facts are still unmeasured.                                              |
| Deployment and operations      | 90 / 100     | Reproducible and self-verifying. The Worker still deploys by hand, and its scheduled refresh fails silently.                                                                                                                         |
| **Overall**                    | **84 / 100** |                                                                                                                                                                                                                                      |

Read the 84 as: everything that could be built and proved has been. What
remains is nine external actions, and they are external — credentials,
mailboxes, one real card, and facts only a human can confirm.

---

## Status table

| ID  | Area        | Finding                                                                                                                                                                                                                             | Action completed                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                  | Remaining owner                                        | Status                                                 |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| T1  | Ticketing   | Production offered a purchasable €299 ticket against a Stripe test-mode key. 11 orders, €6,036 attempted, 0 paid, 0 issued.                                                                                                         | Sale state derived from the key and the host (`salesEnabled()`). Public hosts + test key = closed. `/tickets` publishes real prices with an invoice route and a pre-purchase question. `/oddference` cards drop "Buy"/"On sale now" and hide the deadline badge. Content fallback fails closed for no-JS. 11 tests, both states and the host/key matrix. | `tests/functional/ticket-sales-gate.spec.ts` 11/11 on Chromium and WebKit | —                                                      | DONE — VERIFIED                                        |
| T2  | Ticketing   | Live mode unverified.                                                                                                                                                                                                               | Full test-mode path verified. Cutover checklist written, 12 steps, ending in one real purchase and a refund.                                                                                                                                                                                                                                             | Runbook § Ticketing                                                       | Ronny + Stripe                                         | BLOCKED — FINANCIAL APPROVAL                           |
| A1  | Analytics   | The Stripe order token — a bearer capability that authorises reading an order and reassigning attendees — reached GA4 in `page_location` on every purchase.                                                                         | `SECRET_QUERY_PARAMS` stripped from `page_location`/`page_referrer` centrally; token removed from the address bar once persisted. UTM parameters survive.                                                                                                                                                                                                | `tests/functional/analytics-privacy.spec.ts` 5/5                          | —                                                      | DONE — VERIFIED                                        |
| A2  | Analytics   | Four storage keys written and never declared, while `/privacy` claimed the table was complete.                                                                                                                                      | All four declared with real scope and retention. The purchase-report key moved to `statistics` and is no longer written without consent.                                                                                                                                                                                                                 | `src/scripts/consent-config.ts`, 7 entries; rendered on `/privacy/`       | —                                                      | DONE — VERIFIED                                        |
| A3  | Analytics   | Withdrawing consent did not stop events for the rest of the page view.                                                                                                                                                              | `trackEvent` re-checks consent per event.                                                                                                                                                                                                                                                                                                                | Test: "withdrawing consent stops events within the same page view"        | —                                                      | DONE — VERIFIED                                        |
| A4  | Analytics   | `purchase` sent the ticket-type uuid and no price, so GA4 could not join the item funnel and item-level revenue was empty.                                                                                                          | Reuses `itemFor()` — same slug and price as the other four funnel steps.                                                                                                                                                                                                                                                                                 | Test asserts `item_id: 'blind-bird'`, `price: 299`                        | —                                                      | DONE — VERIFIED                                        |
| A5  | Analytics   | Five events missing; the contact form had none, and every form's failure path was invisible.                                                                                                                                        | Added `newsletter_error`, `contact_submit`, `contact_error`, `business_enquiry_error` and one delegated `cta_click`. `external_social_click` deliberately omitted.                                                                                                                                                                                       | `docs/analytics.md` event matrix                                          | —                                                      | DONE — CODE COMPLETE, PRODUCTION VERIFICATION REQUIRED |
| A6  | Analytics   | A test wrote real hits into the live GA4 property on every run, on two projects.                                                                                                                                                    | `tests/base.ts` auto-use fixture aborts every Google origin; the leaking spec imports it.                                                                                                                                                                                                                                                                | All three consent-granting specs now block                                | —                                                      | DONE — VERIFIED                                        |
| P1  | Performance | Homepage LCP 4184 ms against a 2500 ms budget. Two independent causes; fixing either alone changed nothing.                                                                                                                         | Removed the mosaic opacity fade **and** gave the ambient swap the same responsive set as the cells. Four combinations measured.                                                                                                                                                                                                                          | 4184 → **148 ms**                                                         | —                                                      | DONE — VERIFIED                                        |
| P2  | Performance | `/tickets` CLS 0.2615 against a 0.1 budget — the footer dropped ~510 px when the catalogue landed.                                                                                                                                  | Width-responsive skeleton rows; no magic `min-height`.                                                                                                                                                                                                                                                                                                   | 0.2615 → **0.0000**                                                       | —                                                      | DONE — VERIFIED                                        |
| P3  | Performance | Every `<Image widths={…}>` without `width` shipped the full-size original as its fallback: 510 KB on the brand book, 441 KB on `/about`.                                                                                            | 12 brand-book images name their largest variant; `PhotoBreak` (10 public pages) offers 640–2200 with `sizes="100vw"`.                                                                                                                                                                                                                                    | `/about` phone variant 441 KB → 43 KB                                     | —                                                      | DONE — VERIFIED                                        |
| P4  | Performance | No reproducible performance check existed.                                                                                                                                                                                          | `scripts/measure-cwv.mjs` (`npm run measure:cwv`), 8 routes, budget, non-zero exit.                                                                                                                                                                                                                                                                      | All routes inside budget                                                  | —                                                      | DONE — VERIFIED                                        |
| P5  | Performance | Surge serves content-hashed `/_astro/` assets `max-age=0, must-revalidate`, so ~20–30 conditional requests per repeat visit.                                                                                                        | Not fixable in-repo: Surge has no per-path header control.                                                                                                                                                                                                                                                                                               | `curl -I` on 5 asset classes                                              | Ronny — accept, or put a CDN in front                  | BLOCKED — HUMAN DECISION                               |
| L1  | Links       | `https://tiketti.fi` fails TLS outright — the apex is an S3 website endpoint that terminates no TLS. A visitor got a browser interstitial.                                                                                          | Changed to `https://www.tiketti.fi/`.                                                                                                                                                                                                                                                                                                                    | `openssl s_client` handshake reset on the apex; `www` 200                 | —                                                      | DONE — VERIFIED                                        |
| L2  | Links       | `/oddspace/event-info-pack/` and `/oddspace/code-of-conduct/` had zero inbound links from anywhere, while being submitted to Google.                                                                                                | Linked from `/oddspace/venue/` via the existing `ResourceList`, with a CloudCannon field so a new document can be added without a developer.                                                                                                                                                                                                             | Both now have inbound links in the built output                           | —                                                      | DONE — VERIFIED                                        |
| L3  | Links       | Seven nav and footer hrefs were unslashed — one 301 per click, and one character away from silently dropping a query string.                                                                                                        | All slashed.                                                                                                                                                                                                                                                                                                                                             | `href="/oddfest/"` in the build                                           | —                                                      | DONE — VERIFIED                                        |
| L4  | Links       | `?intent=studio` was accepted by neither the frontend gate nor the Worker, so every ODDstudio enquiry arrived indistinguishable from a gallery rental.                                                                              | Frontend gate takes `studio`; Worker `INTENTS` extended on a Growth OS branch.                                                                                                                                                                                                                                                                           | Both halves on branches; needs the Worker deploy                          | Ronny — deploy the Worker                              | DONE — CODE COMPLETE, PRODUCTION VERIFICATION REQUIRED |
| S1  | SEO         | Eight routes advertised `twitter:card=summary_large_image` and supplied no image, including `/media`, the press page.                                                                                                               | Site-wide default (`/og/home.jpg`, the only designed card) in `Layout.astro`.                                                                                                                                                                                                                                                                            | Every one of 22 routes now emits `og:image`                               | —                                                      | DONE — VERIFIED                                        |
| S2  | SEO         | `og:image:width`/`height` hardcoded 1200×630 — true today, a lie on the first differently-sized card.                                                                                                                               | `scripts/check-og-images.mjs` in `npm run quality` asserts it, reading dimensions from the file header.                                                                                                                                                                                                                                                  | "8 social cards, all 1200x630"                                            | —                                                      | DONE — VERIFIED                                        |
| S3  | SEO         | `/oddfest-2026`'s meta description advertised "Saturday 26 September", five days away, on an archive page — a stale promise in search snippets for months.                                                                          | Date removed from the description. The party stays published on the page and on `/oddspace`.                                                                                                                                                                                                                                                             | Build contains no "26 September" in that description                      | —                                                      | DONE — VERIFIED                                        |
| S4  | SEO         | `/tickets/confirmation/` shipped an empty `<h1>`.                                                                                                                                                                                   | Defaults to the arrival state; the script overwrites it.                                                                                                                                                                                                                                                                                                 | `<h1 id="tixfHeading">Checking your order…</h1>`                          | —                                                      | DONE — VERIFIED                                        |
| S5  | SEO         | `/404` carried no `noindex` and canonicalised to a non-existent `/404/`.                                                                                                                                                            | `noindex` added.                                                                                                                                                                                                                                                                                                                                         | 404 build contains `noindex`                                              | —                                                      | DONE — VERIFIED                                        |
| S6  | SEO         | Six ODDspace-family routes share one `og:image`; `/oddfest/`'s is a near-black crop, unusable at thumbnail size.                                                                                                                    | Not done — needs design work, not code.                                                                                                                                                                                                                                                                                                                  | 8 cards inspected; only `home.jpg` is a designed card                     | Ronny/Aki — design 4 cards                             | BLOCKED — HUMAN DECISION                               |
| S7  | SEO         | No `Event` structured data for ODDference 2027.                                                                                                                                                                                     | Not written, deliberately. See **Factual blockers** F1.                                                                                                                                                                                                                                                                                                  | `oddference.json` says dates are unconfirmed                              | Ronny — confirm date and venue                         | BLOCKED — VERIFIED FACT REQUIRED                       |
| N1  | Navigation  | "Work with ODD", the B2B gateway every commercial journey routes through, sat two clicks deep behind a label reading "Info".                                                                                                        | Promoted to the top level; `Info` keeps Media/About/Contact. Measured at every width where the desktop nav exists (1025 px up): fits on one row, no overflow, 83 px spare at the narrowest.                                                                                                                                                              | Nav probe at 1040–2560 px                                                 | —                                                      | DONE — VERIFIED                                        |
| G1  | Growth OS   | No rate limiting anywhere. `/api/newsletter` would make beehiiv send ODD's welcome email to any address, repeatedly; `/api/contact` sends two emails per request and can exhaust the Resend quota, after which real enquiries fail. | D1-backed fixed-window limiter, fails open and logs loudly if the table is absent. Origin rejected server-side for the five state-changing routes.                                                                                                                                                                                                       | 154 tests on that branch                                                  | Ronny — apply migration, deploy                        | DONE — CODE COMPLETE, PRODUCTION VERIFICATION REQUIRED |
| G2  | Growth OS   | The webhook claimed idempotency _before_ doing the work, so a partial failure left an order `paid` with zero tickets, permanently, with no retry path. This path has never run in production.                                       | Claim-then-release plus one atomic `db.batch()`, and `amount_total` reconciled against the stored total.                                                                                                                                                                                                                                                 | 121 tests on that branch                                                  | Ronny — deploy                                         | DONE — CODE COMPLETE, PRODUCTION VERIFICATION REQUIRED |
| G3  | Growth OS   | Newsletter had no consent timestamp and no referrer; `reopenDeal` never refreshed UTM, freezing attribution at first contact; Attio `source` was hardcoded.                                                                         | All four addressed.                                                                                                                                                                                                                                                                                                                                      | 128 tests on that branch                                                  | Ronny — create two beehiiv fields **before** deploying | DONE — CODE COMPLETE, PRODUCTION VERIFICATION REQUIRED |
| G4  | Growth OS   | `upsertCompany` omits `domains` for a free-mail sender, so a `PUT … matching_attribute=domains` has nothing to match on. Untested.                                                                                                  | Not changed — the behaviour needs one check against a real TEST record before a fix can be right.                                                                                                                                                                                                                                                        | No test exists for `upsertCompany`                                        | Ronny — 15 minutes against a TEST record               | BLOCKED — EXTERNAL CREDENTIAL                          |
| G5  | Growth OS   | `signTicketCode` exists, is never called outside tests, and check-in skips signature verification when none is sent. A security control that looks active and is not.                                                               | Not changed. Tickets are not forgeable — D1 is the authority and codes carry 100 bits of entropy — so this is dead weight rather than a hole.                                                                                                                                                                                                            | `grep`: called only from tests                                            | Ronny — wire it into the QR payload, or delete it      | BLOCKED — HUMAN DECISION                               |
| D1  | Domains     | `oddfest.co` and `oddspace.co` serve their own standalone sites.                                                                                                                                                                    | Repository side complete: CI already verifies the redirects and holds them forever once seen. Exact instructions written, including the seven mail records on `oddfest.co` that must not be touched.                                                                                                                                                     | DNS read for all three domains                                            | Ronny — Vercel + Hostinger                             | BLOCKED — EXTERNAL CREDENTIAL                          |
| D2  | Email       | `partners@`, `space@` and `fest@` do not exist — all three bounced `550-5.1.1`.                                                                                                                                                     | Every topic routes to `hello@` with the topic in the subject. Creation and verification steps written; nothing is published until a group receives from outside.                                                                                                                                                                                         | Bounce test 2026-09-21                                                    | Ronny — Workspace admin                                | BLOCKED — EXTERNAL CREDENTIAL                          |
| C1  | CMS         | Whether a CloudCannon edit reaches production could not be verified.                                                                                                                                                                | Not verified. Eight-step manual test below.                                                                                                                                                                                                                                                                                                              | No authenticated CloudCannon access in this session                       | Ronny                                                  | BLOCKED — EXTERNAL CREDENTIAL                          |
| I1  | Instagram   | `PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID` is unset, so the ODDspace feed section does not render.                                                                                                                                         | Correct as-is: the section is absent rather than an empty shell, and `/privacy`'s Behold disclosure renders only while it is configured.                                                                                                                                                                                                                 | `grep behold.so dist` → 0 files                                           | Ronny — Behold dashboard, then set the variable        | BLOCKED — EXTERNAL CREDENTIAL                          |
| X1  | Legal       | Refund, transfer, cancellation, invoice, venue-rental, photography and accessibility wording has no approved text.                                                                                                                  | Not invented. No route publishes a term that has not been approved.                                                                                                                                                                                                                                                                                      | —                                                                         | Ronny + legal                                          | BLOCKED — HUMAN DECISION                               |

---

## Factual-content blockers

These are facts, not code. Each one is something the site either must not say
or cannot yet say.

**F1 — ODDference 2027 dates: the brief and the site disagree.** The launch
brief states 22–23 April 2027 in Helsinki. The site says the opposite, in
`src/content/pages/oddference.json` and live on `/oddference/`: _"Helsinki.
The exact dates and venues are not confirmed yet — ticket holders hear first
as each piece is settled."_ A search of `src/` and `dist/` for any April 2027
date returns nothing. `allthingsodd.co` is the source of record for dates, and
it says unconfirmed — so **no date was published and no `Event` structured
data was written.** Resolve the conflict first. If 22–23 April is confirmed,
that FAQ answer has to change in the same pass, or the page will contradict
its own markup. The venue is separately unconfirmed, and `location` is
required for Google's Event rich result, so Event markup buys nothing until
both land.

**F2 — ODDspace accessibility is unmeasured.** Step-free access, door widths,
lifts, accessible toilets, accessible arrival and emergency evacuation are all
unverified. The venue page names them as things answered in an enquiry rather
than publishing numbers, which is the right state. Someone has to physically
measure them.

**F3 — ODDspace operational terms are unverified.** Overnight use, bass and
music after 22:00, smoke and haze, electrical capacity, rigging, cleaning,
alcohol responsibilities, cancellation, damage, and the definition of
"revenue" in the revenue-share model. None is published. None should be
guessed.

**F4 — ODDspace event pricing v3 is written but unapproved.** A complete
rewrite of the venue rate card — a Door Deal at €0 upfront, a €300 community
rate, €450/€650 promoter nights, €750/€1,200 company days, "produced by ODD"
from €4,000 — was found uncommitted in the working tree at the start of this
pass. It is preserved verbatim on the local branch
`wip/oddspace-event-pricing-v3-uncommitted`, deliberately unpushed. Those are
real prices awaiting a real decision.

**F5 — `/oddfest-2026`'s afterparty.** Saturday 26 September at ODDspace,
free, Teollisuuskatu 9 D. Published and correct today. It is five days away
and will become an archive item; the meta description no longer carries the
date, but the section itself will need retiring.

**F6 — Sturenportti 3 vs Teollisuuskatu 9 D.** The `Organization` JSON-LD
publishes Sturenportti 3, the association's registered postal address. That is
correct for the legal entity and matches `/privacy`'s controller block, but it
is also the address Google is most likely to surface as "where ODD is", and
the guest entrance is Teollisuuskatu 9 D. Worth a deliberate decision.

---

## Route and link report

22 routes built, 1,169 anchors examined across every one.

| Check                    | Result                                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internal links resolving | 682 checked, **0 broken**                                                                                                                                      |
| In-page fragments        | 115 checked, **all resolve**, including cross-page                                                                                                             |
| Query-string links       | 10, **all correctly slashed** — Surge drops the query off an unslashed path                                                                                    |
| `href="#"` placeholders  | 1, on `/tickets/checkout`, intercepted by a real handler and `aria-disabled` in the static HTML                                                                |
| External links           | 60 distinct, checked individually. 58 × 200. `tiketti.fi` **was broken — fixed**. Facebook 400 and Marimekko 429 are bot-blocking, confirmed against controls. |
| `target="_blank"`        | 334, **all** carry `rel="noreferrer"`                                                                                                                          |
| Downloads                | 3 PDFs, all `.PDF` on disk **and** in the href — the Surge lowercase-`.pdf` trap does not apply. Sizes verified against the live host.                         |
| 404                      | Real 404 status with the custom page, at root and nested depth                                                                                                 |
| Orphan pages             | 2 found, **both now linked**                                                                                                                                   |
| `mailto:`                | 3 distinct. `ronny@` removed from the whole commerce path in favour of `hello@`.                                                                               |

**Information architecture.** `/membership` (ODDnetwork), `/oddagency`,
`/oddstudio` and `/oddfest-2026` each have a distinct purpose and none
duplicates another. `/brand-book` is `noindex`, out of the nav and out of the
sitemap — confirmed on all three counts. `/tickets/checkout` and
`/tickets/confirmation` are `noindex` and out of the sitemap. No route is both
`noindex` and in the sitemap.

One naming liability left alone: `/membership` is titled "ODDnetwork" while
`/oddspace/membership` is a different product and `/oddstudio` contains a
third membership. Renaming the route to `/oddnetwork` would be clearer, and
Surge has no redirect engine — so the old URL would 404 and every inbound link
to it would break. Not worth it at launch.

---

## Form and integration matrix

| Flow                        | Endpoint                                          | Client validation       | Server validation     | Honeypot | Rate limit                       | Origin    | Destination                           | Attribution                                                              | Auto-reply                              |
| --------------------------- | ------------------------------------------------- | ----------------------- | --------------------- | -------- | -------------------------------- | --------- | ------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Newsletter (footer + popup) | `POST /api/newsletter`                            | required + `type=email` | yes                   | yes      | **added, inert until migration** | **added** | beehiiv, `reactivate_existing`        | `utm_*`, `landing_page` → `signup_page`; `consent_at` + `referrer` added | beehiiv welcome                         |
| General contact             | `POST /api/contact`                               | required fields         | yes                   | yes      | **added, inert**                 | **added** | `hello@oddfest.co`, topic in subject  | first-touch + referrer in the footer                                     | yes, only if the team copy was accepted |
| ODDspace enquiry            | → Work with ODD, `?interest=oddspace&intent=…`    | yes                     | yes                   | yes      | **added, inert**                 | **added** | email + Attio                         | `intent` carried                                                         | yes                                     |
| ODDfest event idea          | → contact, `?topic=oddfest_2027_event`            | yes                     | yes                   | yes      | **added, inert**                 | **added** | `hello@`, "ODDfest 2027 — event idea" | yes                                                                      | yes                                     |
| Partnership / ODDference    | → Work with ODD, `?interest=oddference_corporate` | yes                     | yes                   | yes      | **added, inert**                 | **added** | email + Attio person/company/deal     | `utm_source/medium/campaign` structured; the rest in the note            | yes                                     |
| Work with ODD               | `POST /api/business-enquiry`                      | yes                     | yes                   | yes      | **added, inert**                 | **added** | email first, then Attio               | as above                                                                 | yes                                     |
| Ticket purchase             | `POST /api/tickets/checkout`                      | yes                     | yes                   | n/a      | **added + pending-order cap**    | **added** | D1 + Stripe                           | `attribution` on the order                                               | Stripe                                  |
| Attendee assignment         | `POST /api/tickets/assign`                        | yes                     | partial → **guarded** | n/a      | **added**                        | **added** | D1                                    | n/a                                                                      | n/a                                     |

**Failure behaviour, which is the part that matters.** The enquiry email is
sent _before_ the Attio write and independently of it. Attio down + email up
means the visitor is told "received", the enquiry is in the inbox, and the CRM
record is owed. Attio down + email down returns an honest 502. A newsletter
failure is never reported as success. No raw adapter error ever reaches a
browser. All of this is tested.

**What is still weak.** Attio matches people on email (no duplicates) but
companies on domain only — and `upsertCompany` omits `domains` entirely for a
free-mail sender, which is every freelancer submitting from Gmail. That path
has no test and may be creating a fresh company per submission. It needs one
check against a real TEST record (G4).

The full analytics event matrix lives in `docs/analytics.md`, with trigger,
parameters, consent category and what must never be sent.

---

## Ticketing readiness

| Element                                                 | State                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Frontend retrieves the catalogue                        | verified — `GET /api/tickets/catalog?event=oddference-2027` returns the three tiers  |
| Backend authoritative for price, inventory, tax, status | verified — the frontend never sends a price; tested                                  |
| Checkout created server-side                            | verified                                                                             |
| Stripe embedded-page API                                | verified, pinned, documented on both sides                                           |
| Payment recorded only by a signed webhook               | verified — the redirect never marks an order paid                                    |
| Confirmation polls order status                         | verified                                                                             |
| Signing secrets backend-only                            | verified — no secret in the website repo                                             |
| Check-in protected                                      | shared-secret header, fails closed, now constant-time, and tested for the first time |
| Order token entropy                                     | 120 bits, unbiased; ticket codes 100 bits; enumeration infeasible                    |
| €299/€399/€499 ex VAT, 13.5%, rounding                  | verified against the live catalogue and the summary maths                            |
| Duplicate webhook delivery                              | safe, and a partial failure is now retryable rather than silently swallowed          |
| Invalid/missing signature, Stripe failure               | verified                                                                             |
| **Live-mode payment**                                   | **never tested. Requires one real purchase.**                                        |
| Public purchase CTAs                                    | **deliberately closed**, with prices published and an invoice route live             |

The site cannot currently mislead a buyer: it publishes what a ticket costs,
says plainly that card payment is not open, and offers the one route that does
work today.

---

## Performance, before and after

Measured with `node scripts/measure-cwv.mjs` against the built site at
1366×900, unthrottled. Budget: LCP ≤ 2500 ms, CLS ≤ 0.1.

| Route              | LCP before       | LCP after  | CLS before      | CLS after  |
| ------------------ | ---------------- | ---------- | --------------- | ---------- |
| `/`                | **4184 ms FAIL** | **148 ms** | 0.0000          | 0.0000     |
| `/oddference/`     | 100 ms           | 88 ms      | 0.0000          | 0.0000     |
| `/oddspace/`       | 64 ms            | 116 ms     | 0.0000          | 0.0000     |
| `/oddspace/venue/` | 76 ms            | 72 ms      | 0.0000          | 0.0000     |
| `/tickets/`        | 320 ms           | 384 ms     | **0.2615 FAIL** | **0.0000** |
| `/work-with-odd/`  | 72 ms            | 76 ms      | 0.0000          | 0.0000     |
| `/contact/`        | 764 ms           | 784 ms     | 0.0000          | 0.0000     |
| `/oddfest/`        | 80 ms            | 80 ms      | 0.0000          | 0.0000     |

Two routes were outside budget; none is now. Homepage initial transfer 488 KB
→ 438 KB. `/about`'s largest image drops from 441 KB to 43 KB on a phone.

INP was not measured — it needs real interaction. Long-task total is 0 ms on
every route, which is favourable but is a proxy, not a substitute. There is no
CrUX field data for these URLs yet, so everything here is lab.

The homepage is worth reading twice, because the first diagnosis was wrong and
only measurement caught it. Both causes had to go:

| Combination                             | LCP        |
| --------------------------------------- | ---------- |
| opacity fade + 500 px swap (as shipped) | 4184 ms    |
| no fade + 500 px swap                   | 4280 ms    |
| fade + srcset swap                      | 4220 ms    |
| no fade + srcset swap                   | **152 ms** |

24 MB of source speaker PNGs turned out to be a non-issue: the build serves
them at 10–28 KB each, a 265× reduction, and no page bypasses `astro:assets`.
The suspicion that raw PNGs were being served was wrong.

---

## CloudCannon: the eight-step test nobody has run

No authenticated CloudCannon access was available in this session, so **the
edit-to-production loop is unverified.** It is not claimed as working. Run
this once:

1. Open the site in CloudCannon and edit a harmless visible string — the
   `beforeYourEvent` headline on the ODDspace venue page is a good choice,
   because it is new, visible and inconsequential.
2. Save. Confirm CloudCannon reports a commit.
3. In GitHub, confirm a new commit on `main` touching only
   `src/content/pages/oddspace-venue.json`.
4. In Actions, confirm a CI run started for that commit.
5. Confirm it passes `checks` and all six `functional` shards.
6. Confirm the `deploy` job ran and its "Verify production is serving this
   deploy" step passed.
7. `curl -s https://allthingsodd.co/build-info.json` — the SHA must equal that
   commit. Then load `/oddspace/venue/` and see the new text.
8. Revert the edit in CloudCannon and confirm the whole loop again.

Success evidence: a commit SHA, a green run, that SHA in `build-info.json`,
and the text visibly changed and changed back. Anything less does not prove
the loop.

Editors can change every field a real editor would want, including the new
documents list. They cannot reach design tokens, CSS or ticket product keys —
those are deliberately out of CloudCannon. ODDspace's event-info and
code-of-conduct content is code-managed today; that is a defensible choice for
safety documents, but it does mean a floor-plan change needs a developer.

---

## Security

Fixed this pass: rate limiting on every public write path; server-side origin
rejection; control characters stripped before reaching a mail subject; a null
JSON body no longer 500s; the check-in key compared in constant time; vendor
response bodies no longer logged, so a visitor's name or email can no longer
land in Worker logs; and the order token out of GA4 and out of the address bar.

Verified sound and left alone: all SQL parameterised, including the dynamic
`IN` list; inventory and check-in concurrency handled by conditional `UPDATE`s
rather than read-then-write; money in integer minor units throughout;
payment recorded only from a signature-verified webhook; no secret in either
repository's current tree; `.dev.vars` never committed.

Residual, accepted, documented: a fixed-window limiter lets a burst straddle
two windows; simultaneous duplicate webhook delivery where the first attempt
then fails leaves an order visibly pending and recoverable by hand; Surge sets
no security headers and offers no way to add them, so CSP, Referrer-Policy,
Permissions-Policy and `X-Content-Type-Options` are absent on the website —
which is the same constraint as P5 and has the same two answers.

An OAuth token remains reachable in `odd-growth-os` git history. The grant was
revoked and re-consented on 2026-09-21; the old client secret still needs
deleting in Google Cloud. That repository must stay private regardless.
