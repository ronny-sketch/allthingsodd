# ODD Growth OS v1 — Claude Code Master Execution Prompt

You are the lead systems architect, senior full-stack engineer, RevOps engineer, automation architect, security reviewer, and implementation agent for ODD.

Your task is to IMPLEMENT — not merely recommend — the complete ODD Growth OS v1 setup described in `ODD_GROWTH_OS_IMPLEMENTATION_GUIDE.md`.

Work in one continuous execution flow. Do not stop after analysis or give me a list of things I should do manually unless the step literally requires human authentication, 2FA, OAuth consent, account ownership, payment approval, nonprofit verification, or a vendor decision that cannot be made from available evidence.

When a human action is unavoidable:

1. State the exact action I need to take in one concise block.
2. Continue all other non-blocked implementation work immediately.
3. Maintain the blocker in `ops/SETUP_STATUS.md`.
4. Resume the blocked task as soon as authentication or access becomes available.

## Primary objective

Build a minimal, robust, AI-native, low-cost commercial operating system for ODD that connects:

- Google Workspace — identity, Gmail, Calendar, Drive
- Notion — internal operating system, strategy, projects, SOPs, decisions, content planning
- GitHub — code, technical source of truth, schemas, CI/CD, implementation history
- Astro website — public experience and conversion layer
- Cloudflare — hosting/runtime/API integration layer
- Attio — B2B/B2G CRM and commercial source of truth
- beehiiv — editorial/newsletter source of truth
- MarketHype — event audience/customer layer ONLY if its real integration capabilities with ODD’s ticketing stack are validated
- GA4 + Google Search Console — website/search measurement
- Claude Code — implementation and AI control layer through MCP + code

Do NOT add another SaaS product unless a required workflow cannot be solved safely with the systems above and you document why.

## Architecture principle

MCP is the AI/control plane.

APIs, webhooks, native integrations and deterministic Cloudflare code are the production/data plane.

Do not make an LLM responsible for deterministic production data movement that can be handled by normal code.

Examples:

Correct:
Website form -> validated server endpoint -> Attio API -> deterministic result.

Incorrect:
Website form -> AI agent decides what record to create.

Correct:
Claude uses Attio MCP to analyze pipeline, prepare follow-ups, or update approved CRM fields interactively.

Incorrect:
An unattended agent autonomously changes deal values, consent records, closes deals, or sends strategic outreach.

## Sources of truth

These boundaries are mandatory:

- Google Workspace = identity, email, calendar, conventional files
- Notion = human-facing operating system, projects, strategy, SOPs, meetings, decisions, learnings
- GitHub = code, technical specs, canonical machine-readable schemas, automation code, CI/CD
- Attio = B2B/B2G people, companies, commercial opportunities, sales next actions
- beehiiv = editorial subscribers, newsletter content and newsletter engagement
- Ticketing provider = transactions/tickets
- MarketHype = event audience/customer lifecycle only if validated
- GA4/Search Console = website/search measurement

Never create a second authoritative copy of the same data in another system.

Do not turn Notion into the CRM.
Do not put all newsletter subscribers or ticket buyers into Attio.
Do not use beehiiv as a CRM.
Do not use MCP as the production sync engine.
Do not create duplicate Notion databases if suitable ones already exist.

## Working mode

Before changing anything:

1. Read `ODD_GROWTH_OS_IMPLEMENTATION_GUIDE.md` fully.
2. Inspect the entire current repository and existing architecture.
3. Inspect `git status`, branch, remotes, package manager, deployment config, environment setup, Astro/Cloudflare implementation, forms, analytics, and existing integrations.
4. Search the connected Notion workspace for existing pages/databases relevant to ODD operations before creating anything.
5. Inspect existing beehiiv setup before changing it.
6. Inspect Attio if already configured; otherwise prepare and connect it.
7. Do not rewrite or migrate working architecture merely to match an example in the guide.
8. Prefer adaptation and minimal change.

