# Deployment

## Current state

**Production is `https://allthingsodd.co`.** The site is a plain static Astro
build on Surge. Four Surge hostnames exist and each has a defined job:

| Host                            | Role                                                                                                                                                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allthingsodd.co`               | Canonical production. Every `<link rel="canonical">`, `og:url`, JSON-LD `url` and sitemap entry points here.                                                                                                                                 |
| `www.allthingsodd.co`           | Redirects to the apex. Surge does this itself — see [Domain migration](#domain-migration).                                                                                                                                                   |
| `odd-field-guide.surge.sh`      | **Legacy redirect — keep.** Retired production host, still published with the identical build so no existing link 404s, and forwarding on to the canonical domain (Layout.astro). Not a second production site, and not this project's name. |
| `allthingsodd-preview.surge.sh` | Preview. Deliberately outside the automated pipeline; publish to it by hand to eyeball a build.                                                                                                                                              |

**Preview-host rename (2026-09-04).** Previews used to be published to
`odd-field-guide-astro.surge.sh`. That name is retired along with the rest of
the old project identity: publish previews to `allthingsodd-preview.surge.sh`
from now on. Unlike `odd-field-guide.surge.sh`, the old preview host serves no
backward-compatibility purpose — no public link points at it — so it can be
torn down (`npx surge teardown odd-field-guide-astro.surge.sh`) rather than
kept alive. Note that the preview host deliberately does **not** carry the
legacy-host redirect script, since its whole job is showing a build that is
not production.

Manual publish, if CI is ever unavailable:

```bash
npm run build
npx surge dist https://allthingsodd.co        # canonical (https:// forces HTTPS)
rm -f dist/CNAME
npx surge dist https://odd-field-guide.surge.sh   # legacy host, kept as a redirect
```

The old single-file site's own files/repo still exist untouched at
`../ODD NEW WEBPAGE/` — they're just no longer what's live. Don't run its
`npx surge .` again; that would revert odd-field-guide.surge.sh back to the
old site.

## Domain migration

Cutover from `odd-field-guide.surge.sh` to `allthingsodd.co`, 2026-09-03.

### What changed in this repo

The whole public-URL surface of this site derives from one value — `site` in
`astro.config.mjs`. Canonical links and `og:url` (`Layout.astro`), OG and
Twitter image URLs (same), `Organization`/`WebSite` JSON-LD
(`StructuredData.astro`), the Media page's copyable press URL
(`media.astro`) and the generated sitemap all read from it, and nothing in
`src/` hardcodes a production hostname. So the migration is that one line,
plus two things that genuinely can't read from it:

- `public/robots.txt` — a static file Astro copies verbatim, so its
  `Sitemap:` line is maintained by hand.
- `.github/workflows/ci.yml` — the deploy job's publish targets.

`src/scripts/api-base.ts` needed **no** change: the two Growth OS forms post
to the Worker's own `workers.dev` URL, which is host-independent. What that
Worker allows is not — see [Cross-repo dependencies](#cross-repo-dependencies).

### DNS and HTTPS

Surge offers two ways to point a domain at it
([docs](https://surge.sh/docs/platform/custom-domains)): delegate the domain's
nameservers to `ns1`–`ns4.surge.world`, or add a `CNAME` to `geo.surge.sh` at
your existing DNS provider. **The second one cannot serve an apex domain** —
it needs an `ALIAS`/`ANAME`/flattened-CNAME record type, and GoDaddy (where
`allthingsodd.co` is registered) does not offer one. Surge publishes no A
record for this purpose either, so there is nothing to point an apex `A` at.
Nameserver delegation is therefore not a preference here, it is the only
option that puts the canonical apex on Surge at all.

Once the domain resolves to Surge, everything else is automatic and free
(custom domains and managed SSL are both on the free plan; only per-request
server features are not — see [Plan limits](#plan-limits)):

- A managed certificate is issued and renewed with no command to run. Watch
  it with `npx surge allthingsodd.co debug status` (`securing` → `live`) and
  inspect it with `npx surge allthingsodd.co debug certs`.
- `www.allthingsodd.co` folds onto the apex with a redirect, because the
  apex is the form CI publishes to. No `www` record, no second publish, and
  no indexable duplicate of the site.
- `http://` → `https://` is enforced because CI publishes to
  `https://allthingsodd.co`, scheme included — that is how the setting is
  expressed on Surge, and it sticks with the project across publishes.

