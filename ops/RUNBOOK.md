# ODD Growth OS — Runbook

Written for someone who wasn't in the room when this was built. Start here;
`ops/ARCHITECTURE.md` has the "why", `ops/DECISIONS.md` has the history.

## If you just need to know "is this thing working"

1. Read `ops/SETUP_STATUS.md` top to bottom — it's the current live status,
   not a plan.
2. Read `ops/TEST_REPORT.md` for what's actually been verified vs. just
   written. "Built" and "verified against a real account" are different
   claims in that file — don't conflate them.

## Local development

```bash
npm install
npm run dev            # Astro site only, no /api/* routes
npm run worker:dev      # site + /api/business-enquiry + /api/newsletter (needs worker/.dev.vars)
```

Copy `worker/.dev.vars.example` → `worker/.dev.vars` (gitignored) and fill
in real keys to actually test the Attio/beehiiv calls locally. Without real
keys, both endpoints will validate correctly and then fail at the adapter
call with a real (logged, not leaked) auth error — that's expected and
useful for testing everything except the actual write.

## Before shipping any change to `worker/` or the two forms

```bash
npm run worker:check   # typecheck
npm run worker:test    # unit tests, adapters mocked — must be 19/19 (or more, if you add tests)
npm run check           # site typecheck
npm run lint
npm run format:check
npm run build
```

All of the above run in CI's `checks` job automatically — don't skip them
locally just because CI will catch it; catching it locally is faster.

## Weekly (once Attio/beehiiv are actually live — not yet)

- **Revenue review**: pipeline by product, deals with no next action
  (should be zero — the adapter always sets one on creation, but a human
  can still clear it later), stale opportunities.
- **CRM hygiene**: check Attio's saved views for "Active opportunities with
  missing next action" and "Next actions overdue" (guide §14 — these don't
  exist yet, create them when Attio is set up).
- **Integration error check**: `wrangler tail` (once deployed) or Cloudflare
  dashboard logs for repeated 502s from either adapter — a run of these
  usually means a revoked/expired API key.

## Monthly

- Pipeline hygiene pass in Attio.
- Review `ops/SETUP_STATUS.md`'s "Human actions required" list — anything
  still open after a month is worth actively chasing, not just leaving on
  the list.
- Connector access review: confirm the Notion MCP connection, and any
  others added since, are still scoped appropriately.

## Quarterly

- Revisit whether the `/contact` page's generic Web3Forms flow is still
  fine, or whether enough volume/value has shown up there to justify routing
  it through Attio too (deliberately deferred this session — see
  `ops/SETUP_STATUS.md` §3).
- Revisit MarketHype's integration gate (guide §25) if ticketing volume or
  needs have changed.
- SaaS stack review — confirm nothing on the "do not add" list (guide §2)
  has crept in without a documented reason (guide §60's justification
  format).

## Incident playbook

| Symptom                                                                                    | Likely cause                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business-enquiry or newsletter form shows the generic "couldn't submit" message repeatedly | Attio/beehiiv API key expired, revoked, or wrong publication ID                                                                                                                                                                                              | Check Worker logs for the real error (never shown to visitors, but logged server-side via `console.error`); rotate the key with `wrangler secret put`; the site itself is unaffected since static assets don't depend on `/api/*` |
| CI `deploy-cloudflare-preview` job failing                                                 | Expected until `CLOUDFLARE_API_TOKEN` repo secret is set                                                                                                                                                                                                     | Set the secret (see `ops/SETUP_STATUS.md` "Human actions required" #1) — until then this is a safe, non-blocking failure; the real `deploy` job (Surge) is unaffected                                                             |
| CI `deploy` job (Surge) failing                                                            | `SURGE_TOKEN` expired/missing, or a real build break                                                                                                                                                                                                         | Check which — a build break also fails `checks`/`functional` first; if only `deploy` fails, it's the token                                                                                                                        |
| Site looks broken after a CloudCannon content edit                                         | Check the `checks`/`functional`/`deploy` job sequence in GitHub Actions — a genuinely broken content edit fails `checks` and never deploys (safe failure)                                                                                                    | Fix the content, CloudCannon re-commits, CI re-runs                                                                                                                                                                               |
| Duplicate Attio company/person records appearing                                           | The upsert match key (`email_addresses` for people, `domains` for companies) didn't match an existing record — check for a typo'd domain or a free-email-provider organisation (personal emails don't get a domain match, by design — see `domainFromEmail`) | Manual merge in Attio; if this becomes frequent, consider adding a secondary match strategy                                                                                                                                       |
| Wrong product/interest showing on a new deal                                               | `worker/src/validate.ts`'s `PRODUCTS` set and `schemas/products.yml` have drifted (see `ops/DATA_DICTIONARY.md`'s "known drift risk")                                                                                                                        | Update both in the same commit                                                                                                                                                                                                    |

## Rollback

| What                                                                           | How                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A bad Worker deploy                                                            | `wrangler rollback` (once a deploy history exists) or redeploy the previous commit's `worker/` + `dist/`                                                                                                                    |
| Cloudflare migration needs to be abandoned mid-way                             | Surge is untouched throughout — DNS was never pointed at Cloudflare until D1's final step, so there's nothing to roll back on the production side                                                                           |
| A bad Attio/beehiiv secret rotation                                            | Previous key usually still valid for a grace period in most vendor dashboards — check there before assuming total lockout                                                                                                   |
| Disable the two Growth OS forms entirely without touching the rest of the site | Revert `src/pages/work-with-odd.astro` and `src/components/navigation/Footer.astro` to their pre-migration versions (git history), or simply stop deploying `worker/` and let Surge keep serving the unmodified static site |