After the repository audit, create or safely merge a root `CLAUDE.md` that makes the final ODD architecture, sources of truth, security rules, testing requirements, and "do not add SaaS without evidence" rule persistent for future Claude Code sessions. If `CLAUDE.md` already exists, preserve all relevant existing project instructions and merge rather than replace.

Create or update:

- `CLAUDE.md`
- `ops/SETUP_STATUS.md`
- `ops/ARCHITECTURE.md`
- `ops/SYSTEMS_OF_RECORD.md`
- `ops/DATA_DICTIONARY.md`
- `ops/INTEGRATIONS.md`
- `ops/SECURITY_AND_PRIVACY.md`
- `ops/RUNBOOK.md`
- `ops/DECISIONS.md`
- `ops/TEST_REPORT.md`
- canonical schemas under `schemas/`
- integration code under the structure that best fits the existing repository

If an `ops/` or equivalent documentation system already exists, reuse it rather than duplicating it.

## Git safety

- Never overwrite unrelated uncommitted work.
- Inspect `git status` first.
- Work on a dedicated branch such as `chore/odd-growth-os-v1` if safe and appropriate.
- Make small logical commits.
- Do not force push.
- Do not delete branches.
- Do not merge to production/main without tests passing.
- If the repository already has its own branch/release convention, follow it.
- Never commit secrets.
- Keep `.env`, `.dev.vars`, credentials, OAuth secrets, PATs, service tokens and production secrets out of Git.
- Create/update `.env.example` using placeholders only.
- Use Wrangler secrets / Cloudflare secrets for production runtime values and GitHub environment secrets for CI where appropriate.

## Connector setup

Configure the initial Claude Code MCP/control plane, using current official vendor documentation and OAuth wherever supported:

Priority v1:

1. Notion MCP
2. Attio MCP
3. beehiiv MCP
4. GitHub MCP
5. Cloudflare MCP / Cloudflare Claude Code plugin

Google Workspace MCP:

- Treat as optional/experimental because Google’s official Workspace MCP servers are currently Developer Preview.
- Do NOT make production workflows depend on Workspace MCP.
- Stable Gmail/Calendar relationship history should primarily reach Attio through Attio’s native Google sync.
- If the Google Workspace Developer Preview is already enabled and authentication can be configured safely, you may connect it as an optional read/action layer and document the preview status.

For every MCP:

- verify current official setup docs before installation;
- use least privilege;
- prefer OAuth;
- do not expose credentials in project files;
- test read access first;
- test one harmless write only where appropriate;
- document capabilities and permissions in `ops/INTEGRATIONS.md`.

Important current endpoints to VERIFY before use:

- Notion: `https://mcp.notion.com/mcp`
- Attio: `https://mcp.attio.com/mcp`
- beehiiv: `https://mcp.beehiiv.com/mcp`
- Cloudflare API MCP: `https://mcp.cloudflare.com/mcp`
- GitHub remote MCP: use GitHub’s current official Claude Code installation method

Do not blindly trust these strings if official docs have changed. Verify first.

## Attio setup

Attio is the v1 CRM because ODD is currently budget constrained. Configure it around the portable ODD schema.

On the Free plan use:

- People
- Companies
- Deals as the one additional standard object

During initial Gmail/Calendar connection:

- sync only the relevant ODD work mailbox, never a personal mailbox;
- use conservative email visibility;
- prefer metadata-only sharing;
- prevent uncontrolled record creation during migration;
- start with automatic contact creation disabled or the most restrictive appropriate option;
- import/construct the strategic relationship set intentionally;
- only change this after reviewing the resulting data quality.

Create the pipeline:

Target
Engaged
Qualified
Discovery
Opportunity
Proposal
Procurement
Won
Lost
Renewal / Expansion

Implement fields from the guide.

Mandatory CRM rules:

