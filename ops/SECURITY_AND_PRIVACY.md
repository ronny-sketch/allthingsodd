# ODD Growth OS — Security & privacy

This documents technical controls actually implemented. It is not a legal
compliance statement — guide §50 is explicit about this, and it's worth
repeating: technical controls existing does not by itself mean GDPR or any
other legal requirement is satisfied. Get real legal review before treating
this as sufficient.

## Processors introduced by this work

| Processor  | What it receives                                                                                     | Status                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Attio      | Name, work email, organisation, product interest, free-text goal/timing                              | Not live yet — no data has been sent                                                                                                                   |
| beehiiv    | Email address, source/UTM tags                                                                       | Already ODD's existing newsletter processor — this work only changes _how_ subscribers reach it (server-side vs. redirect), not who processes the data |
| Cloudflare | The site's static assets + these two forms' request bodies transiently, in-memory, during processing | Not live yet                                                                                                                                           |
| Surge      | The site's static assets (current production, unchanged)                                             | Existing, unchanged                                                                                                                                    |

## Data flows (new, this session)

```
Visitor fills "Work with ODD" form
  → browser POST to same-origin /api/business-enquiry (no third-party JS involved)
  → Worker validates + sanitizes server-side
  → Worker calls Attio API with the Worker's own secret (never sent to the browser)
  → Attio stores the record
  → Worker returns a generic success/failure message to the browser (never Attio's raw response)
```

```
Visitor fills footer newsletter form
  → browser POST to same-origin /api/newsletter
  → Worker validates + sanitizes server-side
  → Worker calls beehiiv API with the Worker's own secret
  → beehiiv stores/updates the subscriber
  → Worker returns a generic success/failure message
```

Neither flow sends personal data to GA4/analytics (none is installed yet
anyway — see `ops/SETUP_STATUS.md` §7), and neither exposes an API key to
browser JavaScript at any point — confirmed by code review of
`worker/src/index.ts` and both adapters (secrets only ever appear in
`Authorization` headers on server-side `fetch()` calls).

## Secrets

| Secret                                      | Where it lives (intended)                                                                    | Where it must NOT live                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ATTIO_API_KEY`                             | Cloudflare Worker secret (`wrangler secret put`); local dev in gitignored `worker/.dev.vars` | Never in `.env`, never committed, never in Notion/README |
| `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` | Same pattern                                                                                 | Same                                                     |
| `CLOUDFLARE_API_TOKEN`                      | GitHub repository secret (CI only)                                                           | Never in a workflow file's plaintext, never committed    |
| `SURGE_TOKEN`                               | GitHub repository secret (existing, pre-dates this session)                                  | Unchanged                                                |

`.gitignore` covers `worker/.dev.vars`, `worker/.dev.vars.*`, and `.wrangler/`
(added this session) alongside the pre-existing `.env`/`.env.production`
entries. No secret value has been written to any file in this repo at any
point this session — verified by the fact that a dummy placeholder key was
used for local testing and then the file containing it was deleted (see
`ops/TEST_REPORT.md`).

## OAuth / auth scopes

| Connector                           | Scope granted                                                                                                                 | Notes                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Notion MCP                          | Full workspace (see `ops/INTEGRATIONS.md` — this is inherent to how Notion's MCP auth works, not a deliberately broad choice) | Writes self-restricted to one new page + one link, by discipline, not by permission scoping |
| Attio/beehiiv/GitHub/Cloudflare MCP | Not connected                                                                                                                 | N/A                                                                                         |

## Email/calendar sync (Attio ↔ Google Workspace)

**Not configured — no Attio account exists.** When it is: guide §15
requires the _work_ Gmail/Calendar account only (never personal), the most
conservative email-visibility setting available (prefer metadata-only), and
automatic contact creation disabled at first. This is a deliberate future
step, not something this session touched.

## Analytics / consent

No analytics tag exists in this codebase (confirmed by grep this session).
When GA4 is eventually added, guide §33 applies: EEA consent-mode signals,
no PII in event parameters, no Meta/LinkedIn pixels without a documented
reason and valid consent implementation.

## Personal data categories handled by the new forms

- Business enquiry: name, work email, organisation, free-text goal/timing
  (may incidentally contain personal detail if a visitor writes it) — all
  clearly volunteered by the visitor for the stated purpose (being contacted
  by ODD about a business enquiry).
- Newsletter: email address only.

Neither form collects budget, phone number, or any special-category data.

## Test data

The only "test" data created this session was a dummy Attio/beehiiv API key
used locally for `wrangler dev` (never a real record — both calls failed at
auth, by design, confirming reachability without writing anything). No real
Attio/beehiiv account exists yet, so no TEST-prefixed record has been
created or needs cleanup.

## Retention/deletion ownership

Not yet defined — depends on Attio's and beehiiv's own data-retention
settings once those accounts exist. Add this to the guide §41/§42 smoke-test
follow-up.

## Incident/rollback contacts

Placeholder — fill in once the Cloudflare migration goes live:

| Scenario                              | Action                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Form submissions failing              | Check Worker logs (`wrangler tail` once deployed); the site itself stays up regardless (static assets don't depend on `/api/*` working) |
| Attio/beehiiv API down or key revoked | Forms fail closed with the generic message (guide §64) — no crash, no secret leak; fix the key/secret and redeploy                      |
| Cloudflare deploy broken              | Surge remains production until D1's migration is signed off — no exposure                                                               |
| Compromised credential                | Rotate via `wrangler secret put` (Worker secrets) or the relevant vendor dashboard (Attio/beehiiv); GitHub secrets via repo settings    |
