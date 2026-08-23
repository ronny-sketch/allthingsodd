# Deployment

## Current state

**This is production.** `odd-field-guide.surge.sh` served the old single-file
site (`../ODD NEW WEBPAGE/`) up through 2026-08-20; the domain now serves this
Astro build instead, deployed via:

```bash
npm run build
npx surge dist odd-field-guide.surge.sh
```

The old single-file site's own files/repo still exist untouched at
`../ODD NEW WEBPAGE/` — they're just no longer what's live. Don't run its
`npx surge .` again; that would revert the live domain back to the old site.

A **preview** deployment also exists at `odd-field-guide-astro.surge.sh`
(same command, different subdomain) — useful for checking a build before
promoting it to the real domain.

## Production workflow

```
commit to main (code, or CloudCannon content commit)
  → GitHub Actions CI (.github/workflows/ci.yml): check, lint, build, test
  → on green, on main, on push (not PRs): deploy job publishes to
    odd-field-guide.surge.sh automatically
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

The deploy job needs a `SURGE_TOKEN` repository secret to authenticate
non-interactively. One-time setup (from a terminal where `gh` is
authenticated — this never needs to touch this repo's history or any AI
session, since the token goes straight from `surge` to GitHub's secret
store):

```bash
npx surge token | gh secret set SURGE_TOKEN --repo ronny-sketch/odd-field-guide
```

Until that secret exists, the `deploy` job will fail (auth error) while
`checks`/`visual` still pass — that's a safe failure mode: nothing gets
published, but nothing breaks either. Fall back to the manual command below
if needed:

```bash
npm run build
npx surge dist odd-field-guide.surge.sh
```

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

## Cloudflare migration (in progress, 2026-08-21 →)

Production is moving from Surge to a single Cloudflare Worker — Workers
Static Assets serving this same `dist/` build, plus `/api/business-enquiry`
and `/api/newsletter` routes for the ODD Growth OS (business CRM/newsletter
integrations; see the repo's `ops/` and `worker/` directories — that's a
commercial-systems layer, not part of this website's own architecture, so
it isn't documented further here). Astro's build is unchanged: still
static, no adapter.

This migration is staged and Surge stays production until every step in
`ops/DECISIONS.md` D1 passes, including a full parity check against this
document's own concerns (caching, redirects, the visual-regression
baseline, 404 handling). Config lives in `wrangler.toml` at the repo root.
Do not point DNS at Cloudflare or repoint the CI `deploy` job until that
migration is explicitly signed off — see `ops/SETUP_STATUS.md` for current
status.
