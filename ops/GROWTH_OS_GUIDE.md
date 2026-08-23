# ODD Growth OS v1

## Claude Code / VS Code implementation guide

**Status:** implementation specification  
**Primary execution environment:** VS Code + Claude Code CLI  
**Architecture date:** 21 August 2026  
**Purpose:** turn ODD’s growth, sales, marketing, relationship and measurement work into one minimal, standardized, low-cost operating system.

---

# 1. What this guide is for

This document is not another tool comparison.

It is the implementation specification for the actual ODD Growth OS.

The target outcome is a system where ODD can:

1. understand what it is selling;
2. know which organisations and people matter;
3. capture every meaningful commercial relationship;
4. route website intent into the right system;
5. keep editorial and event audiences cleanly separated;
6. automate routine data movement;
7. use Claude as a cross-system operator without making AI the source of truth;
8. see what is moving toward revenue every week;
9. preserve data portability so ODD can change SaaS vendors later;
10. run the system with very low software cost and very little administrative overhead.

The software is subordinate to the commercial model.

The system is successful only if it makes ODD better at:

**relationship creation -> qualified opportunity creation -> revenue -> delivery -> proof -> retention -> creative-economy impact.**

---

# 2. Locked v1 architecture

Unless a preflight audit finds a concrete blocker, implement this architecture.

| Layer                     | System                        | Role                                                                              |
| ------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| Identity/work             | Google Workspace              | Gmail, Calendar, Drive, Docs, Sheets, identity                                    |
| Team operating system     | Notion                        | strategy, projects, SOPs, decisions, meetings, content planning, learnings        |
| Technical source of truth | GitHub                        | code, schemas, automations, CI/CD, technical documentation                        |
| Public web                | Existing Astro site           | website, audience routes, content and conversion UI                               |
| Runtime/integration       | Cloudflare                    | deployment, Workers/Pages functions, server-side API glue, secrets, rate limiting |
| Commercial CRM            | Attio                         | B2B/B2G people, companies, deals, sales tasks and relationship context            |
| Editorial audience        | beehiiv                       | newsletter subscribers, editorial content, newsletter engagement                  |
| Event audience            | MarketHype, conditional       | ticket/event customer lifecycle only after real integration validation            |
| Transactions              | Existing ticketing/Venga/etc. | purchases, tickets, check-in                                                      |
| Web measurement           | GA4 + Search Console          | site/search/conversion measurement                                                |
| AI engineering            | Claude Code                   | implementation, maintenance, MCP control plane                                    |
| Creative production       | Canva, existing tools         | design only; not part of operational data architecture                            |

Do not introduce:

- HubSpot
- Brevo
- Mailchimp
- ActiveCampaign
- Pipedrive
- Clarify
- Zero
- Tally
- Cal.com
- Airtable
- Make
- Zapier
- n8n
- PostHog
- Mixpanel
- separate BI
- separate project-management tool

unless a concrete, documented workflow cannot be solved safely and economically by the locked stack.

This is not a claim that those products are bad. It is a complexity constraint.

---

# 3. Architectural doctrine

## 3.1 Every important type of information has one owner

A source of truth is the system whose value wins if another system disagrees.

### Google owns

- user identity;
- email;
- calendar;
- shared conventional files;
- raw correspondence.

### Notion owns

- strategy;
- goals;
- projects;
- operating plans;
- campaign briefs;
- meeting records that are intentionally documented;
- SOPs;
- decisions;
- human-readable learnings.

### GitHub owns

- source code;
- technical implementation;
- machine-readable data schemas;
- integration adapters;
- deployment configuration;
- CI/CD;
- technical runbooks that must stay synchronized with code.

### Attio owns

- B2B/B2G people;
- B2B/B2G companies;
- deals/opportunities;
- account tiers;
- commercial relationship fields;
- deal stage;
- deal value;
- owner;
- next commercial action;
- next-action date;
- won/lost reason.

### beehiiv owns

- editorial subscribers;
- publication content;
- newsletter segments;
- newsletter engagement;
- newsletter lifecycle automations.

### Ticketing owns

- ticket purchase;
- transaction;
- entitlement;
- ticket status;
- check-in if captured there.

### MarketHype owns, only if validated

- event-customer audience profile;
- event campaign lifecycle;
- attendance/purchase-based event segments;
- event-specific communication automation;
- event customer analysis.

### GA4/Search Console own

- web and search measurement.

---

# 4. MCP vs API: mandatory distinction

This is the single most important technical principle in the build.

## MCP is the control plane

Use MCP when a human or Claude is intentionally asking a system to:

- search;
- analyse;
- summarize;
- create an approved note;
- update an approved CRM value;
- create a task;
- prepare a report;
- retrieve context;
- assist with maintenance.

Examples:

> “Show every Tier A company with no next action.”

> “Summarize the last three interactions with Company X.”

> “Create a Notion weekly review using these approved metrics.”

> “Find beehiiv posts that drove the strongest subscriber growth.”

## APIs/webhooks/native integrations are the data plane

Use deterministic integration for:

- form submissions;
- subscriber creation;
- CRM record creation;
- UTM storage;
- ticket-event syncing;
- analytics events;
- server-to-server system updates.

A user submitting a website form must not depend on an LLM interpreting the submission.

---

# 5. Preflight: do not change anything yet

Claude must begin by producing an inventory.

## 5.1 Repository inspection

Run/inspect:

```bash
pwd
git status
git branch --show-current
git remote -v
git log -10 --oneline
ls -la
find . -maxdepth 2 -type f | sort
```

Determine:

- repository purpose;
- current branch strategy;
- package manager;
- Node version;
- Astro version;
- Cloudflare integration;
- build command;
- dev command;
- test command;
- lint/format tools;
- environment files;
- analytics code;
- existing forms;
- existing server/API endpoints;
- deployment method;
- existing CI;
- existing documentation;
- existing Claude instructions;
- existing MCP config.

Never overwrite unrelated dirty files.

## 5.2 Existing system audit

Before creating anything, document:

```text
Google Workspace:
- domain
- work mailbox used
- admin access available?
- nonprofit status?
- current shared drives?

Notion:
- workspace
- existing ODD strategy pages
- existing project databases
- existing content databases
- existing SOP/knowledge structure
- duplication risk

Attio:
- workspace exists?
- plan
- users
- objects enabled
- existing records
- existing fields
- Gmail/calendar connection

beehiiv:
- publication
- plan
- subscriber count
- forms
- segments
- tags/custom fields
- automations
- domain
- API/MCP access

Cloudflare:
- account
- zone
- project
- Workers/Pages
- environments
- secrets
- custom domain
- analytics

GitHub:
- organisation
- repository
- nonprofit plan status
- branch protection
- Actions
- environments/secrets

MarketHype:
- account access
- free-access terms
- connected ticketing
- documented integrations
```

