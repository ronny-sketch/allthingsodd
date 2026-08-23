# ODD Growth OS — Architecture

Companion to `docs/architecture.md` (the **website's** own architecture —
content model, components, design tokens). This file is scoped to the
commercial-systems layer only: CRM, newsletter, and how the two connect to
the site. See `ops/SETUP_STATUS.md` for what's actually live vs. planned.

## System diagram

```
                         Claude Code (MCP, interactive only)
                                     |
                    -------------------------------------
                    |                                    |
                  Notion                              GitHub
           (strategy, SOPs,                    (this repo — code,
         "ODD Growth OS" index,                  schemas/, ops/,
          CRM migration map)                        worker/)
                                                        |
                                                  Cloudflare Worker
                                              (wrangler.toml, worker/)
                                             ___________|___________
                                            |                       |
                                    Workers Static Assets      /api/* routes
                                    (serves Astro's dist/,     (worker/src/index.ts)
                                     replaces Surge — D1)       __________|__________
                                                                |                    |
                                                        /api/business-enquiry  /api/newsletter
                                                                |                    |
                                                        worker/src/adapters/  worker/src/adapters/
                                                             attio.ts             beehiiv.ts
                                                                |                    |
                                                          Attio (CRM)          beehiiv (newsletter)

Ticketing (Tiketti/Venga) -> MarketHype (only if validated, not yet)
GA4/Search Console <- website measurement (not yet installed)
Google work Gmail/Calendar -> Attio native sync (not yet configured — no Attio account)
```

## Source-of-truth map

See `ops/SYSTEMS_OF_RECORD.md` for the full table. One-line version: Notion
owns strategy/SOPs, Attio owns commercial relationships/deals, beehiiv owns
newsletter subscribers, GitHub owns code + canonical schemas
(`schemas/*.yml`). No system holds a second authoritative copy of another's
data.

## Control plane vs. data plane (why this matters here specifically)

- **Data plane** — a website visitor submitting a form. This must work
  with zero AI involvement, deterministically, every time. That's
  `worker/src/index.ts` + its two adapters: plain validation, plain HTTP
  calls to Attio/beehiiv's REST APIs. No MCP anywhere in this path.
- **Control plane** — Claude (via the Notion MCP connector, and later Attio/
  beehiiv MCP once connected) analysing pipeline, drafting the weekly
  review, or updating an approved field interactively. Never the same code
  path as the data plane above.

## Environments

| Environment                          | What runs                                                                             | Status                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Local dev                            | `astro dev` (site only) or `wrangler dev` (site + `/api/*`, needs `worker/.dev.vars`) | Working, verified this session                               |
| CI (`checks` job)                    | `worker:check`, `worker:test` (mocked), site typecheck/lint/build                     | Working, verified this session                               |
| CI (`functional` job)                | Playwright against `astro preview` (site only — doesn't exercise `/api/*`)            | Working, pre-existing                                        |
| CI (`deploy` job)                    | Surge — **current production**                                                        | Working, pre-existing                                        |
| CI (`deploy-cloudflare-preview` job) | `wrangler deploy` to `*.workers.dev` — **preview only, not production**               | Added this session, blocked on `CLOUDFLARE_API_TOKEN` secret |
| Production                           | Still Surge until `ops/DECISIONS.md` D1's migration steps complete                    | Unchanged                                                    |

## Key design decisions (see `ops/DECISIONS.md` for full reasoning)

- **D1**: one Cloudflare Worker for static assets + API routes, not a
  cross-origin standalone Worker. Astro stays a static build.
- **D4**: pipeline stages match `schemas/lifecycle.yml` exactly — no
  `Delivery` stage.
- Adapters follow the `CrmAdapter`/`NewsletterAdapter` interface shape from
  the guide (`worker/src/types.ts`) so a future CRM/newsletter swap only
  requires a new adapter file, not a router rewrite.

## What would have to change if a component were swapped

- **Attio → another CRM**: rewrite `worker/src/adapters/attio.ts` against
  the `CrmAdapter` interface; `schemas/*.yml` and the router stay untouched.
- **beehiiv → another ESP**: same pattern via `NewsletterAdapter`.
- **Cloudflare → another host**: the static-Astro-plus-API-routes pattern
  isn't Cloudflare-specific in principle, but `worker/src/index.ts`'s
  `env.ASSETS.fetch()` call and `wrangler.toml`'s `[assets]` binding are
  Cloudflare Workers Static Assets-specific and would need re-writing for
  another platform's equivalent.