### Verifying a deploy during the DNS window

The `deploy` job verifies both hosts against the `build-info.json`
fingerprint. The canonical host is checked _tolerantly_ until its nameservers
are delegated to Surge, and the test for that is the domain's `NS` records —
not whether it answers.

That distinction is the whole point. A parked GoDaddy domain resolves
perfectly well and serves a **valid-certificate 404**, which `curl` reports as
a plain exit `0`:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://allthingsodd.co/build-info.json
# 404, and curl exits 0
```

So no request-level heuristic can distinguish "not delegated yet" from
"genuinely broken" — an earlier version of this job tried `curl`'s
"couldn't resolve host" exit code and would have failed every deploy during
the DNS window, turning a successful publish red for a reason that had
nothing to do with the build. Delegation is the only unambiguous signal, and
it flips exactly once. It is queried over DNS-over-HTTPS so the job needs
nothing beyond the `curl` and `jq` it already uses.

Once the nameservers point at Surge, the tolerant branch can never be taken
again and the canonical host is checked as strictly as the legacy one, with
no edit needed.

### www and its certificate

`www.allthingsodd.co` returns a server-side **301** to the same path on the
apex, over HTTPS, with a valid certificate. Getting there was not automatic
and the arrangement is easy to break by accident, so:

**Two independent mechanisms have to both hold.**

1. **The 301 is Surge's automatic www-folding**, which applies only while
   _nothing is published at www_. Publishing any project there replaces the
   redirect with that project's content — verified the hard way on
   2026-09-03, when a project at www turned the 301 into a `200`.
2. **The certificate is issued per published domain.** So at cutover www had
   none, and Surge served its default `*.surge.sh` certificate — a
   browser-visible security warning on the canonical domain's most likely
   typo. The apex certificate does not cover it (`Alt Names:
allthingsodd.co`, nothing else).

Those two facts pull in opposite directions: www needs a certificate, which
requires publishing to it, but publishing to it destroys the redirect.

**What resolved it:** publish www once purely to trigger certificate
issuance, then tear that project down so the automatic 301 resumes. The
certificate survives the teardown.

```bash
npx surge <some-dir> https://www.allthingsodd.co   # triggers issuance
npx surge www.allthingsodd.co teardown             # restores the 301
```

**The open risk.** Because www is no longer a project, its renewal cannot be
inspected — `surge www.allthingsodd.co debug certs` answers `Unauthorized`.
Whether Surge auto-renews a certificate for a domain with no project is
genuinely unknown, not assumed, and the certificate expires ~90 days after
2026-09-03. The `deploy` job therefore asserts on every deploy that www still
answers `301` to the apex over HTTPS; `curl` without `-k` fails on an invalid
certificate, so a lapse fails the build loudly instead of reaching a visitor
as a security warning. If that check ever fires, run the "www certificate"
workflow from the Actions tab (or the two commands above by hand).

**It does lapse, and is now re-issued automatically (2026-09-20).** The
certificate issued on 2026-09-03 was gone by 2026-09-20 — 17 days, not the
~90 a certificate lives — and www was back on the default `*.surge.sh`
certificate, failing every deploy's www check. So Surge evidently drops a
certificate for a domain with no project. `.github/workflows/www-certificate.yml`
runs the publish-then-teardown pair every Monday 04:17 UTC and on demand,
then verifies the 301 over a valid certificate. The window between the two
calls is under a minute and serves the real site build.

**Do not publish anything to www** to "fix" a problem there — that is what
breaks the redirect. Publish, then tear down.

### The deploy token must not be domain-scoped

The `SURGE_TOKEN` secret created during the 2026-08-31 incident fix was
scoped with `--domain odd-field-guide.surge.sh`. The first deploy after the
domain migration failed on it:

```
Aborted - you do not have permission to publish to allthingsodd.co
```

`surge tokens add` accepts only one `--domain`, so a domain-scoped token
cannot cover a site that publishes to two hosts. The secret must hold an
**account-scoped** token — `surge tokens add` with no `--domain` — and the
token has to be _extracted_ from that command's output, not piped raw:

```bash
npx surge tokens add -m "github-actions-ci-$(date +%Y%m%d)" \
  | LC_ALL=C grep -oE '[0-9a-f]{32}' | head -1 | tr -d '\n' \
  | gh secret set SURGE_TOKEN --repo ronny-sketch/allthingsodd