Write the result to `ops/SETUP_STATUS.md`.

---

# 6. Safe branch and implementation workspace

If the repository is clean and uses normal Git branching:

```bash
git switch -c chore/odd-growth-os-v1
```

If a branch convention exists, use it instead.

Do not create a branch if doing so would break an active deployment convention.

Add or normalize:

```text
ops/
schemas/
```

A recommended structure is:

```text
/
├── ops/
│   ├── SETUP_STATUS.md
│   ├── ARCHITECTURE.md
│   ├── SYSTEMS_OF_RECORD.md
│   ├── DATA_DICTIONARY.md
│   ├── INTEGRATIONS.md
│   ├── SECURITY_AND_PRIVACY.md
│   ├── RUNBOOK.md
│   ├── DECISIONS.md
│   ├── TEST_REPORT.md
│   └── integrations/
│       ├── attio.md
│       ├── beehiiv.md
│       ├── notion.md
│       ├── github.md
│       ├── cloudflare.md
│       ├── google-workspace.md
│       └── markethype.md
├── schemas/
│   ├── audience.yml
│   ├── products.yml
│   ├── lifecycle.yml
│   ├── source.yml
│   ├── campaign.yml
│   ├── utm.yml
│   └── crm.yml
└── ...
```

If equivalent directories already exist, reuse them.

If the repository already contains `CLAUDE.md`, read it before doing any implementation work and preserve all relevant existing instructions.

After the preflight, create or merge a root `CLAUDE.md` containing only durable operating instructions, including:

```text
ODD system-of-record boundaries
MCP = control plane / APIs = data plane
secret-handling rules
testing/deployment gates
canonical schema locations
integration adapter locations
no duplicate SaaS rule
no autonomous strategic outreach rule
no destructive production actions without approval
```

Do not turn `CLAUDE.md` into a copy of this entire guide. Keep it concise enough to be loaded every future session.

---

# 7. Local development / VS Code setup

The goal is a stable terminal-first Claude Code workflow inside VS Code.

## 7.1 Verify required tools

Do not blindly reinstall. Check first:

```bash
node --version
npm --version
git --version
gh --version || true
claude --version || true
wrangler --version || npx wrangler --version
code --version || true
```

Use the repository’s existing package manager. Do not switch npm/pnpm/yarn simply for preference.

Use the existing Node version file if present:

```text
.nvmrc
.node-version
.tool-versions
package.json engines
```

## 7.2 Claude Code

Use the currently supported official Claude Code installation method.

After install:

```bash
claude
```

From inside Claude Code:

```text
/mcp
```

Use:

```bash
claude mcp list
```

to verify configured servers.

## 7.3 VS Code project settings

Do not install many extensions.

Create `.vscode/extensions.json` only if the repository lacks one and recommendations are clearly useful.

Recommended categories:

- Astro language support;
- repository’s formatter/linter;
- optional Cloudflare/Workers tooling where appropriate.

Claude Code remains the primary AI agent. Do not duplicate the same agent stack through multiple VS Code AI extensions unless the user explicitly wants that.

## 7.4 Secrets

Verify `.gitignore` covers, where relevant:

```text
.env
.env.*
!.env.example
.dev.vars
.dev.vars.*
*.pem
*.key
```

Be careful not to ignore an existing intentionally committed non-secret environment template.

Create `.env.example` with names only:

```bash
ATTIO_API_KEY=
BEEHIIV_API_KEY=
BEEHIIV_PUBLICATION_ID=
GA_MEASUREMENT_ID=
```

Only include variables actually required by the final implementation.

Cloudflare production secrets belong in Cloudflare, for example through Wrangler secrets, not `.env` committed to Git.

---

# 8. Connector setup order

Connect MCPs one by one and test after each.

The current preferred order is:

1. Notion
2. Attio
3. beehiiv
4. GitHub
5. Cloudflare
6. Google Workspace only as optional preview

Why this order?

Notion and CRM let Claude understand the operating model.
beehiiv adds editorial context.
GitHub and Cloudflare add implementation/runtime control.
Google Workspace MCP is useful but not required for the v1 system.

---

# 9. Notion MCP

## 9.1 Current official remote endpoint

Verify official docs immediately before setup.

Expected:

```text
https://mcp.notion.com/mcp
```

A current Claude Code setup pattern is:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

Then inside Claude Code:

```text
/mcp
```

Complete OAuth.

Use an appropriate scope. Prefer project/local scope for this implementation unless there is a reason to make it user-wide.

## 9.2 Security rule

Notion MCP acts using the authenticated user’s Notion permissions.

Therefore:

**Claude must not roam through or edit unrelated Notion content.**

Operational constraint:

- search broadly only as necessary to detect existing ODD structures;
- make writes only under approved ODD operational pages/databases;
- do not mass reorganize the workspace;
- do not delete existing databases during v1;
- never “clean up” pages without evidence they are duplicates and explicit approval.

## 9.3 Notion audit

Search for existing:

```text
ODD
Growth
Strategy
Business plan
Projects
Content
Marketing
Sales
SOP
Processes
Meeting
Decisions
ODDference
Creative Week
ODDspace
```

Build a map:

```text
Existing object
Current role
Keep / normalize / merge later / obsolete
New Growth OS destination
```

Do not create a new `Projects` database if an existing project database can serve the need.

---

# 10. Notion Growth OS target

The Growth OS should become a navigation and operating layer, not a giant duplicated database.

Recommended home:

```text
ODD Growth OS
├── Dashboard
├── Strategy & Goals
├── Products & Offers
├── Projects
├── Marketing & Content
├── Experiments
├── SOPs
├── Meetings
├── Decisions
├── Research & Insights
└── System Documentation
```

## 10.1 Dashboard

The dashboard should prioritize:

- current revenue target;
- revenue booked;
- qualified pipeline;
- current strategic priorities;
- top commercial blockers;
- active experiments;
- important upcoming deadlines;
- links to CRM and analytics.

Do not manually duplicate live CRM records into Notion.

A weekly summary may be copied/generated into Notion, but it is a snapshot and must say when it was generated.

## 10.2 Projects database

Recommended properties:

```text
Name
Owner
Area
Status
Priority
Goal
Start
Deadline
Revenue impact
Related product
Related strategic priority
```

## 10.3 Experiments database

