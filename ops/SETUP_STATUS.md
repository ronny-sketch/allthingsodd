# ODD Growth OS v1 — Setup Status

Living tracker. Do not mark DONE without evidence (a successful tool call, a
visible artifact, or a documented human confirmation) — see `ops/TEST_REPORT.md`
for what's actually been verified vs. just written. Update this file at the
end of every work session on the Growth OS.

Allowed status: `NOT_STARTED` · `IN_PROGRESS` · `BLOCKED` · `DONE` · `DEFERRED` · `NOT_NEEDED`

Last updated: 2026-08-21 (session 2 — Cloudflare migration + forms build)

---

## 0. Preflight — repo & architecture audit

| Area                                               | Status                                | Evidence                                                                                                        |
| -------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Repo, branch, existing `AGENTS.md`/`docs/` audited | DONE                                  | `chore/odd-growth-os-v1` branch; `AGENTS.md` merged (not replaced); `docs/deployment.md` corrected and extended |
| Hosting/runtime decision (D1)                      | DONE — decided, migration IN_PROGRESS | See `ops/DECISIONS.md` D1: Cloudflare Workers Static Assets replaces Surge, staged, Astro stays static          |
| MCP connections (this session)                     | DONE                                  | Notion ✓ (read+write both verified this session). Attio, beehiiv, GitHub, Cloudflare: still none connected.     |

## 1. Notion — ODD Growth OS structure

| Item                               | Status                     | Evidence                                                                                                                                                                                                          |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "ODD Growth OS" index page created | DONE                       | `https://app.notion.com/p/3c3c5d3c59e581cb8b69c72185dd800c` — source-of-truth table, product/pipeline pointers, CRM migration map, Marketing Strategy duplication list (not resolved, flagged for human decision) |
| Linked from "Home: New Nordic Way" | DONE                       | One-line link inserted at the top of the existing Home page; verified by re-fetching — nothing else on that page touched                                                                                          |
| Existing Marketing Strategy pages  | NOT_STARTED (deliberately) | 5 duplicates found and listed on the new page; no merge/archive performed — Julia owns Notion archiving, per `ops/DECISIONS.md` D2                                                                                |
| Google Sheet CRM / `CRM!!!` page   | NOT_STARTED                | Documented as the Attio migration source; not touched                                                                                                                                                             |

## 2. Cloudflare Worker (site + Growth OS API routes)

| Item                                                                                       | Status                                                                 | Evidence                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wrangler.toml` (Workers Static Assets + Worker script)                                    | DONE, locally verified                                                 | `npx wrangler deploy --dry-run` succeeded: read 175 files from `dist/`, recognised `ASSETS` binding — see `ops/TEST_REPORT.md`                                                                                               |
| `worker/src/index.ts` router (`/api/business-enquiry`, `/api/newsletter`, static fallback) | DONE, locally verified                                                 | `wrangler dev` smoke test: static asset served (200), unknown API route (404), validation errors (400), honeypot (400) — all confirmed                                                                                       |
| `worker/src/adapters/attio.ts`                                                             | BUILT, endpoint reachability confirmed, **write behaviour unverified** | Real Attio API returned a structured `401 auth_error` to a dummy key — confirms the endpoint/request shape reaches Attio. Custom attribute slugs (`ATTRS` in that file) are unverified guesses until a real workspace exists |
| `worker/src/adapters/beehiiv.ts`                                                           | BUILT, endpoint reachability confirmed, **write behaviour unverified** | Same pattern — real `401 INVALID_API_KEY` from beehiiv's actual API                                                                                                                                                          |
| CI: `deploy-cloudflare-preview` job                                                        | DONE (added), **will fail until secrets exist**                        | Deploys to the default `*.workers.dev` preview subdomain only — does not touch Surge or DNS. Needs `CLOUDFLARE_API_TOKEN` repo secret. Safe failure mode, same pattern as the original `SURGE_TOKEN` gap.                    |
| Production DNS cutover                                                                     | NOT_STARTED, correctly blocked                                         | Per `ops/DECISIONS.md` D1 step sequence — Surge stays production until parity is verified                                                                                                                                    |

## 3. Website forms

| Item                                                            | Status                    | Evidence                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Work with ODD" business-enquiry form (`WorkEnquiryForm.astro`) | DONE, functionally tested | Replaced the generic 3-field `ContactForm` on `/work-with-odd` with organisation/interest/goal/timing + UTM capture. `npm run check`/`lint`/`build` clean; Playwright functional suite 15/15 passed including that page's own load/nav test                                      |
| Footer newsletter form → beehiiv                                | DONE, functionally tested | Replaced the bare `GET`-redirect-to-beehiiv with a same-origin POST to `/api/newsletter`, UTM/source capture added; native form attributes kept as a no-JS fallback (still redirects to `oddfest.beehiiv.com` if the fetch never runs)                                           |
| `/contact` generic form (Web3Forms)                             | UNCHANGED, deliberately   | Stays a simple "say hi" path — not upgraded to Attio in this pass, to avoid scope creep on a low-commercial-value form. Revisit if inbound volume there turns out to matter.                                                                                                     |
| Visual regression snapshots                                     | NOT_UPDATED, deliberately | The Work-with-ODD page's contact section will show an expected visual diff. Per this repo's own convention (`docs/architecture.md#visual-regression`), updating snapshots is a human review step (`npm run test:update-snapshots`), not something done silently in this session. |