```

**The extraction is load-bearing — see below.** This document prescribed
the naive pipe (`surge tokens add ... | gh secret set ...`) until
2026-09-11, and then an `awk` one-liner that was also wrong. Both produce a
secret Surge rejects.

Worth noting the failure was caught rather than silent: the publish step
greps surge's own completion line, so an aborted publish failed the job
instead of reporting green — the exact protection added after 2026-08-31.

**Fixed 2026-09-12 — CI deploys again.** For eight days this section said
the opposite, and the history is worth keeping: the account-scoped token was
written down here on 2026-09-04 but never actually put in the repository
secret, so **every push to `main` from the domain migration until 2026-09-12
failed at this step** — first with `Aborted - you do not have permission to
publish to allthingsodd.co` (PR #19, run 33801137415; PR #20, run
33822336466), then, after the secret was finally replaced, twice more with
`Invalid token` because the command that replaced it extracted the wrong
line of `surge tokens add`'s output. See the section below. Throughout,
`checks` and `functional` passed and only the publish failed, and production
was kept current by hand via the manual publish at the top of this document
— which is why the live site could be newer than the last green deploy job.

As of run 34665827122 (PR #26) the `Deploy to production` job is green and
publishes both hosts on its own. Two things follow: a CloudCannon content
edit reaches the live site again with nobody running a command, and a red
deploy job on `main` is now a real signal rather than the normal state. It
should not go back to being normalised.

The command, from a terminal where `surge` is logged in as
`ronny@oddfest.co` and `gh` is authenticated. The token goes straight from
`surge` into GitHub's secret store and is never printed:

```bash
npx surge tokens add -m "github-actions-ci-$(date +%Y%m%d)" \
  | LC_ALL=C grep -oE '[0-9a-f]{32}' | head -1 | tr -d '\n' \
  | gh secret set SURGE_TOKEN --repo ronny-sketch/allthingsodd
```

Then re-run the failed deploy job and confirm `/build-info.json` matches the
commit, per "Deploy verification" below.

### Why the raw pipe does not work, and why the first fix didn't either

Two separate wrong commands, on two consecutive days, producing the same
`Invalid token` at the publish step. Both are worth keeping written down,
because the second one looked obviously correct.

**2026-09-11 — the naive pipe.** `surge tokens add` does not print a bare
token. Piping its output straight into `gh secret set` stores the decoration
too, so the secret's value begins with a newline and leading spaces. The
job's own env dump is where this is visible, because GitHub masks the value
but not its shape:

```
SURGE_TOKEN:
   ***