```text
Experiment
Hypothesis
Owner
Audience
Product
Change
Primary metric
Baseline
Success threshold
Start
End
Result
Decision
Learning
```

Allowed decisions:

```text
scale
iterate
stop
inconclusive
```

## 10.4 Content database

```text
Idea / title
Owner
Audience
Thought-leadership territory
Format
Channel
Related product
CTA
Status
Publish date
Campaign
Published URL
Learning
```

Do not copy channel analytics into dozens of manual Notion properties.

Capture the learning, not every metric.

## 10.5 Decisions database

```text
Decision
Date
Owner
Context
Decision
Why
Systems affected
Review date
Status
```

## 10.6 SOP database

SOPs should include:

- New B2B enquiry
- Discovery
- Proposal
- CRM hygiene
- Event-to-pipeline
- Website publishing
- Newsletter publishing
- Campaign naming
- UTM creation
- Partner onboarding
- Case study
- Weekly revenue review
- Weekly growth review

---

# 11. Attio MCP

## 11.1 Current official remote endpoint

Verify immediately before setup.

Expected:

```text
https://mcp.attio.com/mcp
```

Attio supports its official MCP on current plans and can expose records, notes, tasks, emails and meetings subject to permissions.

Connect using the current Claude Code remote-MCP/OAuth flow.

If command syntax has changed, use current official Attio/Claude documentation rather than guessing.

## 11.2 Test sequence

First read-only tests:

```text
- identify current user/workspace
- list or find existing people
- list or find existing companies
- inspect enabled standard objects
```

Then one harmless TEST write:

```text
Create a clearly named TEST person or note,
verify it,
then remove it safely if deletion is appropriate and supported.
```

Never test on a real partner.

---

# 12. Attio CRM design

Use:

- People
- Companies
- Deals

Free-plan limitations should be respected rather than worked around with unnecessary complexity.

## 12.1 People fields

Canonical values should map to the following concepts:

```text
name
email
phone [optional]
job_title
company
audience_type
relationship_strength
products_relevant
source
owner
lifecycle_stage
last_meaningful_interaction
next_action
next_action_date
consent_status [only if actually needed and governed]
data_source
```

Relationship strength should be simple:

```text
unknown
weak
known
warm
strong
strategic
```

Do not let AI autonomously change a relationship to `strategic`.

## 12.2 Company fields

```text
name
domain
sector
size_band
geography
account_tier
account_score
strategic_fit
relationship_strength
products_relevant
current_status
owner
last_meaningful_interaction
next_action
next_action_date
```

Account tier:

```text
A
B
C
```

Do not create a Tier D.

Tier A should remain small.

## 12.3 Deal fields

```text
name
company
primary_contact
product
value
currency
stage
owner
problem_use_case
champion
economic_buyer
budget_source
decision_process
target_date
next_action
next_action_date
expected_close
source
first_campaign
latest_campaign
influenced_by
won_lost_reason
```

Do not create every field merely because it exists in this document. If Attio Free plan constraints make a field expensive/awkward and the field is not operationally useful yet, document the deferral.

---

# 13. CRM pipeline

Canonical stage values:

```text
target
engaged
qualified
discovery
opportunity
proposal
procurement
won
lost
renewal_expansion
```

Human-readable labels can be capitalized.

## Stage definitions

### Target

Entry:

- plausible ICP fit;
- assigned owner.

Exit:

- meaningful two-way interaction, introduction, meeting or relevant event interaction.

### Engaged

Entry:

- meaningful interaction occurred.

Exit:

- actual organisational relevance/problem established.

### Qualified

Must have:

- real problem/use case;
- plausible fit;
- plausible budget/process/timing;
- an owner.

Exit:

- discovery scheduled or completed.

### Discovery

A real needs conversation is occurring.

Exit:

- desired outcome, stakeholders and decision process sufficiently understood.

### Opportunity

Buyer acknowledges there may be a project/commercial fit and a concrete next step exists.

### Proposal

Buyer expects a proposal and enough discovery exists to price/scope it.

### Procurement

Intent is high enough that contract, PO, legal, finance or procurement process is active.

### Won / Lost

Definitive result.

### Renewal / Expansion

Customer/partner has a future commercial continuation decision.

---

# 14. Mandatory CRM governance

Hard rules:

```text
No proposal without discovery.
No active opportunity without a next action.
No active opportunity without a next-action date.
No active opportunity without an owner.
No real deal without a product.
No real deal without a plausible value once it reaches Proposal.
No “they liked it” stage.
No passive ticket buyer automatically becomes a sales lead.
No editorial subscriber automatically becomes a sales lead.
No autonomous AI changes to consent/legal-basis data.
```

Create a saved view for:

```text
Active opportunities with missing next action
```

and:

```text
Next actions overdue
```

and:

```text
Tier A accounts
```

and:

```text
Deals expected next 30 days
```

---

# 15. Connect Google work email/calendar to Attio

This is preferable to depending on Google Workspace MCP for CRM memory.

## 15.1 Use the correct mailbox

Connect the ODD work Gmail/Google Calendar account.

Do not connect a personal Gmail account.

## 15.2 Privacy setting

On Attio Free, use the most conservative suitable email sharing.

Prefer:

```text
Metadata only
```

unless the team has explicitly decided otherwise.

Review:

- internal domains;
- sensitive contacts;
- protected recipients/blocklist options;
- calendar privacy.

## 15.3 Record creation

During migration, prevent automatic creation from filling Attio with thousands of irrelevant contacts.

Use:

```text
automatic contact creation = None
```

or the most conservative available setting.

With `None`, manually created/imported relevant records can still benefit from matching email/calendar history.

After 30 days of CRM use, review whether selective automatic record creation would improve the workflow.

Do not enable broad automatic creation on day one.

---

# 16. Initial CRM population

Do not import “everyone.”

Create/import:

## Tier A

Approximately 25–40 highest-priority organisations.

Examples of fit:

- strategic partner;
- high-value agency client;
- anchor organisational member;
- corporate ODDference buyer;
- city/institution;
- important foundation/funder.

## Tier B

Approximately 100–150 priority organisations grouped by a small number of use cases/sectors.

## Existing commercial relationships

Always include:

- active customers;
- current partners;
- active proposals;
- live negotiations;
- meaningful institutional relationships.

## Do not import by default

- entire newsletter audience;
- all festival attendees;
- all old email contacts;
- random LinkedIn connections.

---

# 17. Account scoring

Use the model only if it helps decisions.

Recommended 100-point logic:

```text
Strategic category fit              20
Plausible budget / organisation     15
Demonstrated need/use case          15
Existing relationship strength      15
Senior stakeholder access           10
Cultural/creative relevance         10
Current trigger                     10
Engagement with ODD                  5
```