## 4. Attio

| Item                                         | Status                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Account/workspace                            | NOT_STARTED — **BLOCKED, needs Ronny**                                                                                |
| Schema (People/Companies/Deals + attributes) | Designed (`ops/GROWTH_OS_GUIDE.md` §12, `worker/src/adapters/attio.ts` `ATTRS`) — not yet created in a real workspace |
| Google Sheet migration                       | Planned (Notion migration map) — not started                                                                          |
| TEST-record smoke test (guide §41)           | BLOCKED on account                                                                                                    | This is the gate before Attio can be marked DONE anywhere |

## 5. beehiiv

| Item                                  | Status                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Publication                           | Exists already: `oddfest.beehiiv.com` (confirmed via `src/content/site/global.json`)        |
| API key / write-plan access           | NOT_STARTED — **BLOCKED, needs Ronny** to confirm plan covers API writes and generate a key |
| TEST subscribe smoke test (guide §42) | BLOCKED on API key                                                                          |

## 6. GitHub MCP / Cloudflare MCP (Claude control-plane connectors)

| Item                  | Status                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GitHub MCP            | NOT_STARTED — not required for anything built so far (all GitHub actions this session used plain `git`/filesystem tools, not MCP) |
| Cloudflare MCP/plugin | NOT_STARTED — not required for anything built so far (Wrangler CLI used directly)                                                 |

## 7. MarketHype, GA4/Search Console

| Item               | Status                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ |
| MarketHype         | NOT_STARTED — unchanged from last session, still gated on integration evidence             |
| GA4/Search Console | NOT_STARTED — confirmed (this session) that no analytics tag exists anywhere in `src/` yet |

---

## Human actions required (exact, in priority order)

1. **Cloudflare account** — create one (or confirm one already exists), then:
   - Generate an API token with Workers Scripts:Edit permission → add as repo secret `CLOUDFLARE_API_TOKEN` (`gh secret set CLOUDFLARE_API_TOKEN --repo ronny-sketch/odd-field-guide`).
   - This alone makes the `deploy-cloudflare-preview` CI job start succeeding (to a `*.workers.dev` preview URL — not production).
2. **Attio account** — sign up (Free plan is fine for v1), then create the Deals object + attributes listed in `worker/src/adapters/attio.ts`'s `ATTRS` map, confirm their real `api_slug`s, and update that file if they differ from the guesses. Generate an API key.
3. **beehiiv API key** — confirm the current plan includes API write access (guide §18.1 — this can depend on plan tier), generate a key, find the publication ID for `oddfest.beehiiv.com`.
4. Once 2 and 3 exist: set `ATTIO_API_KEY`, `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` via `npx wrangler secret put <NAME>` (production) and in `worker/.dev.vars` (local dev, gitignored, copy from `.dev.vars.example`).
5. Run the guide's §41/§42 controlled TEST-record smoke tests against the real accounts before trusting either integration with real traffic.
6. Decide the Marketing Strategy page consolidation (5 duplicates listed on the new Notion "ODD Growth OS" page) — a human/Julia call, not automated.
7. When ready to actually go live on Cloudflare: work through the remaining `ops/DECISIONS.md` D1 steps (parity check, DNS cutover, Surge retirement) — deliberately not automated end-to-end given it's a live production domain.

## MCP QA

| Server     | Auth                                        | Read test                         | Write test                                                                 | Production dependency?                                       | Last verified |
| ---------- | ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------- |
| Notion     | OAuth (connected)                           | ✅                                | ✅ (created 1 page, linked from Home, one correction applied and verified) | No                                                           | 2026-08-21    |
| Attio      | Not connected                               | —                                 | —                                                                          | —                                                            | —             |
| beehiiv    | Not connected                               | —                                 | —                                                                          | —                                                            | —             |
| GitHub     | Not connected (used local `git` instead)    | —                                 | —                                                                          | —                                                            | —             |
| Cloudflare | Not connected (used `wrangler` CLI instead) | ✅ dry-run + local `wrangler dev` | Not attempted (no account)                                                 | Will become the primary hosting dependency once D1 completes | 2026-08-21    |