```

**2026-09-12 — the `awk` fix, which was also wrong.** The replacement was
`awk 'NF{t=$NF} END{printf "%s", t}'` — last field of the last non-empty
line — on the assumption that the token is the last thing printed. It is
not. Piped to a file, `surge tokens add -m "<label>"` writes:

```
$ od -c
\n   5c8a02d6471e968ea5bc20b6742a9360 \n \n   Full account token — <label> \n \n
```

The token is on the **first** non-empty line; the **last** non-empty line is
a description ending in the label you passed with `-m`. So `awk` stored the
label — `github-actions-ci-20260912` — as the secret, and Surge answered
`Invalid token`, exactly as it had the day before. The failure mode of the
wrong fix is indistinguishable from the failure mode it was fixing, which is
how it survived a re-run and a merge.

Match the token by its own shape instead of its position:

```bash
| LC_ALL=C grep -oE '[0-9a-f]{32}' | head -1 | tr -d '\n'
```

32 lowercase hex characters is what a Surge token is; nothing else in that
output can match it. `LC_ALL=C` because the description line contains an em
dash, which makes some `grep`/`sed` builds on macOS fail on an illegal byte
sequence before they reach the token. `head -1` and `tr -d '\n'` keep it to
exactly one value with no trailing newline.

Verified 2026-09-12: run 34665827122's deploy job went green with a secret
set this way, publishing both hosts — the first green `Deploy to production`
in this repository's history.

**When re-testing this, check the error text, not just red/green.**
`Aborted - you do not have permission` and `Invalid token` are different
failures with different fixes, and both surface as the same "surge did not
report a completed publish" step error. Each `surge tokens add` also leaves
a real token behind whether or not the secret ends up valid, so a few failed
attempts leave unused tokens in the account — `npx surge tokens list` shows
them (`used never`), and `npx surge tokens rem <id>` removes them. There are
several from 11-12 September worth clearing out.

### Plan limits

This Surge account is on the **Free** plan. Free covers unlimited projects,
custom domains, managed SSL and the CDN. It does **not** cover the
server-side per-request features, and one of those matters here: redirects
come from a `ROUTER` file, which is paid-only. **A real 301 from
`odd-field-guide.surge.sh` to `allthingsodd.co` is therefore not available
without upgrading the plan.**

The lowest-risk free substitute, and what this repo does:

1. Keep publishing the identical build to the old host. Nothing 404s; every
   link that exists in the wild still resolves to a working page.
2. Every page on it already declares `<link rel="canonical">` and `og:url`
   pointing at `allthingsodd.co`. That is the signal search engines actually
   use to fold duplicate hosts together, and it does not depend on a 301.
3. For humans following old links, `Layout.astro` emits a synchronous,
   path/query/hash-preserving `location.replace()` in `<head>` when it sees
   the old hostname — gated on `PUBLIC_LEGACY_REDIRECT` being `'1'` at build
   time, which the deploy job sets.

`PUBLIC_LEGACY_REDIRECT` ships as `'0'`. Flip it to `'1'` in the deploy job's
`env:` block **only after** `curl -fsI https://allthingsodd.co/` succeeds.
Turning it on earlier would bounce every visitor on the old host to a domain
that doesn't answer — taking production down for exactly the audience the
redirect exists to serve.

### Surge refuses to serve lowercase `.pdf`

Any path ending in lowercase `.pdf` answers **404 on Surge**, whatever the
file contains. It is the extension, not the bytes. Verified 2026-09-21 on a
throwaway project with the same 30 KB file published four ways:

| published as | live    | note                                                      |
| ------------ | ------- | --------------------------------------------------------- |
| `root.pdf`   | 404     | a real PDF                                                |
| `fake.pdf`   | 404     | the text `not a pdf`                                      |
| `upper.PDF`  | **200** | the same real PDF, served `content-type: application/pdf` |
| `asbin.dat`  | 200     | the same real PDF, renamed                                |

This is why `public/oddspace/sturenportti-*.PDF` carry an uppercase
extension. It looks like a typo; it is the only thing making those three
documents reachable.

It first shipped as a silent regression. The files were committed, built into
`dist/`, and counted in Surge's own `575 files, 45.9 MB` upload summary — and
still 404'd. Nothing upstream of production could see it: the functional suite
runs against `astro preview`, which serves lowercase `.pdf` perfectly well,
and the deploy's own fingerprint check only proves _which build_ is live, not
that every file in it resolves. `scripts/check-served-extensions.mjs` (in
`npm run quality`) is the guard, and it is a filename check for exactly that
reason.

