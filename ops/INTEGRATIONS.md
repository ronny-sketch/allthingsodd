# ODD Growth OS — Integrations

Two kinds of integration exist here, and they're deliberately built
differently (guide §4):

- **MCP connectors** — Claude's control-plane access, interactive, for
  analysis/drafting/approved updates. Currently: Notion only.
- **Direct API adapters** — deterministic server code in `worker/src/adapters/`,
  called from `worker/src/index.ts`, never involving an LLM at request time.
  Currently: Attio, beehiiv.

## MCP connectors

| Server     | Auth                                                                            | Scope                                                                                                                 | Read test                          | Write test                                                                                                    | Write restrictions                                                                                        | Production dependency?                                                                                                                                              | Last verified |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Notion     | OAuth, already connected (workspace: "New Nordic Way")                          | Full workspace — not scoped to a subset (guide's own caveat: MCP acts with the full authenticated user's permissions) | ✅ `notion-search`, `notion-fetch` | ✅ created 1 page, inserted 1 link into an existing page, corrected 1 formatting mistake found by re-fetching | Writes confined to the new "ODD Growth OS" page + one link line on "Home" — no other existing page edited | No — Notion is never in the request path of a live form submission                                                                                                  | 2026-08-21    |
| Attio      | Not connected                                                                   | —                                                                                                                     | —                                  | —                                                                                                             | —                                                                                                         | Will become the MCP layer for interactive pipeline review once connected — not required for the deterministic form → Attio path, which uses the API adapter instead | —             |
| beehiiv    | Not connected                                                                   | —                                                                                                                     | —                                  | —                                                                                                             | —                                                                                                         | Same as Attio — MCP is for analysis, not the subscribe path                                                                                                         | —             |
| GitHub     | Not connected                                                                   | —                                                                                                                     | —                                  | —                                                                                                             | —                                                                                                         | Not required — this session used local `git` directly                                                                                                               | —             |
| Cloudflare | Not connected (used `wrangler` CLI directly, which doesn't need the MCP plugin) | —                                                                                                                     | —                                  | —                                                                                                             | —                                                                                                         | Will become production-critical once D1's migration completes                                                                                                       | —             |

## Direct API adapters (data plane)

### Attio (`worker/src/adapters/attio.ts`)

- **Base URL:** `https://api.attio.com/v2`
- **Auth:** Bearer API key, via `ATTIO_API_KEY` (Worker secret, not yet set — no account exists)
- **Endpoints used:** `PUT /objects/people/records?matching_attribute=email_addresses` (upsert), `PUT /objects/companies/records?matching_attribute=domains` (upsert), `POST /objects/deals/records` (create), `POST /notes`
- **Verified this session:** endpoint reachability only — a dummy key got a real, structured `401 auth_error` back from Attio's actual API (see `ops/TEST_REPORT.md`). Custom attribute slugs in the `ATTRS` constant (`stage`, `product`, `source`, `utm_*`, `next_action*`) are **unverified guesses** — Attio assigns real slugs per-workspace once the Deals object and its custom attributes are actually created.
- **Before first real use:** create the workspace, People/Companies (built-in) + Deals object with those attributes, confirm real slugs, update `ATTRS` if they differ, run the guide §41 TEST-record smoke test.

### beehiiv (`worker/src/adapters/beehiiv.ts`)

- **Base URL:** `https://api.beehiiv.com/v2`
- **Auth:** Bearer API key, via `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID` (neither set yet)
- **Endpoint used:** `POST /publications/{publication_id}/subscriptions`
- **Publication:** `oddfest.beehiiv.com` (confirmed from `src/content/site/global.json`'s existing `newsletterHref`)
- **Verified this session:** endpoint reachability only — a dummy key got a real `401 INVALID_API_KEY` back.
- **Before first real use:** confirm the current beehiiv plan includes API write access (guide §18.1 flags this as plan-dependent), generate a key, find the real publication ID, run the guide §42 smoke test.

## Cloudflare (hosting/runtime, not an "integration" in the CRM sense)

- **Config:** `wrangler.toml` at repo root
- **Verified this session:** `npx wrangler deploy --dry-run` succeeded locally (see `ops/TEST_REPORT.md`); no live account/deploy yet.
- **CI:** `.github/workflows/ci.yml`'s `deploy-cloudflare-preview` job will attempt a real deploy on the next push to `main`, and will fail cleanly (auth error) until `CLOUDFLARE_API_TOKEN` is set as a repo secret — same safe-failure pattern the original `SURGE_TOKEN` gap used.