1. No proposal without discovery.
2. Every active opportunity has an owner, next action and next action date.
3. “Interested” or “they liked it” is not a valid pipeline stage.
4. Ticket buyers and passive newsletter subscribers do not automatically become CRM records.
5. Never let AI modify consent/legal-basis fields autonomously.

## Notion setup

ODD already uses Notion.

Do not create a new parallel workspace.

Use Notion MCP to audit existing structures first.

Create or normalize an `ODD Growth OS` home only if needed, containing or linking to:

- Dashboard
- Strategy & Goals
- Products & Offers
- Projects
- Marketing & Content
- Experiments
- SOPs
- Meetings
- Decisions
- Research & Insights
- Growth OS documentation

Reuse existing databases where they already serve the purpose.

Notion is for humans.
GitHub is canonical for machine-readable schemas and code.

If a rule is implemented in code, Notion should explain it and link to the canonical implementation rather than maintaining a second independent version.

## beehiiv setup

ODD already uses beehiiv and likes it.

Preserve it.
Do not migrate newsletter data.

Audit:

- publication/workspace
- current subscriber fields/tags/segments
- existing forms
- automations
- domain setup
- tracking
- current plan and MCP permissions

Connect MCP.

Note that beehiiv MCP write capabilities may depend on plan. Do not upgrade automatically.

For production website subscription:

- prefer existing safe beehiiv form if already correct, OR
- use beehiiv API through server-side integration if that materially improves UTM/source capture and styling;
- never expose beehiiv secrets client-side.

## MarketHype

MarketHype is CONDITIONAL.

Do not invent an integration.

Validate using the actual account and/or current official vendor information:

- Tiketti integration?
- Venga integration?
- API?
- webhooks?
- automated exports?
- purchase/attendance sync?
- UTM/referrer preservation?
- consent fields?
- data ownership/export?
- what exactly is included in ODD’s free access?

Record evidence and status in `ops/integrations/markethype.md`.

If strong integration exists:
implement the cleanest supported architecture.

If not:
do not create brittle scraping or fake API code.
Implement a documented CSV/batch-import fallback only if useful.
Leave a clear adapter boundary for future integration.

## Website conversion layer

Audit the existing website before creating anything.

Ensure clean paths for at least:

- Work with ODD -> Attio
- Strategic partnership enquiry -> Attio
- ODDagency / organisational brief -> Attio
- Membership conversation -> Attio
- ODDspace enquiry/visit -> appropriate commercial workflow
- Cities & Institutions -> Attio
- Newsletter subscribe -> beehiiv
- Event purchase/register -> existing transaction system

Business enquiry should stay short:

- name
- work email
- organisation
- interest
- what they want to achieve
- approximate timing
- hidden source/UTM context

Do not ask budget on the first lightweight form unless the current business process proves it is necessary.

Use server-side validation.
Add spam/rate-limit protection proportionate to the risk.
Add idempotency/deduplication.
Never expose CRM or newsletter API secrets in frontend JavaScript.

## Canonical data taxonomy

Create machine-readable canonical definitions under `schemas/` and generate or map application types from them where practical.

Audience:

- business
- creative
- city_institution
- partner
- funder
- press

Product:

- strategic_partnership
- oddagency
- oddmembership
- oddference_corporate
- oddspace
- creative_week_partnership
- city_institution_programme
- other

Lifecycle / opportunity stage:

- target
- engaged
- qualified
- discovery
- opportunity
- proposal
- procurement
- won
- lost
- renewal_expansion

Source:

- founder
- referral
- partner
- event
- linkedin
- instagram
- beehiiv
- organic_search
- pr
- direct
- paid_search
- meta
- institution
- other

UTM:

- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term

Create a deterministic campaign naming convention and document it.

## Analytics

Audit existing GA4/Search Console before changing them.

Do not install duplicate analytics tags.

Create only useful conversion events.

Examples:

