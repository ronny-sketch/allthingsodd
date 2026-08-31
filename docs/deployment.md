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