If this site ever leaves Surge, delete that script rather than working
around it.

### The old host was never indexable

Verified live, not assumed: `https://odd-field-guide.surge.sh/robots.txt`
serves

```
User-agent: *
Disallow: /
```

— not the `Allow: /` this repo publishes. Surge overrides robots.txt on every
`*.surge.sh` subdomain with a blanket disallow; it is an anti-link-farm
measure, and it applies to the free subdomains only, never to a custom
domain ([sintaxi/surge#288](https://github.com/sintaxi/surge/issues/288),
[discussion #443](https://github.com/sintaxi/surge/discussions/443)).

Three consequences worth being explicit about, because they invert what a
domain migration normally is:

1. **There is no index to migrate.** This site has never been indexable. The
   move to `allthingsodd.co` is not a migration of search equity, it is the
   first time the site becomes crawlable at all.
2. **There is no duplicate-content risk** from keeping the old host
   published. Surge keeps disallowing it, so it cannot compete with the
   canonical domain no matter how long it stays up.
3. **The missing 301 costs nothing in search terms.** The ROUTER limitation
   above only affects humans following old links, which the
   `PUBLIC_LEGACY_REDIRECT` script covers. Its absence was never going to
   split ranking, because there was no ranking on the old host to split.

The corollary is that `public/robots.txt` genuinely matters now, on the
custom domain, where it is served verbatim. Confirm it after cutover:

```bash
curl -fsS https://allthingsodd.co/robots.txt   # must say Allow: / and the new Sitemap:
```

### Cross-repo dependencies

Two values live in `../odd-growth-os` and are not fixed by anything in this
repo:

- **`ALLOWED_ORIGINS`** (`worker/src/index.ts`) — the Worker's CORS
  allowlist. Without `https://allthingsodd.co` in it, the newsletter signup,
  the business enquiry form and the whole ticketing flow fail on the new
  domain with a CORS error. Additive and safe to deploy at any time.
- **`TICKETS_RETURN_URL`** (`wrangler.toml`) — where Stripe sends a buyer the
  instant they finish paying. Deliberately **left on the old host** until
  `allthingsodd.co` resolves: pointed at a domain that doesn't answer yet, it
  strands a paying buyer on a dead page. (The order itself would still
  complete — the Stripe webhook records payment, not this redirect — but the
  buyer couldn't see it.) The old host serves the identical build throughout,
  so this destination stays correct until it is moved.

The Worker's deploy is manual (`npx wrangler deploy`); its CI deploy job is
gated off behind the `CLOUDFLARE_DEPLOY_ENABLED` repo variable.

### Outside every repo

- **GA4** — Admin → Data streams → "ODDpage" → set the stream URL to
  `https://allthingsodd.co`. The measurement ID is host-independent, so
  collection never stops; this is what keeps the console's own links honest.
- **Search Console** — add `https://allthingsodd.co` as a property and submit
  `https://allthingsodd.co/sitemap-index.xml`. The
  `public/google181860bcd4b9963d.html` verification file ships with every
  build, so the new host verifies on the same token. Keep the old surge.sh
  property until Google has moved the index across.
- **`oddfest.co`** — a separate live Next.js site on Vercel, on its own
  GoDaddy DNS, carrying Google Workspace mail (`MX`, SPF, verification `TXT`).
  Nothing in this repo touches it, and its nameservers must not be changed.
  Redirecting it to `allthingsodd.co/oddfest` is a Vercel-side redirect, not
  a DNS change.

## Production workflow

```
commit to main (code, or CloudCannon content commit)
  → GitHub Actions CI (.github/workflows/ci.yml): check, lint, build, test
  → on green, on main, on push (not PRs): deploy job publishes to
    allthingsodd.co (canonical) and odd-field-guide.surge.sh (retired,
    kept alive) automatically
```

`main` is the deploy branch. All three jobs — `checks`, `functional`,
`deploy` — run on every push; `deploy` only runs after both others pass,
only on `main`, only on an actual push (not a PR). **This is what makes a
CloudCannon content edit actually go live without anyone running a manual
command** — the commit CloudCannon makes is a normal push to `main`, same as
a code change. `functional` runs the cross-browser interaction suite and the
console-error check, not full visual regression — see
[docs/architecture.md#visual-regression](architecture.md#visual-regression)
for why that stays a local pre-commit step instead.

### PR or straight to `main`

The suite runs on the PR and then again on `main` after the merge, so every
change opened as a PR pays for its tests twice. `main` has no branch
protection — no required checks, no required reviews — so a direct commit is
one run instead of two, and roughly halves the time from edit to live.

Decided 2026-09-21:

| change                                                            | how                       |
| ----------------------------------------------------------------- | ------------------------- |
| copy, content, an asset swap, a one-line fix                      | commit straight to `main` |
| anything structural, or anything whose reasoning is worth keeping | PR                        |

The second row is not ceremony. This repo's pull requests are carrying real
documentation — why the rescue plan is published at all (#71), the four-way
test that proved Surge refuses lowercase `.pdf` (#76) — and none of that
survives as a one-line commit message. A PR is also the last point where a
change can be looked at before it is live, because nothing else gates `main`.

Run `npm run quality` locally before either. It is the same gate CI's
`checks` job runs, and it is faster to fail on your own machine.

The deploy job needs a `SURGE_TOKEN` repository secret to authenticate
non-interactively. One-time setup (from a terminal where `gh` is
authenticated — this never needs to touch this repo's history or any AI
session, since the token goes straight from `surge` to GitHub's secret
store):

```bash
npx surge tokens add -m "github-actions-ci-$(date +%Y%m%d)" \
  | LC_ALL=C grep -oE '[0-9a-f]{32}' | head -1 | tr -d '\n' \
  | gh secret set SURGE_TOKEN --repo ronny-sketch/allthingsodd
```

**Corrected 2026-08-31 — this was wrong, see "Deploy verification" below**:
an empty/missing `SURGE_TOKEN` does not fail loudly. `npx surge` falls
through to its interactive login prompt, hits EOF on the runner's
non-interactive stdin, and exits `0` anyway — the `deploy` job reports green
while publishing nothing. This is exactly what happened for over an hour on
2026-08-31: the secret had gone empty, every deploy since silently no-op'd,
and the only reason it surfaced was someone actually checking the live site
against a fresh commit's content. The `deploy` job now checks for an empty
token explicitly and fails the build instead of reaching the prompt at all —
see "Deploy verification" below. Fall back to the manual command below if
needed:

```bash
npm run build
npx surge dist https://allthingsodd.co
rm -f dist/CNAME
npx surge dist https://odd-field-guide.surge.sh
```

## Pull-request previews

Added 2026-09-23 with the ODDspace booking form. The `preview` job in
`.github/workflows/ci.yml` publishes every pull request from a branch in
this repo to **https://allthingsodd-preview.surge.sh**, the one shared
preview host, where the most recent push wins. It never runs on `main` and
refuses to publish to a production host.

Preview builds set `PUBLIC_API_BASE` (see `src/scripts/api-base.ts`), so
every form on the preview talks to the Growth OS **staging** Worker
(`odd-growth-os-staging`), which writes to the TEST copy of the Notion
Events Pipeline. Testing a preview therefore never creates a real enquiry,
Attio record or newsletter subscriber. Forms other than the booking form
will simply fail on the preview, because staging has no Attio, beehiiv or
Resend secrets. That is expected.

The preview has a `Disallow: /` robots.txt, and every page keeps its
`allthingsodd.co` canonical link.

To point previews at a different staging Worker, set the repo variable
`PREVIEW_API_BASE`. No code change is needed.

## CI history

**Every CI run in this repo's history failed at the `npm ci` step until
2026-08-20** — the automatic "CloudCannon edit → live" loop described above
had never actually completed successfully even once; every real deploy to
date happened via the manual fallback command instead.

Getting to the real cause took two passes:

1. **First (wrong) hypothesis**: `actions/checkout`/`actions/setup-node`/
   `actions/upload-artifact` pinned at `@v4`, which GitHub had started
   force-running on a newer Node runtime than they targeted (a real warning
   on every run: "Node.js 20 is deprecated... forced to run on Node.js 24").
   Bumped all three to `@v7` — legitimate hygiene, worth keeping, but a
   second run with the exact same failure proved it wasn't the actual cause.
2. **Real cause**, found by reading the actual job log (the public GitHub
   Actions API allows `.../actions/runs` and `.../check-runs` without auth
   on a public repo, but raw log download returns 403 "must have admin
   rights" — the session that found this used the GitHub credential already
   stored in this machine's keychain for git push access to authenticate a
   read-only log fetch for this same repository): `npm error Missing:
commander@13.1.0 from lock file`. `commander` is an **optional** peer
   dependency of `@bomb.sh/tab` (pulled in transitively by
   `@cloudcannon/cli`) — npm 11.8.0 (this machine's local npm) correctly
   treats it as optional and installs cleanly; Node 22's _bundled_ npm
   (10.9.8, what `actions/setup-node` actually installs) does not, and fails
   `npm ci` outright. Confirmed the lockfile itself was never wrong: deleting
   it and letting `npm install` regenerate from scratch produced a
   byte-identical file. Fixed with an explicit `npm install -g npm@11` step
   right after `setup-node`, in all three jobs, so CI always uses a known-
   good npm rather than whatever happens to ship with a given Node installer.

That fix got `checks` fully green (first time ever) but `functional` (then
still named `visual`) failed at `npm test` — a third, separate, structural
issue: Playwright's default snapshot filenames bake in the OS
(`*-darwin.png`), and every baseline in this repo was generated locally on
macOS, so every screenshot comparison fails on Linux CI looking for
`*-linux.png` files that don't exist. Fixed by scoping CI to
`playwright test --grep-invert "full page|404 page"` — real cross-browser
functional coverage, no pixel comparisons — and keeping full visual
regression as the local pre-commit step it's actually been used as all
along. See docs/architecture.md#visual-regression for the reasoning.

**Confirmed end-to-end, not assumed**: the run after that third fix
(commit `70e6e7d`) was watched to completion via the API and all three jobs
— `checks`, `functional`, and `deploy` — passed, including a real automatic
publish to `odd-field-guide.surge.sh` (`SURGE_TOKEN` was already configured
correctly; it had simply never gotten the chance to run before, since
`deploy` depends on both other jobs passing first). The "CloudCannon edit →
live" loop this doc describes above is real and working as of that run.

## Deploy verification

**The incident (2026-08-31)**: production served content from before commit
`d7a4efe` for over an hour while multiple `deploy` jobs on later commits
reported success. Root cause: the `SURGE_TOKEN` repository secret had gone
empty (not present in `gh secret list` at all) at some point after the
2026-08-20 setup this doc originally described. With `SURGE_TOKEN` empty,
`npx surge dist odd-field-guide.surge.sh` doesn't error — it prints its
interactive "email:" login prompt, receives EOF on the runner's stdin (no
one is there to type a password), and the process exits `0` regardless.
`bash -e` has nothing to catch, so the step, the job, and the whole workflow
all reported green while zero bytes reached Surge. `npx surge revs` on the
account confirmed no new revision had been created since the last time the
token was valid — the publish never happened, this was never a CDN caching
issue.

Fixed by regenerating a domain-scoped token
(`npx surge tokens add --domain odd-field-guide.surge.sh -m "<note>"`) and
setting it via `gh secret set SURGE_TOKEN` (same one-time-setup command as
above, now pointed at a fresh token). Hardened the `deploy` job itself
(`.github/workflows/ci.yml`) so this specific failure mode — a green job
that published nothing — can't happen silently again:

1. **A public build fingerprint.** Every deploy writes `dist/build-info.json`
   — `{"sha": "<$GITHUB_SHA>", "builtAt": "<ISO timestamp>"}` — generated
   fresh from the commit CI is actually building, not maintained by hand.
   No secrets in it; it's meant to be publicly fetchable.
2. **Refuse to run surge with an empty token.** The exact condition that
   caused the incident is checked before the publish command ever runs, so
   it fails immediately and loudly instead of reaching the interactive
   prompt at all.
3. **Check surge's own output, not just its exit code.** The publish
   command's stdout is grepped for its real completion line
   (`Success! - Published to odd-field-guide.surge.sh`) — an exit code alone
   was exactly what missed the incident the first time.
4. **Verify production against the fingerprint.** After publishing, the job
   fetches `https://odd-field-guide.surge.sh/build-info.json` and compares
   its `sha` to `$GITHUB_SHA`, retrying a few times a few seconds apart to
   absorb any real propagation delay. If production still doesn't match
   after retries, the job fails — a deploy is not "done" until production
   provably reflects the commit that was just built, not because the
   publish command returned `0`.

To check what's actually live at any time, from any machine, with no
GitHub/Surge access required:

```bash
curl -fsS https://odd-field-guide.surge.sh/build-info.json
git log --format=%H -1 <that sha>   # confirm it's a real, expected commit
```

## CloudCannon's role

CloudCannon commits content edits (`src/content/**/*.json`) directly to this
repo through its own git integration. Those commits flow through the same CI
pipeline as a code change — a content edit that somehow produces invalid data
(rare, since the Zod schema in `src/content.config.ts` validates it at build
time) fails CI the same way a code bug would, rather than silently breaking
the live site.

## Local preview

Playwright's `npm test` expects a server already running at
`http://localhost:4321` — it does not spawn one itself (see
`playwright.config.ts`'s comment on why: this project's `astro
dev`/`astro preview` run as managed background daemons on the maintainer's
machine, not foreground processes a test runner can own the lifecycle of).

```bash
npm run build
npm run preview     # or: npm run preview -- --background, then `astro preview stop` after
npm test
```

In CI, the `functional` job starts `astro preview` in the background
explicitly and polls until it's reachable before running the (non-visual)
test subset — see the workflow file.

## Caching

Surge applies the same policy to every asset — HTML and fingerprinted
`/_astro/*` files alike — `Cache-Control: public, max-age=0, must-revalidate`
with an ETag. There's no per-file-type override available on Surge (verified
against its own docs: "no cache configuration on Surge at all"). In practice
this means every request does a cheap conditional revalidation (a 304 if
unchanged) rather than a fingerprinted asset being cached for a year — a
small, constant cost, not a growing one. For a CMS-driven site this is
arguably the _safer_ default (a CloudCannon publish can never be masked by a
stale long-lived cache) — if it becomes a real bottleneck, the fix is
fronting Surge with a CDN that supports per-path headers (Cloudflare, etc.),
not something fixable from this repo alone.

## Growth OS's `/api/*` boundary

This site's two forms (`work-with-odd`'s business enquiry, the newsletter
signup) POST to `/api/business-enquiry` and `/api/newsletter`. As of the
2026-08-28 repo split, those routes are served by an independent Cloudflare
Worker in the sibling `../odd-growth-os` repo — not by anything in this
repo, and not by this repo's own Surge deploy. This repo has no Cloudflare
config of its own; production here is, and stays, a plain static Astro
build on Surge. See `AGENTS.md`'s "Growth OS integration" section for the
API contract, and `../odd-growth-os/ops/DECISIONS.md` D1/D13 for the full
history of how that Worker came to exist and its own deploy status.