- audience_route_view
- work_with_odd_submit
- partnership_enquiry_submit
- agency_enquiry_submit
- membership_enquiry_submit
- space_enquiry_submit
- city_programme_enquiry_submit
- newsletter_subscribe
- ticket_outbound_click

Preserve consent requirements for EEA users.
Do not add Meta/LinkedIn/retargeting pixels simply because they exist.
Paid media is not part of v1 unless explicitly requested later.

## v1 deterministic automations

Implement only high-value workflows:

1. Business enquiry
   Website -> server-side endpoint -> Attio person/company -> deal or qualified lead representation -> source/UTMs -> owner/task -> acknowledgement.

2. Newsletter signup
   Website -> beehiiv -> source/UTM metadata where supported -> confirmation/welcome handled in beehiiv.

3. Sales relationship history
   Google work Gmail/Calendar -> Attio native sync.

4. Stale opportunity
   Use Attio native workflow if available and economical; otherwise surface it through a weekly CRM review rather than adding middleware.

5. Event attendee lifecycle
   MarketHype only if actual supported integration is validated; otherwise documented import process.

6. Weekly Growth OS review
   Build a repeatable Claude-assisted workflow that reads the relevant sources and updates a Notion weekly review page/template WITHOUT silently changing source-of-truth values.

Do not add Make/Zapier/n8n unless a real integration gap requires one.

## Security and privacy

Apply least privilege everywhere.

Never:

- commit secrets;
- use a personal mailbox for CRM sync;
- expose API keys in frontend code;
- copy full mailbox data into Notion;
- send autonomous strategic outreach;
- change consent records via AI;
- delete CRM records in bulk without explicit human approval;
- deploy destructive production changes without a backup/rollback path.

Create an explicit data-flow inventory:
system -> data -> purpose -> source -> destination -> retention/ownership notes.

Document every third-party processor used by the new implementation.

## Testing

Before production:

- lint
- format
- typecheck
- unit tests
- build
- link checks
- integration adapter tests with mocks
- staging tests
- form validation tests
- duplicate-submission tests
- analytics event tests
- UTM preservation tests
- secret scanning
- accessibility checks for changed UI
- mobile checks
- error-state checks

For live external integrations:

- run one controlled test contact with an obvious TEST prefix;
- verify created data manually;
- clean it up only after verification and with safe deletion rules;
- never test with a real partner record.

Create `ops/TEST_REPORT.md` with evidence.

## Final acceptance criteria

Do not call the task complete until:

- existing architecture has been audited;
- the repo is clean and documented;
- no secrets are committed;
- Notion has a clear ODD Growth OS structure without unnecessary duplication;
- Attio is configured with People/Companies/Deals and the required fields/pipeline;
- work Gmail/Calendar relationship sync is configured conservatively or a precise manual auth blocker is documented;
- beehiiv is preserved and connected;
- the site has working measurable conversion routes;
- website -> CRM works end-to-end in a controlled test;
- website -> beehiiv works end-to-end or the existing beehiiv flow is intentionally retained and documented;
- MarketHype is either validated/integrated or explicitly marked conditional with evidence;
- GA4/Search Console are audited and conversion events are documented;
- Claude Code MCP connections are configured and tested where authentication permits;
- production automation uses deterministic APIs/native integrations rather than LLM decision making;
- CI/build/test gates pass;
- rollback instructions exist;
- `ops/SETUP_STATUS.md` shows DONE / BLOCKED / DEFERRED for every area;
- `ops/RUNBOOK.md` tells a future operator exactly how to maintain the system.

## Completion report

At the end, give me a concise execution report containing:

1. What you found before changes.
2. What you changed.
3. What systems are connected.
4. What tests passed.
5. Any human-authentication steps still required.
6. Any MarketHype uncertainty.
7. Current recurring software cost.
8. Security/privacy decisions.
9. Deferred items and why.
10. Exact next seven operating actions.

Do not end with vague recommendations.

Execute the implementation now.
