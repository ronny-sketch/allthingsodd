# ODD Growth OS — Decisions log

Append-only. Each entry: date, decision, why, what it overrides, status.

---

## D1 — Replace Surge with Cloudflare Workers (staged, Astro stays static)

**Date:** 2026-08-21
**Decision:** Production hosting migrates from Surge to a single Cloudflare
Worker serving Astro's static build via Workers Static Assets, plus two
API routes (`/api/business-enquiry`, `/api/newsletter`) in the same Worker.
Astro's build architecture does **not** change — no `@astrojs/cloudflare`
adapter, no `output: "server"`. The site stays a static build; only where
it's served and how the two form endpoints run changes.

**Why:** `ops/GROWTH_OS_GUIDE.md` locks Cloudflare as the runtime/integration
layer, but this repo had zero Cloudflare presence — static Astro on Surge,
confirmed by preflight (see `ops/SETUP_STATUS.md` §0). Rather than bolt a
second hosting provider on (a standalone Worker called cross-origin from
Surge — the originally proposed "Option A"), Ronny chose full migration:
one platform for site + integrations, no CORS, no split ops surface.

**Overrides:** guide's assumption that Cloudflare was already the runtime;
my earlier proposal of a cross-origin standalone Worker alongside Surge.

**Migration sequence (do not skip steps):**

1. ✅ Preserve current Surge production — untouched, still serving
   `odd-field-guide.surge.sh`.
2. ✅ Build Cloudflare Worker config/runtime (`wrangler.toml`, `worker/`).
3. ⬜ Deploy to a Cloudflare preview/`workers.dev` environment — **BLOCKED**:
   needs a Cloudflare account (see Human Actions in `ops/SETUP_STATUS.md`).
4. ⬜ Verify visual/functional parity against Surge.
5. ⬜ Test `/api/business-enquiry` and `/api/newsletter` against real Attio/
   beehiiv accounts with TEST-prefixed records.
6. ⬜ Full acceptance pass: analytics, SEO, redirects, fonts, images, video,
   mobile, accessibility, 404s, forms.
7. ⬜ Cut production DNS/domain over to Cloudflare.
8. ⬜ Keep Surge live, unused, as rollback for an agreed grace period.
9. ⬜ Retire Surge; remove `SURGE_TOKEN` secret and the Surge deploy job.
10. ⬜ Update `docs/deployment.md` to make Cloudflare canonical (currently
    documents both states — see D1a below).

**Status:** IN_PROGRESS — steps 1–2 done and locally verified (see
`ops/TEST_REPORT.md`); step 3 onward blocked on a human-created Cloudflare
account.

### D1a — `AGENTS.md`'s "deploys are manual" line was stale

**Date:** 2026-08-21
**Finding:** `AGENTS.md`'s Deployment workflow section said "Deploys are
currently manual, not CI-automated," but `.github/workflows/ci.yml` has had
an automatic `deploy` job (push-to-`main`-triggered) for some time. The
actual repo state wins over stale docs, per Ronny's explicit instruction.
**Action:** Corrected in `AGENTS.md` and `docs/deployment.md` as part of
this same session (see those files' diffs) — not deferred, since deployment
mechanics are directly load-bearing for this migration.

---

## D2 — Notion: consolidate via mapping, not deletion

**Date:** 2026-08-21
**Decision:** Build a new "ODD Growth OS" Notion structure that links to and
indexes existing material; do not merge, delete, or archive the five
duplicate "Marketing Strategy" pages or any other existing page
autonomously. Julia already owns Notion archiving (per the existing
"Archive (Julia cleans)" page) — final cleanup is her call, not this
session's.
**Why:** Guide's own doctrine — no destructive Notion action without
explicit human approval — combined with Ronny's explicit instruction to
create a migration/consolidation _map_, not perform cleanup.
**What this produces:** a single new Notion page (linked from "Home: New
Nordic Way", not replacing it) that (a) indexes the Growth OS structure and
(b) lists every duplicate/overlapping page found, with a recommended
disposition, for a human to actually execute.

---

## D3 — Attio migration source: the existing Google Sheet + `CRM!!!` page

**Date:** 2026-08-21
**Decision:** The Google Sheet linked from "Home: New Nordic Way" (labelled
"For CRM") and the Notion page `CRM!!!` are **migration sources**, not
ongoing systems. Once Attio is live, this data gets audited, cleaned, and
mapped to the canonical schema (`schemas/*.yml`) — not copied in as-is,
and not left running in parallel indefinitely.
**Status:** NOT_STARTED — blocked on an Attio account existing at all.

---

## D4 — Pipeline stays exactly as guide §13 specifies

**Date:** 2026-08-21
**Decision:** target → engaged → qualified → discovery → opportunity →
proposal → procurement → won/lost → renewal_expansion. No `Delivery` stage
(the separate deep-research report's variant is not used).
**Why:** Delivery/project execution is operationally different from a sales
pipeline stage — it belongs in Notion project tracking or a deal-level
"delivery status" property, not as a pipeline stage a deal moves through.
Keeps the CRM's stage list matching guide's own `schemas/lifecycle.yml`
exactly, so there's one canonical list, not two documents disagreeing.

---

## D5 — Campaign naming: years are fine, version-churn suffixes are not

**Date:** 2026-08-21
**Correction to guide §26.6:** the rule was previously worded as "don't
include dates that make no operational sense," which read oddly next to its
own example (`oddference_2027_corporate`, which has a year). Corrected
wording: campaign names should use stable semantic identifiers; years/
seasons that denote a real recurring cycle are good practice, but avoid
version-churn suffixes (`final`, `final2`, `new`, `latest`, `test2`,
`use_this`). Fixed directly in `ops/GROWTH_OS_GUIDE.md`.

---

## D6 — OAuth/human-checkpoint handling policy

**Date:** 2026-08-21
**Decision:** A connector needing OAuth (Attio, beehiiv, GitHub, Cloudflare
account creation) is marked BLOCKED in `ops/SETUP_STATUS.md` with the exact
human action required, and every other non-blocked task continues in the
same session rather than pausing the whole implementation. This is the
standing interpretation of "continuous execution flow" for this project —
supersedes my earlier reading of the master prompt as requiring a stop at
every connector.