Tier A typically requires ~75+ but score is not absolute.

Never allow page visits alone to turn a poor-fit organisation into Tier A.

---

# 18. beehiiv MCP

ODD already uses beehiiv successfully.

Keep it.

## 18.1 Current official remote endpoint

Verify first.

Expected:

```text
https://mcp.beehiiv.com/mcp
```

beehiiv currently provides MCP access to all users, while write functionality may depend on plan.

Do not upgrade automatically.

## 18.2 Audit before changing

Capture:

```text
publication ID
plan
subscriber count
domain
sender
forms
segments
tags/custom fields
automations
welcome flows
newsletter cadence
existing integrations
tracking
```

Do not rename existing subscriber fields casually.

## 18.3 MCP use

Use MCP for:

- content analysis;
- subscriber/audience analysis;
- performance review;
- controlled content creation/editing if the plan supports it and user approves;
- operational insight.

Do not depend on MCP for production website signups.

---

# 19. beehiiv production subscription flow

There are two valid v1 options.

## Option A — keep existing beehiiv form

Use this when it:

- looks acceptable;
- works reliably;
- captures required fields;
- does not damage website UX;
- preserves useful source tracking.

This is the lowest-risk solution.

## Option B — server-side beehiiv API

Use when the custom website flow materially improves:

- visual UX;
- UTM capture;
- source normalization;
- page context.

Architecture:

```text
Astro form
-> server-side endpoint
-> validate
-> beehiiv API
-> subscriber
-> tags/custom fields/source if supported
-> result
```

Never expose beehiiv API keys in browser JavaScript.

---

# 20. GitHub MCP

Use the official GitHub MCP server.

Verify current official setup before execution.

Current official remote server is expected to be:

```text
https://api.githubcopilot.com/mcp/
```

GitHub’s current Claude Code documentation supports remote setup and a local Docker alternative.

## Security preference

Use:

- OAuth where the current Claude Code/GitHub flow supports it safely; or
- a fine-grained short-lived PAT with the minimum repository permissions needed.

Never commit the PAT.

If a PAT is required:

- store it securely in an environment variable or approved credential store;
- do not embed it into a committed `.mcp.json`.

For initial setup, GitHub write permission should be limited to the relevant ODD repository/organisation.

## MCP capabilities needed

Prefer a limited set:

```text
context
repos
issues
pull_requests
actions
```

Do not enable every GitHub toolset just because it exists.

If possible, begin read-only and enable writes after validation.

---

# 21. GitHub nonprofit programme

Treat this as a parallel administrative track.

If ODD’s eligible nonprofit entity qualifies, current GitHub nonprofit benefits include a free GitHub Team plan.

This is not a technical blocker.

Create a Notion/ops action:

```text
Apply/verify GitHub for Nonprofits
Owner
Status
Documentation required
Application link/status
```

Do not pause code implementation waiting for approval.

---

# 22. Cloudflare + Claude Code

Use Cloudflare as:

- hosting/runtime;
- integration endpoints;
- secret store;
- deployment environment;
- rate limiting/security where useful.

## 22.1 Current recommended Claude Code integration

Cloudflare currently provides a Claude Code plugin/skills flow.

Verify official docs before installation.

Expected current Claude Code commands:

```text
/plugin marketplace add cloudflare/skills
/plugin install cloudflare@cloudflare
```

The plugin can install Cloudflare skills and MCP access.

Current API MCP endpoint expected:

```text
https://mcp.cloudflare.com/mcp
```

OAuth is preferred for interactive use.

## 22.2 Do not give unrestricted production power casually

Start with:

- documentation;
- project inspection;
- logs;
- staging/development.

Only authorize production mutations required by the implementation.

## 22.3 Wrangler remains important

MCP does not replace Wrangler.

Use existing project conventions:

```bash
npx wrangler dev
npx wrangler deploy
```

only if applicable to the project.

Prefer a staging environment before production.

---

# 23. Google Workspace MCP — optional preview

Google’s official Workspace MCP servers currently remain Developer Preview.

That means:

- do not depend on them for a production-critical path;
- do not block v1 waiting for them;
- use Attio’s stable Gmail/Calendar sync for commercial relationship history;
- use stable Google APIs if a deterministic Google integration becomes necessary.

If the organisation is already enrolled in the preview and wants to test it, Google provides product-specific remote MCP servers for services such as:

- Gmail
- Drive
- Docs
- Sheets
- Calendar
- People

Document it as:

```text
experimental = true
production_dependency = false
```

Do not connect Google Chat/Slides/etc. without a real use case.

---

# 24. Google for Nonprofits

Run as a parallel administrative track.

For eligible Finnish registered associations/foundations, Google for Nonprofits may provide Google Workspace for Nonprofits at no charge.

If not already active:

Create a Notion task and `ops` blocker with:

- nonprofit entity;
- eligibility status;
- current Google Workspace status;
- admin owner;
- verification status;
- next manual action.

Do not let this delay the technical build.

---

# 25. MarketHype decision gate

MarketHype must earn its place in the stack.

The fact that access may be free is not enough.

## 25.1 Required evidence

Verify:

```text
1. Can it integrate directly with current ODD ticketing?
2. Tiketti?
3. Venga?
4. API availability?
5. Webhooks?
6. Automated contact/customer export?
7. Purchase status?
8. Attendance/check-in status?
9. Campaign UTM/referrer data?
10. Consent fields?
11. Data export/ownership?
12. Historical data import/export?
13. What exact features are included free?
14. Are limits imposed on contacts, emails, users or events?
```

## 25.2 Outcome A: strong support

If supported:

```text
ticketing
-> MarketHype
-> event segmentation/lifecycle
```

Do not sync every event attendee into Attio.

Create a controlled “commercial promotion” rule:
an attendee becomes an Attio contact only when there is an actual B2B/B2G relationship reason.

## 25.3 Outcome B: weak support

If no reliable integration:

Do not:

- scrape;
- reverse engineer private endpoints;
- create brittle browser automation;
- pretend CSV export is real-time integration.

Instead document:

```text
weekly/after-event export
-> normalized import
-> MarketHype or analysis destination
```

Only if the manual process provides enough value.

Otherwise leave MarketHype out of v1.

---

# 26. Canonical schemas

The purpose of schemas is to make ODD portable.

If Attio is replaced later, the business definition should not change.

## 26.1 `schemas/audience.yml`

Example:

```yaml
version: 1
values:
  - business
  - creative
  - city_institution
  - partner
  - funder
  - press
```

