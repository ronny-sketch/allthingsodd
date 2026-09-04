# All Things ODD — identity, domain, repository and launch matrix

**Pass:** 2026-09-04 final identity migration + legacy-domain retirement + launch verification
**Branch:** `final-allthingsodd-identity-launch`
**Starting SHA:** `d57630d373cdf11f7f4396302bb2cd90b8dfa60e` (merge of PR #21)
**Supersedes:** the naming decisions in `docs/FINAL_IMPLEMENTATION_MATRIX_2026-09-03.md`, plus two of its homepage rows (11 and 9)

---

## The naming contract

|                      |                                                          |
| -------------------- | -------------------------------------------------------- |
| Website/project name | **All Things ODD**                                       |
| Canonical domain     | **https://allthingsodd.co**                              |
| GitHub repository    | **ronny-sketch/allthingsodd**                            |
| npm/project slug     | **allthingsodd**                                         |
| Masterbrand          | **ODD** — unchanged                                      |
| Products             | **ODDfest, ODDference, ODDspace, ODDagency** — unchanged |

"All Things ODD" names the **website**. It is not a rebrand and it does not
replace `ODD` anywhere in editorial copy. The phrase appears in the site's own
identity surfaces (`og:site_name`, the WebSite JSON-LD entity, the homepage
`<title>`, the repo, the package) and essentially nowhere else. Product pages
still lead with their product name.

`ODD Field Guide` / `odd-field-guide` is retired. It survives only as a
hostname (see [Classification](#classification-of-every-remaining-hit)) and in
explicitly historical records. `scripts/check-identity.mjs`, run by
`npm run quality` and by CI's `checks` job, fails the build if it comes back
anywhere else.

---

## Status legend

`DONE — VERIFIED` — changed and checked against the thing itself, not against the file that feeds it.
`BLOCKED — EXTERNAL CREDENTIAL` — implemented as far as this repo reaches; the remaining step needs an account nobody in this repo holds.
`BLOCKED — SESSION PERMISSION` — the command is known and safe; this session's tooling refused to run it. Listed with the exact command.

---

## A. Repository and package

| Surface                             | Before                         | After                                                                                                             | Scope    | Action                                                                                                    | Evidence                                                                                                                                                     | Status                                                              |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| GitHub repository                   | `ronny-sketch/odd-field-guide` | `ronny-sketch/allthingsodd`                                                                                       | internal | Renamed in place (not re-created), so history, issues, PRs, secrets and the repository ID stayed together | `gh repo view ronny-sketch/allthingsodd` returns the repo; `gh repo view ronny-sketch/odd-field-guide` resolves to the same one via GitHub's rename redirect | `DONE — VERIFIED`                                                   |
| Repository description              | `odd-field-guide`              | `All Things ODD — the ODD website (ODDfest / ODDference / ODDspace / ODDagency), live at https://allthingsodd.co` | internal | `gh repo edit --description`                                                                              | `gh repo view --json description`                                                                                                                            | `DONE — VERIFIED`                                                   |
| Repository homepage                 | unset                          | `https://allthingsodd.co`                                                                                         | internal | `gh repo edit --homepage`                                                                                 | `gh repo view --json homepageUrl`                                                                                                                            | `DONE — VERIFIED`                                                   |
| Actions / secrets / branch settings | —                              | unchanged                                                                                                         | internal | Nothing to do — a rename preserves them                                                                   | Workflow file and `SURGE_TOKEN` both still present after the rename                                                                                          | `DONE — VERIFIED`                                                   |
| Local `origin` URL                  | `.../odd-field-guide.git`      | `.../allthingsodd.git`                                                                                            | internal | `git remote set-url`                                                                                      | —                                                                                                                                                            | `BLOCKED — SESSION PERMISSION` (see [Handover](#handover-commands)) |
| `package.json` name                 | `odd-field-guide-astro`        | `allthingsodd`                                                                                                    | internal | Edited                                                                                                    | `npm run build` succeeds on the renamed package                                                                                                              | `DONE — VERIFIED`                                                   |
| `package-lock.json` root name       | `odd-field-guide-astro` (×2)   | `allthingsodd`                                                                                                    | internal | Edited both occurrences                                                                                   | `npm ci` resolves the lockfile unchanged                                                                                                                     | `DONE — VERIFIED`                                                   |

**Other local clones.** Four other working copies of this repo exist on this
machine (`odd-field-guide-final-qa`, `-mobile`, `-baseline`, and a `Desktop/AI 2`
duplicate). They still carry the old remote URL. GitHub's rename redirect keeps
`fetch`/`pull`/`push` working from all of them, so nothing is broken — but they
are stale checkouts of an old identity and should be re-pointed or deleted.

---

## B. Documentation and agent context

| Surface                                                      | Before                                                                                   | After                                                                                                                    | Scope      | Evidence                                             | Status            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------- | ----------------- |
| `AGENTS.md` (= `CLAUDE.md`) title                            | `# ODD Field Guide — project constitution`                                               | `# All Things ODD — project constitution`                                                                                | internal   | File head                                            | `DONE — VERIFIED` |
| `AGENTS.md` "What this is"                                   | described the project as ODD Field Guide                                                 | leads with the naming contract, states the retired name once to retire it, and warns against sweep-replacing `ODD`       | internal   | File body                                            | `DONE — VERIFIED` |
| `AGENTS.md` architecture diagram                             | unnamed repo/host                                                                        | names `ronny-sketch/allthingsodd` and `allthingsodd.co`                                                                  | internal   | File body                                            | `DONE — VERIFIED` |
| `AGENTS.md` deployment section                               | no mention of the other ODD domains                                                      | documents `oddfest.co` / `oddspace.co` as an open blocker, and forbids "fixing" it by re-adding their claims here        | internal   | File body                                            | `DONE — VERIFIED` |
| `AGENTS.md` testing + definition of done                     | no identity coverage                                                                     | names the identity suite and the source scan; definition of done now runs `npm run quality`                              | internal   | File body                                            | `DONE — VERIFIED` |
| `README.md`                                                  | `# ODD Field Guide`                                                                      | `# All Things ODD`, plus an explicit paragraph on what the name does and does not mean                                   | internal   | File head                                            | `DONE — VERIFIED` |
| `docs/QUALITY_AUDIT.md` title                                | `# ODD Field Guide — Quality Audit`                                                      | `# All Things ODD — Quality Audit`                                                                                       | internal   | File head                                            | `DONE — VERIFIED` |
| `docs/deployment.md` host table                              | said "three hostnames", listed four; preview host named `odd-field-guide-astro.surge.sh` | four rows, each classified; preview host renamed to `allthingsodd-preview.surge.sh` with a teardown note for the old one | internal   | File body                                            | `DONE — VERIFIED` |
| `docs/deployment.md` token commands (×3)                     | `--repo ronny-sketch/odd-field-guide`                                                    | `--repo ronny-sketch/allthingsodd`                                                                                       | internal   | `git grep` returns no old slug outside the allowlist | `DONE — VERIFIED` |
| `docs/FINAL_IMPLEMENTATION_MATRIX_2026-09-03.md` B12 command | old slug                                                                                 | new slug                                                                                                                 | historical | Same                                                 | `DONE — VERIFIED` |
| `docs/editing.md` Home section                               | described "What's happening" as editable                                                 | describes its removal and the new cumulative proof fields                                                                | internal   | File body                                            | `DONE — VERIFIED` |
| `docs/architecture.md`, `docs/design-system.md`              | referenced the `WhatsOn` component as current                                            | reference it as removed                                                                                                  | internal   | File body                                            | `DONE — VERIFIED` |
| `src/layouts/Layout.astro` preview-host comment              | `odd-field-guide-astro.surge.sh`                                                         | `allthingsodd-preview.surge.sh`                                                                                          | internal   | File body                                            | `DONE — VERIFIED` |

---

## C. Site-level identity (rendered)

| Surface                         | Before                                                     | After                                                                 | Scope  | Evidence                                                                            | Status            |
| ------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- | ----------------- |
| Astro `site`                    | `https://allthingsodd.co`                                  | unchanged                                                             | public | `astro.config.mjs`                                                                  | `DONE — VERIFIED` |
| Canonical URLs, all 15 routes   | `https://allthingsodd.co/…`                                | unchanged                                                             | public | `identity-integrity.spec.ts` — "every public route is canonical on allthingsodd.co" | `DONE — VERIFIED` |
| `og:url`, all routes            | matched canonical                                          | unchanged, and now asserted equal to it                               | public | Same spec                                                                           | `DONE — VERIFIED` |
| `og:site_name`                  | **absent**                                                 | `All Things ODD`                                                      | public | Same spec — "every public route declares All Things ODD as the site name"           | `DONE — VERIFIED` |
| WebSite JSON-LD `name`          | `ODD`                                                      | `All Things ODD`                                                      | public | Same spec — parses the JSON-LD block                                                | `DONE — VERIFIED` |
| WebSite JSON-LD `alternateName` | absent                                                     | `ODD`                                                                 | public | Same spec                                                                           | `DONE — VERIFIED` |
| WebSite JSON-LD `publisher`     | `New Nordic Way rf`                                        | unchanged                                                             | public | Same spec                                                                           | `DONE — VERIFIED` |
| Organization JSON-LD            | `New Nordic Way rf` / alt `ODD`                            | unchanged                                                             | public | Same spec                                                                           | `DONE — VERIFIED` |
| Homepage `<title>`              | `ODD — creative and cultural fields, business and society` | `All Things ODD — creative and cultural fields, business and society` | public | Same spec                                                                           | `DONE — VERIFIED` |
| Product page titles             | product-first                                              | unchanged, and now asserted product-first                             | public | Same spec — "product pages stay product-first"                                      | `DONE — VERIFIED` |
| `robots.txt` sitemap URL        | `https://allthingsodd.co/sitemap-index.xml`                | unchanged                                                             | public | `public/robots.txt`                                                                 | `DONE — VERIFIED` |
| Sitemap output                  | `allthingsodd.co`                                          | unchanged                                                             | public | Generated `dist/sitemap-0.xml`                                                      | `DONE — VERIFIED` |
| Favicon / logo                  | ODD mark                                                   | unchanged — a site rename is not a new visual identity                | public | `public/favicon.svg`, `src/assets/logos/odd-mark.svg`                               | `DONE — VERIFIED` |

---

## D. Homepage content decisions (§6A)

| Surface                             | Before                                                        | After                                                                                                                                                                                      | Evidence                                                                                                                                                | Status            |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `What's happening` rendered section | Rendered, gated on `whatsHappening.items.length > 0`          | **Removed.** Section, its `WhatsOn.astro` component, its `whatsHappening` content, its `activityItem` schema shape and its CloudCannon inputs are all deleted                              | `identity-integrity.spec.ts` — asserts none of `What's happening`, `whats-happening`, `whats-on` appears on `/`; `git grep` finds no residual reference | `DONE — VERIFIED` |
| Homepage section order              | … → audience → What's happening → Work with ODD → participate | … → audience → Featured in → Work with ODD → participate                                                                                                                                   | `editorial-integrity.spec.ts` order assertions, updated                                                                                                 | `DONE — VERIFIED` |
| `Already in motion` headline        | "ODD started as an experiment. It did not stay one."          | "In less than two years, ODD has already brought thousands of people, collaborators and organisations into the same orbit."                                                                | Rendered `/`                                                                                                                                            | `DONE — VERIFIED` |
| `Already in motion` body            | 2025-only recap                                               | "More than 5,000 people have taken part. We have worked with 500+ collaborators and 100+ partners — and channelled more than €400,000 directly into the creative and cultural industries." | Rendered `/`                                                                                                                                            | `DONE — VERIFIED` |
| Proof figures                       | `2,600+` Participants / `350+` Contributors / `70+` Partners  | `5,000+` Participants / `500+` Collaborators / `100+` Partners / `€400K+` Directly into creative & cultural industries                                                                     | `identity-integrity.spec.ts` — asserts all four present **and** all three old values absent                                                             | `DONE — VERIFIED` |
| `€400K+` accessible form            | n/a                                                           | `srValue: "More than €400,000"` — the visible glyphs are hidden from the a11y tree in favour of the full figure                                                                            | Same spec                                                                                                                                               | `DONE — VERIFIED` |
| Impact report link                  | `2025 Impact Report`, unqualified, under three 2025 figures   | Same label, now with `reportNote`: "The 2025 report covers ODDfest 2025 alone. The figures above are cumulative across everything ODD has run since."                                      | Same spec                                                                                                                                               | `DONE — VERIFIED` |
| Four-stat layout                    | n/a (three stats)                                             | 4-across ≥1025px, 2×2 from 701–1024px, single column ≤700px — scoped to `.home-proof` so Media's 8-stat and About's 2-stat rows keep the shared behaviour                                  | Same spec — no horizontal overflow at 320/375/390/430/768/1024                                                                                          | `DONE — VERIFIED` |
| 2025 figures elsewhere              | About's own impact section                                    | untouched — this was a homepage cumulative-proof update, not a rewrite of history                                                                                                          | `src/content/pages/about.json` unchanged                                                                                                                | `DONE — VERIFIED` |
| CloudCannon editability             | `proof` inputs existed                                        | `proof` comment rewritten for the cumulative framing; `srValue`/`reportNote` explained; `whatsHappening` inputs removed                                                                    | `npm run cc:validate`                                                                                                                                   | `DONE — VERIFIED` |

---

## E. Contact and external identity

| Surface                                                      | Current value                                                                                         | Required final value                                               | Scope                                | Action taken                                                                                                                                                                                                                                                                                                                                                                                                                                               | Status                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Masterbrand contact email                                    | `hello@oddfest.co`                                                                                    | `hello@allthingsodd.co`                                            | public                               | **Not changed, deliberately.** `allthingsodd.co` has no `MX` record — `dig MX allthingsodd.co` returns nothing — so every `@allthingsodd.co` address currently bounces. §7 forbids publishing an address that cannot receive mail; `hello@oddfest.co` is on Google Workspace and works                                                                                                                                                                     | `BLOCKED — EXTERNAL CREDENTIAL` (B13) |
| ODDference pre-purchase help                                 | `hello@oddfest.co`                                                                                    | as above                                                           | public                               | As above                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `BLOCKED — EXTERNAL CREDENTIAL` (B13) |
| ODDspace accessibility contact                               | `hello@oddfest.co`                                                                                    | as above                                                           | public                               | As above                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `BLOCKED — EXTERNAL CREDENTIAL` (B13) |
| Privacy contact                                              | `hello@oddfest.co`                                                                                    | as above                                                           | public                               | As above                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `BLOCKED — EXTERNAL CREDENTIAL` (B13) |
| Ticket checkout fallback / invoice mailto / storefront error | `ronny@oddfest.co`                                                                                    | `ronny@allthingsodd.co`                                            | public                               | As above                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `BLOCKED — EXTERNAL CREDENTIAL` (B13) |
| Press contact                                                | `ronny@oddfest.co`                                                                                    | as above                                                           | public                               | As above                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `BLOCKED — EXTERNAL CREDENTIAL` (B13) |
| Guard against the opposite mistake                           | —                                                                                                     | —                                                                  | —                                    | `check-identity.mjs` fails the build on any `@allthingsodd.co` address in source, and `identity-integrity.spec.ts` fails on any in the rendered site. Both flip the day the mailbox exists                                                                                                                                                                                                                                                                 | `DONE — VERIFIED`                     |
| `SURGE_LOGIN`                                                | `ronny@oddfest.co`                                                                                    | unchanged                                                          | **internal provider account**        | Labelled as such in `ci.yml`. Migrating it means migrating the Surge account, which would orphan every published project including production. Never rendered publicly                                                                                                                                                                                                                                                                                     | `DONE — VERIFIED`                     |
| Newsletter publication                                       | `oddfest.beehiiv.com`                                                                                 | An All Things ODD–branded publication                              | public (form action, no-JS fallback) | Left working. Renaming or re-domaining needs Beehiiv account access; a guessed URL would lose every subscriber who tries. Classified in `cloudcannon.config.yml` for editors                                                                                                                                                                                                                                                                               | `BLOCKED — EXTERNAL CREDENTIAL` (B15) |
| Global social links                                          | ODDfest-branded accounts on Instagram / LinkedIn / Facebook / YouTube / TikTok, plus a Discord invite | Genuine masterbrand accounts, or product channels honestly scoped  | public                               | No handle invented. What changed: the icon-only links in the footer, fullscreen menu and contact page had `aria-label="Instagram"` — a bare platform name on a site called All Things ODD reads as the umbrella account. They now name the real account (`Instagram — @oddfest.fi`), derived from the link itself via `src/components/primitives/social-handle.ts`, so it cannot drift. Whether ODD wants its own masterbrand accounts is a human decision | `BLOCKED — HUMAN DECISION` (B14)      |
| Media page social list                                       | already showed real handles                                                                           | unchanged; now shares the extracted helper instead of its own copy | public                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `DONE — VERIFIED`                     |
| GA4 stream display name                                      | `ODDpage`, measurement ID `G-9Q90CQMBK8`                                                              | `All Things ODD` display label, same measurement ID                | external                             | No console access from this session. The measurement ID is host-independent so nothing is broken; this is a label                                                                                                                                                                                                                                                                                                                                          | `BLOCKED — EXTERNAL CREDENTIAL` (B16) |
| Search Console property                                      | `allthingsodd.co` to be confirmed                                                                     | —                                                                  | external                             | No console access. `public/google181860bcd4b9963d.html` ships with every build, so the property verifies on the same token                                                                                                                                                                                                                                                                                                                                 | `BLOCKED — EXTERNAL CREDENTIAL` (B16) |
| Behold feed / allowed domain                                 | unset                                                                                                 | a real feed ID                                                     | external                             | Unchanged from B8 — the section is not rendered at all while unset                                                                                                                                                                                                                                                                                                                                                                                         | `BLOCKED — EXTERNAL CREDENTIAL` (B8)  |
| Web3Forms key                                                | empty                                                                                                 | a real key                                                         | external                             | Unchanged from B11 — the form says honestly that it is not connected                                                                                                                                                                                                                                                                                                                                                                                       | `BLOCKED — EXTERNAL CREDENTIAL` (B11) |

---

## F. Domains

Measured 2026-09-04 from this machine.

| Domain                           | NS / host                                                         | HTTP result                                                                                              | Final destination                         | TLS   | Required                                  | Status                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allthingsodd.co`                | `ns1–4.surge.world` (Surge)                                       | `200`                                                                                                    | itself                                    | valid | canonical                                 | `DONE — VERIFIED`                                                                                                                                                                                                                                                                                         |
| `www.allthingsodd.co`            | folded by Surge                                                   | `301`                                                                                                    | `https://allthingsodd.co/`                | valid | redirect to apex                          | `DONE — VERIFIED`                                                                                                                                                                                                                                                                                         |
| `odd-field-guide.surge.sh`       | Surge                                                             | `200`, serving the identical build, then a `location.replace()` to the same path on the canonical domain | `allthingsodd.co`                         | valid | keep as a backward-compatibility redirect | `DONE — VERIFIED` — **LEGACY REDIRECT, KEEP**                                                                                                                                                                                                                                                             |
| `allthingsodd-preview.surge.sh`  | —                                                                 | not yet created                                                                                          | —                                         | —     | future preview host                       | naming decided; nothing published to it yet                                                                                                                                                                                                                                                               |
| `odd-field-guide-astro.surge.sh` | Surge                                                             | `200`                                                                                                    | itself                                    | valid | retire                                    | Serves no backward-compatibility purpose (nothing public links to it) and every page on it carries a canonical pointing at `allthingsodd.co`, so it is not an indexing problem — but it is a live copy of the site under the retired name. Tear down: `npx surge teardown odd-field-guide-astro.surge.sh` |
| `oddfest.co`                     | GoDaddy DNS → `76.76.21.21` (Vercel)                              | `200`                                                                                                    | itself — the standalone ODDfest 2026 site | valid | redirect into `allthingsodd.co`           | `BLOCKED — EXTERNAL CREDENTIAL` (B17)                                                                                                                                                                                                                                                                     |
| `www.oddfest.co`                 | Vercel DNS                                                        | `308`                                                                                                    | `https://oddfest.co/` — its own apex      | valid | redirect into `allthingsodd.co`           | `BLOCKED — EXTERNAL CREDENTIAL` (B17)                                                                                                                                                                                                                                                                     |
| `oddspace.co`                    | `ns1/ns2.dns-parking.com` → `45.84.206.17` (Hostinger, WordPress) | `200`                                                                                                    | itself — the standalone ODDspace site     | valid | redirect to `/oddspace`                   | `BLOCKED — EXTERNAL CREDENTIAL` (B18)                                                                                                                                                                                                                                                                     |
| `www.oddspace.co`                | Hostinger                                                         | `301`                                                                                                    | `https://oddspace.co/` — its own apex     | valid | redirect to `/oddspace`                   | `BLOCKED — EXTERNAL CREDENTIAL` (B18)                                                                                                                                                                                                                                                                     |

**Not a legacy domain, do not redirect it:** `instagram.com/oddspace.co`. The
string `oddspace.co` also appears in this repo as an **Instagram handle** —
the ODDspace account is literally named `oddspace.co`. Every `oddspace.co` hit
in `src/` is that handle, not the website.

### Why the two live domains cannot be redirected from here

- **`oddfest.co`** carries Google Workspace mail (`MX` → `aspmx.l.google.com`
  and friends) on GoDaddy DNS, and its website is a Vercel project. Delegating
  its nameservers elsewhere would take the mail down with the site, so the
  redirect must be a **Vercel-side redirect**, not a DNS change. That needs the
  Vercel project. No Vercel CLI credentials exist on this machine
  (`~/Library/Application Support/com.vercel.cli/` has no `auth.json`).
- **`oddspace.co`** is WordPress on Hostinger with no `MX` records, so DNS is
  safe to move — but it still needs Hostinger or registrar access, which this
  repo does not have.

### The redirect map, built from the real route inventories

Taken from `oddfest.co`'s own sitemap and link graph (237 URLs) and
`oddspace.co`'s `wp-sitemap.xml`, not guessed.

**`oddfest.co` → `allthingsodd.co`** (Vercel `redirects`, permanent once verified)

| Old path                                                                               | Destination   | Why                                                                                                             |
| -------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                    | `/oddfest`    |                                                                                                                 |
| `/about/` (already 308s to the next row) and `/about-creative-festival-helsinki-2026/` | `/oddfest`    |                                                                                                                 |
| `/creative-week/`                                                                      | `/oddfest`    | Creative Week is what `/oddfest` now is                                                                         |
| `/info/`                                                                               | `/oddfest`    |                                                                                                                 |
| `/oddference/`                                                                         | `/oddference` | Path preserved — it maps cleanly                                                                                |
| `/media/`                                                                              | `/media`      | Path preserved                                                                                                  |
| `/contact/`                                                                            | `/contact`    | Path preserved                                                                                                  |
| `/schedule/`                                                                           | `/oddfest`    | A past event's schedule; there is no current equivalent, so do **not** path-preserve onto a page that would 404 |
| `/lineup/` and `/lineup/*` (233 artist pages)                                          | `/oddfest`    | Same reasoning. These are the bulk of the old site                                                              |
| `/tickettype/oddference-pass/`                                                         | `/oddference` | The one old purchase route with a live successor                                                                |
| `/tickettype/oddfest-pass/`, `/tickettype/oddfest-pass-student/`                       | `/oddfest`    | Obsolete 2026 purchase pages — must not land anyone in a stale checkout                                         |
| `/404-not-found/`                                                                      | `/`           |                                                                                                                 |
| anything else                                                                          | `/oddfest`    | Catch-all, so no old ODDfest URL dies                                                                           |

**`oddspace.co` → `allthingsodd.co`**

| Old path                                  | Destination |
| ----------------------------------------- | ----------- |
| `/`                                       | `/oddspace` |
| `/about/`                                 | `/oddspace` |
| `/join/`                                  | `/oddspace` |
| `/feed/`, `/comments/feed/`, `/wp-json/*` | `/oddspace` |
| anything else                             | `/oddspace` |

Preserve query strings on all of the above.

### How this is verified once it is done

The `deploy` job's **"Verify the other ODD domains redirect here"** step checks
all four hostnames on every production deploy, and adapts rather than needing
a switch flipped:

- a domain still serving its own site, or still folding `www` onto its own
  apex, produces a **warning** — that is the known blocker, not a regression;
- a domain that redirects to `allthingsodd.co` is then held to the exact
  destination in the map above, and **fails the deploy** if it later breaks,
  changes, or points somewhere else;
- a redirect to any third destination fails immediately.

So the day B17/B18 are done, the check starts enforcing them with no code
change. Verified against the live domains while writing it: currently four
warnings, exit 0.

---

## G. Deployment

| Surface                      | Before                                                                                                                | After                          | Status                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `SURGE_TOKEN` secret         | domain-scoped to `odd-field-guide.surge.sh`; every push to `main` since the domain cutover failed at the publish step | an account-scoped token        | `BLOCKED — SESSION PERMISSION` (B12, see [Handover](#handover-commands)) |
| Latest `main` Actions run    | `failure` at deploy (run 33825560636)                                                                                 | must be green including deploy | Blocked behind B12                                                       |
| Production `build-info.json` | `d57630d…` — current, but published **by hand**                                                                       | published by CI                | Blocked behind B12                                                       |
| CI `checks` job              | check / lint / format / cc:validate / build                                                                           | + `npm run check:identity`     | `DONE — VERIFIED`                                                        |
| CI deploy verification       | primary + legacy host + www                                                                                           | + the four legacy ODD domains  | `DONE — VERIFIED`                                                        |

---

## H. CloudCannon

A GitHub repository rename preserves the repository **ID**, and CloudCannon's
connection is bound to that ID rather than to the slug, so the connection is
expected to follow the rename with no reconnection. That is the expectation,
not a verification: this session has no CloudCannon account access, so it
could not open the project, confirm the connection status, rename the project
label to All Things ODD, or run a test edit. See B19.

Nothing in `cloudcannon.config.yml` referenced the old repository name, so the
config itself needed no rename — only the two content-schema changes above
(`whatsHappening` inputs removed, `proof` comment rewritten), both validated
by `npm run cc:validate`.

---

## Classification of every remaining hit

Required by §14. Run `git grep` for each; every hit falls into one of these.

| String                                      | Count         | Classification                                                                                                                                                                                            |
| ------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ODD Field Guide`                           | 3             | `HISTORICAL RECORD — KEEP` — `AGENTS.md` and `README.md` each name it once to retire it; this document records the migration                                                                              |
| `odd-field-guide.surge.sh`                  | many          | `LEGACY REDIRECT — KEEP` — the retired production host, still published and forwarding                                                                                                                    |
| `odd-field-guide-astro.surge.sh`            | 2             | `HISTORICAL RECORD — KEEP` — `docs/deployment.md` and this file name the retired preview host                                                                                                             |
| `odd-field-guide.ronny-507.workers.dev`     | 3             | `EXTERNAL SERVICE — KEEP` — the Growth OS Worker's deployed hostname. It is owned by `../odd-growth-os` and serves the live `/api/*` boundary; renaming it from here would break ticketing and both forms |
| `ronny-sketch/odd-field-guide`              | 1             | `HISTORICAL RECORD — KEEP` — this file                                                                                                                                                                    |
| `odd-field-guide-astro` (as a package name) | 0             | changed                                                                                                                                                                                                   |
| `hello@oddfest.co`, `ronny@oddfest.co`      | 12 + 12       | `INTERNAL PROVIDER ACCOUNT / WORKING MAILBOX — KEEP UNTIL MIGRATED` — see B13                                                                                                                             |
| `oddfest.co` outside an email address       | 0 user-facing | remaining hits are comments comparing this site's consent approach to `oddfest.co`'s, plus `SURGE_LOGIN`                                                                                                  |
| `oddspace.co`                               | 17            | `PRODUCT-SPECIFIC IDENTITY — KEEP` — every one is the Instagram handle `@oddspace.co`, not the website                                                                                                    |
| `oddfest.beehiiv.com`                       | 1             | `LEGACY ACCOUNT — KEEP UNTIL MIGRATED` — see B15                                                                                                                                                          |

`scripts/check-identity.mjs` encodes exactly this table and fails on anything
outside it. Its allowlists are per-file with a stated reason; there is no
directory-level allowance, deliberately.

---

## Blockers

Carried forward from `docs/FINAL_IMPLEMENTATION_MATRIX_2026-09-03.md`: **B1–B11
are unchanged** — re-read that document for each. Two of its rows are
superseded by this pass (its row 11, "What's happening", is removed rather than
gated; its row 9, the 2025-only proof figures, is replaced by the cumulative
ones). B12 is restated here because it is now the launch-critical one.

Launch-critical (affects live truth or operational completeness): **B12, B13,
B17, B18**. B8 and B11 remain launch-critical per the previous matrix. The
rest are honest, visible-as-pending gaps.

**B12 — `SURGE_TOKEN` is still domain-scoped, so automatic deployment is
broken.** _Missing:_ an account-scoped Surge token in the repository secret.
_Why it is not done here:_ this session's tooling refused every credential
command (`surge tokens list`, `surge tokens add`, `gh secret set`). The
account is logged in (`npx surge whoami` → `ronny@oddfest.co`) and `gh` has
admin on the repo, so the command below will work from a normal terminal.
_Human action:_ see [Handover](#handover-commands). _Consequence until then:_
a CloudCannon content edit does not reach the live site on its own, and `main`
is red at the deploy job.

**B13 — `allthingsodd.co` cannot receive mail.** _Missing:_ `MX` records and a
real mailbox or forward for `hello@allthingsodd.co` (and, if the ticketing
fallback moves too, `ronny@allthingsodd.co`). _Verified, not assumed:_
`dig MX allthingsodd.co` returns nothing, and the domain's nameservers are
Surge's, which host DNS for a static site rather than a mail domain — so this
may also require moving the domain's DNS to a provider that will serve `MX`,
or adding mail routing at the registrar. _Why code cannot invent it:_ an email
address that bounces is worse than one on an old domain. _Human action:_ create
the mailbox or forward (the simplest route is adding `allthingsodd.co` as a
domain alias on the existing Google Workspace that already serves
`oddfest.co`), send a real test message, confirm it arrives — then change the
six content locations listed in section E and delete the two guard assertions
that currently forbid the new address. _Prepared:_ every address lives in
content or one clearly-marked script constant; the cutover is a content edit,
not a code change.

**B14 — masterbrand social accounts.** _Missing:_ a decision on whether ODD
wants umbrella accounts, or keeps presenting ODDfest's. _Why code cannot invent
it:_ inventing a handle publishes a dead link. _Prepared:_ the links now name
the real account they open, so nothing currently claims to be something it is
not.

**B15 — Beehiiv publication identity.** _Missing:_ Beehiiv account access.
_Human action:_ rename the publication to All Things ODD and, if a custom
domain is wanted, configure it — then update `newsletterHref`. _Prepared:_ the
field is one content value with a comment explaining exactly this.

**B16 — GA4 stream label and Search Console property.** _Missing:_ Google
console access. Display-label changes only; the measurement ID is
host-independent and collection has never stopped. _Prepared:_ the exact steps
are already in `docs/deployment.md#outside-every-repo`.

**B17 — `oddfest.co` still serves the standalone ODDfest 2026 site.**
_Missing:_ access to the Vercel project. _Why not DNS:_ the domain carries
Google Workspace mail on GoDaddy DNS; repointing nameservers would take the
mail down. _Human action:_ add the redirect map in section F to the Vercel
project's `vercel.json` (or its dashboard redirects), deploy, then let the next
production deploy's verification step confirm it. _Prepared:_ the map is built
from the old site's real 237-URL sitemap, and CI enforces it the moment it
exists.

**B18 — `oddspace.co` still serves the standalone ODDspace site.** _Missing:_
Hostinger or registrar access. _Why this one matters beyond naming:_ that site
publicly carries `+1000 m²`, `40+ members` and a flat `150€/month` — figures
this site deliberately withholds as unverified (B4). Leaving it up is a
factual-consistency bug, not only a domain-tidiness one. _Human action:_ set up
the three-row redirect map in section F. `oddspace.co` has no `MX` records, so
unlike `oddfest.co` this one can also be solved by pointing DNS at a redirect
host. _Prepared:_ as above.

**B19 — CloudCannon connection after the rename.** _Missing:_ CloudCannon
account access to confirm the connection followed the repository rename, to
rename the project label, and to run a test content edit end to end. _Expected
to be fine:_ the connection binds to the repository ID, which a rename
preserves. _Human action:_ open the project, confirm it points at
`ronny-sketch/allthingsodd`, rename the project label to All Things ODD, and
make one trivial edit to prove CloudCannon → GitHub → CI → production. Note
that the last hop of that chain depends on B12.

---

## Handover commands

Three things this session could not run. Each was blocked by tooling policy,
not by a technical problem, and each is safe to run from a normal terminal in
this working copy.

```bash
# 1. Point the local checkout at the renamed repository.
#    (fetch/push already work via GitHub's rename redirect; this makes it durable.)
git remote set-url origin https://github.com/ronny-sketch/allthingsodd.git
git remote -v

# 2. B12 — replace the domain-scoped deploy token with an account-scoped one.
#    The value goes straight from surge into GitHub's secret store and is
#    never printed. Requires `surge` logged in as ronny@oddfest.co (it is)
#    and `gh` authenticated (it is).
npx surge tokens add -m "github-actions-ci-$(date +%Y%m%d)" \
  | gh secret set SURGE_TOKEN --repo ronny-sketch/allthingsodd

# 3. Retire the old preview host (optional, safe — nothing public links to it).
npx surge teardown odd-field-guide-astro.surge.sh
```

After (2), re-run the latest `main` workflow and confirm the deploy job is
green and that `https://allthingsodd.co/build-info.json` reports the merge
commit:

```bash
gh run list --repo ronny-sketch/allthingsodd --limit 1
curl -fsS https://allthingsodd.co/build-info.json
```