## 26.2 `schemas/products.yml`

```yaml
version: 1
values:
  - strategic_partnership
  - oddagency
  - oddmembership
  - oddference_corporate
  - oddspace
  - creative_week_partnership
  - city_institution_programme
  - other
```

## 26.3 `schemas/lifecycle.yml`

```yaml
version: 1
values:
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
```

## 26.4 `schemas/source.yml`

```yaml
version: 1
values:
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
```

## 26.5 `schemas/utm.yml`

```yaml
version: 1
fields:
  - utm_source
  - utm_medium
  - utm_campaign
  - utm_content
  - utm_term
```

## 26.6 Campaign names

Use lower-case, stable names.

Example:

```text
oddference_2027_corporate
oddspace_membership_autumn_2026
creative_week_2027_partners
creative_economy_report_2027
```

Years and seasons that denote a real recurring cycle (as in every example
above) are good practice, not a problem — they make the campaign period
unambiguous. What to avoid is version-churn suffixes that carry no
operational meaning: `final`, `final2`, `new`, `latest`, `test2`,
`use_this`. If a name changed because the campaign was corrected, not
recreated, keep the same identifier.

**Corrected 2026-08-21** — see `ops/DECISIONS.md` D5. The original wording
here ("do not include dates/times that make no operational sense") read as
contradicting its own examples above.

---

# 27. Website audience architecture

Do not rewrite the website simply to conform to this section.

Audit what exists and ensure the intent is achievable.

Primary routes:

```text
For Business
For Creatives
Cities & Institutions
Events
Ideas & Research
About
```

Persistent high-value CTA:

```text
Work with ODD
```

Secondary context-specific CTAs:

```text
Get tickets
Book a visit
Apply / Join
Build a programme with ODD
Subscribe
```

The user should not face every ODD product at equal hierarchy.

Audience first.
Product second.

---

# 28. Business enquiry form

Minimum fields:

```text
name
work_email
organisation
interest
goal
timing
```

Hidden/server-derived:

```text
landing_page
referrer
utm_source
utm_medium
utm_campaign
utm_content
utm_term
submitted_at
```

Interest options map to canonical product IDs.

Do not collect unnecessary personal data.

## Validation

At minimum:

- required field validation;
- email validation;
- length limits;
- enum validation;
- HTML/script sanitization where relevant;
- server-side validation;
- rate limiting or abuse protection;
- idempotency.

Do not trust frontend validation alone.

---

# 29. Website -> Attio integration

Build an adapter rather than scattering Attio calls through UI components.

Recommended conceptual interface:

```ts
interface CrmAdapter {
  upsertPerson(...)
  upsertCompany(...)
  createOrUpdateDeal(...)
  createTask(...)
}
```

Attio implementation:

```text
src/lib/integrations/attio/
or equivalent existing server structure
```

Exact location should follow the current repository architecture.

## Flow

```text
POST business enquiry
-> validate
-> normalize
-> derive canonical product/source
-> find/upsert person
-> find/upsert company
-> link person/company
-> create deal or qualified lead representation
-> set source + UTM
-> create owner/task if supported
-> record structured server result
-> return safe client response
```

## Deduplication

Use stable keys:

- person email;
- company domain where reliable;
- external submission id/idempotency key.

Do not create a new company for every form submission.

## Error handling

External CRM failure must:

- not leak API errors/secrets to browser;
- produce structured logs;
- permit safe retry;
- avoid duplicate records on retry.

---

# 30. Website -> beehiiv integration

Use a separate adapter.

```ts
interface NewsletterAdapter {
  subscribe(...)
}
```

Normalize:

```text
email
source
campaign
content
landing_page
```

Only collect name or other properties if ODD actually uses them.

If the existing beehiiv form is better and reliable, document the decision to retain it instead of building needless code.

---

# 31. Cloudflare runtime design

Do not force a new architecture if the current Astro/Cloudflare deployment already supports server endpoints cleanly.

Possible approaches:

- Astro server endpoints on Cloudflare;
- Pages Functions;
- dedicated Worker.

Choose the smallest architecture consistent with the existing site.

Use:

- environment separation;
- server-only secrets;
- structured logging;
- sane timeouts;
- retry only where safe;
- explicit external API error mapping.

Do not build a queue or database until required by actual volume/reliability.

---

# 32. Analytics

## 32.1 Audit first

Locate:

- GA4 tag;
- GTM if any;
- consent mechanism;
- existing event names;
- Search Console setup;
- duplicated tags.

Do not install a second GA4 tag.

## 32.2 Useful events

Recommended:

```text
audience_route_view
work_with_odd_submit
partnership_enquiry_submit
agency_enquiry_submit
membership_enquiry_submit
space_enquiry_submit
city_programme_enquiry_submit
newsletter_subscribe
ticket_outbound_click
```

Do not create 100 events.

## 32.3 Event parameters

When legally/technically appropriate:

```text
product
audience
campaign
source
page_path
```

Never send:

- full names;
- email addresses;
- message text;
- personal CRM data

to GA4.

## 32.4 Attribution model

Do not build fake fractional attribution.

Store:

```text
primary_source
latest_conversion_source
influenced_by
buyer-reported influence
```

---

# 33. Consent and EEA tracking

ODD operates in Finland/EEA.

Audit whether non-essential advertising/marketing tags are gated correctly.

Do not add:

- Meta Pixel;
- LinkedIn Insight Tag;
- retargeting;
- session replay

as part of v1 unless there is a concrete reason and consent implementation is valid.

GA4 configuration must follow the existing legal/consent approach.

This guide is not a substitute for legal advice.

---

# 34. Deterministic v1 automation map

## Automation 1 — business enquiry

Trigger:
website form.

Machine:

- validate;
- create/update Attio data;
- capture source;
- create follow-up task;
- send transactional acknowledgement if appropriate.

Human:

- review;
- reply;
- qualify.

KPI:
inquiry -> qualified conversation.

## Automation 2 — newsletter

Trigger:
subscribe.

Machine:

- subscribe in beehiiv;
- preserve source;
- enter beehiiv native welcome automation if configured.

Human:
none unless high-value inbound context is separately identified.

KPI:
activated subscriber.

## Automation 3 — stale deal

Trigger:
next-action date overdue / no next action.

Preferred:
Attio-native workflow if available within current plan/credits.

Fallback:
weekly Claude CRM audit.

Do not add Make for this.

## Automation 4 — meeting memory

Google Calendar/Gmail -> Attio native sync.

Claude:
interactive preparation/summarization.

Human:
approves sales next step.

## Automation 5 — event attendee

Only if MarketHype passes integration gate.

Ticketing -> MarketHype.

Promote to Attio only when explicit commercial relevance exists.

## Automation 6 — weekly review

Claude reads:

- Attio;
- beehiiv;
- Notion;
- repo/analytics outputs that are actually accessible.

Claude generates a dated weekly review in Notion.

It may recommend changes but must not alter canonical revenue values based on inference.

---

# 35. Acknowledgement email

Keep transactional acknowledgement simple.

It should not pretend a person has already personally read the enquiry.

Example logic:

```text
Thanks — we received your message.
A member of the ODD team will review it and get back to you.
```

Do not build an AI-written personalized automated sales reply in v1.

---

# 36. AI guardrails

Claude may autonomously:

- read approved system context;
- create technical docs;
- create code;
- run tests;
- create test fixtures;
- create Notion pages under approved hierarchy;
- create CRM fields/views during setup;
- create clearly labelled test records;
- analyze pipeline;
- prepare drafts;
- suggest next actions;
- create tasks when explicitly requested by implementation spec;
- update implementation status docs.

Claude must require human approval before:

- sending strategic sales/partner emails;
- publishing newsletter content;
- launching paid ads;
- changing deal value based on inference;
- closing real deals lost;
- deleting real CRM data;
- changing consent/legal basis;
- sending mass outreach;
- granting itself broader OAuth permissions;
- changing DNS in a way that can take the site/email offline;
- deploying destructive schema migrations;
- modifying payment/ticketing configuration.

---

# 37. Secrets and credentials

Create a credentials inventory without exposing values.

Example:

```text
Credential
System
Purpose
Stored where
Environment
Rotation owner
Status
```

Never write the value.

Recommended storage:

```text
Local dev -> ignored .env/.dev.vars
Cloudflare runtime -> Worker/Pages secrets
GitHub CI -> GitHub environment/repository secrets
MCP OAuth -> vendor/Claude OAuth token storage
```

Do not put long-lived secrets in:

- Notion;
- README;
- committed JSON;
- screenshots;
- issues.

---

# 38. Deployment environments

Prefer:

```text
local
staging/preview
production
```

If the existing deployment only uses preview + production, use that.

External system testing should target:

- test records;
- test API environments if offered;
- isolated labels/tags;
- non-production email where possible.

Never send a test campaign to the production beehiiv audience.

---

# 39. CI gates

Respect existing CI.

If missing, add only relevant gates.

Minimum for code touched by this work:

```text
install
lint
typecheck
test
build
```

Where practical:

- secret scan;
- dependency audit;
- link check;
- Playwright smoke test.

Do not add a huge CI platform.

Use GitHub Actions.

---

# 40. Form integration tests

Test:

```text
valid submission
missing email
bad email
missing organisation
invalid product
very long text
duplicate submission
CRM timeout
CRM 4xx
CRM 5xx
beehiiv failure
rate-limit behavior
mobile form
keyboard accessibility
success message
error message
```

External API calls in automated tests should be mocked.

Then run one controlled live smoke test.

---

# 41. Live CRM smoke test

Create:

```text
TEST ODD Growth OS
```

as the person/company/deal naming prefix where possible.

Verify:

- person;
- company;
- relationship;
- product;
- source;
- UTM;
- owner;
- next action;
- no duplicates.

Document evidence.

Then clean up the TEST record safely if appropriate.

Never use a real partner.

---

# 42. Live beehiiv smoke test

Use a controlled test email address owned by ODD.

Verify:

- subscriber created;
- existing subscriber behavior;
- source/UTM fields if implemented;
- welcome automation behavior;
- no unintended broadcast.

Document.

---

# 43. Notion QA

Verify:

- no duplicate project database;
- Growth OS hierarchy is understandable;
- source-of-truth links are clear;
- revenue data is labelled snapshot vs live;
- databases have owners/status;
- no secrets;
- Claude cannot accidentally update unrelated pages during normal workflow.

---

# 44. CRM QA

Verify:

- People/Companies/Deals enabled;
- required fields exist;
- enums match canonical schema;
- pipeline stages match canonical lifecycle;
- saved views exist;
- Gmail/Calendar sync is work account only;
- record auto-creation is conservative;
- email sharing is conservative;
- Tier A/B assignment works;
- no mass passive-audience import occurred.

---

# 45. MCP QA

For each connector document:

```text
Server
Authentication
Scope
Read test
Write test
Write restrictions
Production dependency?
Last verified
Official docs source
```

The v1 desired state:

```text
Notion     Connected
Attio      Connected
beehiiv    Connected
GitHub     Connected
Cloudflare Connected
Google     Optional / Preview / Deferred
MarketHype No MCP assumed
```

MCP failure must not break website/CRM production data flows.

---

# 46. `ops/SETUP_STATUS.md`

Use a simple matrix:

```markdown
| Area         | Status  | Evidence | Blocker | Next action        |
| ------------ | ------- | -------- | ------- | ------------------ |
| Repo audit   | DONE    | ...      | —       | —                  |
| Notion audit | DONE    | ...      | —       | —                  |
| Notion MCP   | BLOCKED | ...      | OAuth   | User authenticates |
| Attio schema | DONE    | ...      | —       | —                  |
| ...          |
```

Allowed status:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
DONE
DEFERRED
NOT_NEEDED
```

Do not mark `DONE` without evidence.

---

# 47. `ops/ARCHITECTURE.md`

Must contain:

- system diagram;
- source-of-truth map;
- control-plane/data-plane distinction;
- external data flows;
- environments;
- major design decisions;
- switching assumptions.

Recommended diagram:

```text
                    Claude Code
                        |
       -------------------------------------
       |          |          |             |
     Notion     Attio      GitHub       Cloudflare
       |          |                         |
       |          |                         |
       |       B2B/B2G                   Astro Web
       |                                    |
       |                              --------------
       |                              |            |
       |                            Attio        beehiiv
       |
     Team OS

Ticketing -> MarketHype (only if validated)
GA4/Search Console <- Website measurement
Google Gmail/Calendar -> Attio native sync
```

---

# 48. `ops/SYSTEMS_OF_RECORD.md`

Explicit table:

```text
Data type
Source of truth
Copies allowed?
Sync direction
Why
```

Include the rule:

> If two systems disagree, the defined source of truth wins unless an incident/bug is proven.

---

# 49. `ops/DATA_DICTIONARY.md`

For every canonical field:

```text
Canonical name
Human label
Type
Allowed values
Required?
Source system
Destination mappings
PII?
Notes
```

This is essential for portability.

---

# 50. `ops/SECURITY_AND_PRIVACY.md`

Include:

- systems/processors;
- data flows;
- secrets;
- authentication;
- OAuth scopes;
- email/calendar sync choices;
- analytics consent;
- personal data categories;
- test data;
- deletion/retention ownership;
- incident/rollback contacts/placeholders.

Do not claim legal compliance just because technical controls exist.

---

# 51. `ops/RUNBOOK.md`

Write for a future operator who knows nothing about the setup.

Include:

## Weekly

- Monday revenue review;
- Friday growth review;
- CRM overdue tasks;
- integration error check.

## Monthly

- pipeline hygiene;
- analytics review;
- subscriber/event data review;
- connector access review;
- experiment decisions.

## Quarterly

- SaaS stack review;
- permissions;
- dormant users;
- schema changes;
- CRM suitability;
- MarketHype integration;
- nonprofit discounts;
- MCP maturity.

## Incident

- form submissions failing;
- Attio API failing;
- beehiiv API failing;
- Cloudflare deployment rollback;
- compromised credential;
- duplicate CRM creation.

---

# 52. Weekly revenue review

This should be brutally commercial.

Agenda:

```text
Revenue booked vs target
Qualified pipeline by product
Top deals
Deal blockers
New qualified opportunities
Stale opportunities
Deals with no next action
Deals expected 30/60/90 days
Seven-day actions
```

Do not spend this meeting discussing follower count.

---

# 53. Weekly growth review

Agenda:

```text
Website qualified conversions
Form completion/errors
beehiiv subscriber growth/engagement
target-account engagement where measurable
event pipeline
active experiments
tracking problems
top customer/prospect learning
start / stop / continue
```

---

# 54. Initial weekly activity guardrails

Use only as starting operating targets:

```text
Tier A/B meaningful touches: 10–15
New qualified conversations: 3+
Warm introduction asks: 3–5
Active deals without next action: 0
High-intent enquiries responded same working day: 100%
Founder LinkedIn substantive posts: 2
ODD LinkedIn substantive posts: 2
Growth experiments: 1
Customer/prospect insights captured: 5+
```

These are not eternal KPIs.

Replace activity assumptions with real conversion data after enough history exists.

---

# 55. Pipeline planning

Until ODD has enough real data, a rough planning buffer can be:

```text
~3x qualified unweighted pipeline
against remaining partnership/agency revenue target
```

This is a safety heuristic, not an industry law.

After enough data:

```text
required_pipeline = remaining_target / actual_win_rate
```

by product.

---

# 56. Experiment standard

Every experiment must contain:

```text
Hypothesis
Change
Audience
Primary metric
Baseline
Threshold
Duration
Result
Decision
Learning
```

Example:

```text
Hypothesis:
Corporate buyers do not understand ODDference as a team product.

Change:
Create explicit corporate team page.

Primary metric:
Qualified corporate enquiries.

Threshold:
5 qualified enquiries or 2 wins in a meaningful campaign period.

Decision:
Scale / iterate / stop / inconclusive.
```

Do not run fake A/B tests on tiny traffic.

---

# 57. Sales asset checklist

Not all assets need to be built in this technical sprint, but the system should track them.

Minimum library:

```text
Core ODD platform deck
What ODD is — one pager
ODDference corporate package
Partnership deck/inventory
ODDmembership proposition
ODDagency capabilities
ODDspace membership/event hire
Cities & Institutions capability sheet
Three case studies
Impact/evidence sheet
Price/menu
Discovery template
Proposal template
Objection library
Procurement/privacy/security answers
```

Notion owns the human source material.
Final generated PDFs can live in Drive where appropriate.

---

# 58. Case study standard

Every case should answer:

```text
Problem
ODD mechanism
Who participated
What happened
Quantified outcome
Customer/partner evidence
What happened next
```

Beautiful event photography alone is not a B2B case study.

---

# 59. Nonprofit programmes track

Do not block setup, but create/verify tasks for:

```text
Google for Nonprofits / Workspace
GitHub for Nonprofits
Notion nonprofit discount
Canva for Nonprofits
other relevant programmes only if verified and actually useful
```

Rule:

**A free license does not justify adding a platform.**

Claim benefits for systems already in the architecture.

---

# 60. Do not add software just to automate one step

Before adding any tool, document:

```text
Workflow problem:
Current manual cost:
Why native integration fails:
Why API/Cloudflare code fails:
Why existing tools cannot solve it:
Expected monthly cost:
Expected hours saved:
Data/privacy implications:
Exit strategy:
```

If the answer is weak, do not add the tool.

---

# 61. Migration / portability

All canonical enum/value definitions live in GitHub.

When the CRM changes, mappings change.

The business language should not.

Never use a SaaS-specific field name as the only definition of an important ODD concept.

Example:

```text
canonical: next_action_date
Attio: [mapped field id]
future CRM: [future mapping]
```

Store mapping IDs/config safely where appropriate.

---

# 62. Logging

For server integrations, log:

```text
timestamp
integration
operation
status
request/correlation id
external status code
safe error category
```

Never log:

- API keys;
- auth headers;
- full private form messages unnecessarily;
- consent-sensitive data;
- entire external API responses if they contain PII.

Cloudflare logs should be useful enough to debug a failed form submission.

---

# 63. Idempotency and retries

For each write integration, ask:

> What happens if the network times out after the external system successfully wrote the record?

Use:

- lookup/upsert before create;
- deterministic identity keys;
- idempotency key where vendor supports it;
- limited retry on transient failures.

Never blind-retry a write that can create duplicate deals.

---

# 64. Failure behavior

A CRM outage should not expose a raw exception to the user.

Preferred response:

```text
We couldn’t submit this right now. Please try again or contact us directly.
```

If a safe queue/fallback already exists, use it.

Do not introduce a complex queue in v1 unless repeated failure proves it necessary.

---

# 65. Accessibility and UX

Do not make the integration work while degrading the website.

Forms must:

- have labels;
- keyboard work;
- have focus states;
- explain required fields;
- have accessible errors;
- not reset user content unexpectedly;
- work on mobile;
- respect existing design system;
- preserve high-quality UI.

---

# 66. Performance

Do not load CRM/newsletter SDKs client-side just to submit a form.

Server-side integration keeps:

- secrets safe;
- bundle size lower;
- vendor coupling out of frontend.

Preserve the current site's performance targets.

---

# 67. SEO / structured data

The implementation sprint should audit, not rebuild SEO.

Ensure:

- canonical pages;
- titles/descriptions;
- Organization schema where appropriate;
- Event schema where appropriate;
- clean HTML;
- research/case pages indexable;
- no important information hidden only in PDFs.

Do not mass-generate SEO pages with AI.

---

# 68. MarketHype adapter boundary

Even before integration is validated, document an interface such as:

```ts
interface EventAudienceAdapter {
  importOrSyncPurchase(...)
  importOrSyncAttendance(...)
  updateAudienceAttributes(...)
}
```

Do not implement a fake MarketHype adapter.

A future adapter should slot in without changing website/CRM semantics.

---

# 69. MCP permission philosophy

For every MCP:

- least privilege;
- one authenticated ODD account;
- avoid personal accounts;
- document who owns auth;
- document revocation;
- use read-only first when supported;
- enable writes only needed for the use case.

MCP is powerful because it acts with user permissions.
Treat it like handing an operator access to that SaaS.

---

# 70. Human authentication protocol

Claude cannot securely bypass:

- OAuth browser consent;
- 2FA;
- account invitation;
- nonprofit verification;
- billing approval;
- vendor-specific admin approval.

When blocked:

```text
HUMAN ACTION REQUIRED
System:
Why:
Exact action:
Expected result:
How Claude will verify:
```

Then continue other work.

Do not ask open-ended questions like “Can you configure Attio?”

Give the exact button/command/auth action.

---

# 71. Production deploy gate

Production deployment is allowed only when:

```text
build passes
tests pass
preview/staging passes
secrets configured
live integration smoke tests pass
analytics checked
rollback exists
git diff reviewed
```

If the user has explicitly instructed Claude Code to deploy when tests pass, it may deploy.

Otherwise prepare the release/PR and state the final production action required.

Never alter DNS/email records speculatively.

---

# 72. Rollback

Document:

```text
Previous deployment
Git commit
Cloudflare rollback method
Integration feature flags/environment vars
How to temporarily disable CRM submission
How to restore previous form endpoint
```

A failed CRM integration should be removable without taking down the website.

---

# 73. Minimum cost objective

Initial target:

```text
Incremental software cost ~= €0
```

assuming existing paid accounts remain existing costs.

Do not upgrade a SaaS plan automatically.

If a paid tier is required, document:

```text
feature blocked
cost
commercial benefit
workaround
recommendation
```

and wait for human approval.

---

# 74. Things explicitly deferred

Unless already required by the existing system:

```text
paid media
LinkedIn Insight Tag
Meta Pixel/CAPI
PostHog
session replay
BI platform
high-volume outbound
AI SDR
autonomous sales emails
advanced lead enrichment vendors
Make/Zapier/n8n
dedicated data warehouse
custom event CDP
custom MCP for MarketHype
```

Deferred is not forgotten.

Record in `SETUP_STATUS.md`.

---

# 75. Acceptance test matrix

## Platform

- [ ] Existing Astro app still runs.
- [ ] Build succeeds.
- [ ] Preview deployment succeeds.
- [ ] No unrelated design regression.
- [ ] No secret committed.

## Notion

- [ ] Existing workspace audited.
- [ ] No unnecessary duplicate databases.
- [ ] Growth OS home/navigation created or normalized.
- [ ] MCP works.
- [ ] Writes constrained to intended ODD content.

## Attio

- [ ] People enabled.
- [ ] Companies enabled.
- [ ] Deals enabled.
- [ ] Required fields mapped.
- [ ] Pipeline configured.
- [ ] Saved hygiene views created.
- [ ] Work Google account sync configured or auth blocker documented.
- [ ] Conservative email visibility.
- [ ] Conservative auto-record creation.
- [ ] MCP works.
- [ ] Controlled live test works.

## beehiiv

- [ ] Existing publication preserved.
- [ ] MCP works.
- [ ] Plan/write restrictions documented.
- [ ] Existing/custom website subscription path intentional.
- [ ] Controlled subscriber test works.

## GitHub

- [ ] Repository protected from secret leaks.
- [ ] MCP works.
- [ ] CI gates exist.
- [ ] Implementation branch/commits clean.
- [ ] nonprofit programme status recorded.

## Cloudflare

- [ ] Existing hosting audited.
- [ ] MCP/plugin works.
- [ ] staging/preview tested.
- [ ] secrets server-side.
- [ ] logs useful.
- [ ] production deployment safe.

## MarketHype

- [ ] actual account/access checked;
- [ ] Tiketti/Venga status documented;
- [ ] API/webhook status documented;
- [ ] decision = integrate / manual / defer;
- [ ] no invented integration.

## Analytics

- [ ] Existing GA4 audited.
- [ ] Search Console status recorded.
- [ ] no duplicate tag.
- [ ] conversion events tested.
- [ ] no PII sent to analytics.

## Documentation

- [ ] SETUP_STATUS
- [ ] ARCHITECTURE
- [ ] SYSTEMS_OF_RECORD
- [ ] DATA_DICTIONARY
- [ ] INTEGRATIONS
- [ ] SECURITY_AND_PRIVACY
- [ ] RUNBOOK
- [ ] DECISIONS
- [ ] TEST_REPORT

---

# 76. Final handover

The final Claude Code response must be short enough to use, but backed by files.

It must state:

```text
IMPLEMENTED
- ...

CONNECTED
- ...

TESTED
- ...

HUMAN ACTIONS REMAINING
- ...

DEFERRED
- ...

CURRENT V1 ARCHITECTURE
- ...

CURRENT COST
- ...

NEXT 7 ACTIONS
1.
2.
...
```

Never claim a connector is working simply because config was written.

“Connected” requires an actual successful tool call.

“Integrated” requires an actual controlled end-to-end data-flow test.

---

# 77. First operational week after implementation

Once the stack works, stop building infrastructure.

## Monday

Revenue review.

## Tuesday

Founder thought leadership + strategic account work.

## Wednesday

Tier A/B account development, warm intros.

## Thursday

Customer meetings, proposals, partnerships.

## Friday

Growth review, data quality, one experiment decision.

The system exists to support this behavior.

---

# 78. Definition of v1 success

ODD Growth OS v1 is successful when:

1. Every meaningful B2B/B2G relationship has a clear home.
2. Every live deal has an owner and next action.
3. A website business enquiry reaches the CRM without manual copying.
4. A newsletter subscriber reaches beehiiv without manual copying.
5. Event customers remain separate from the CRM unless commercially relevant.
6. The team knows where strategy/projects/SOPs live.
7. Claude can intentionally operate the core systems through MCP.
8. Production flows do not require Claude to be online.
9. The software stack remains small.
10. The system can be understood and operated by someone other than its creator.
11. The system is portable.
12. ODD spends more time on relationships and revenue than on administering software.

That is the finish line.
