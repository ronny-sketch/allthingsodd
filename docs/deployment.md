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

`main` is the deploy branch. All three jobs — `checks`, `visual`, `deploy` —
run on every push; `deploy` only runs after both others pass, only on `main`,
only on an actual push (not a PR). **This is what makes a CloudCannon content
edit actually go live without anyone running a manual command** — the commit
CloudCannon makes is a normal push to `main`, same as a code change.

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
date happened via the manual fallback command instead. Checked via the
public GitHub Actions API (`gh` wasn't authenticated in the session that
found this — the read-only `.../actions/runs` and `.../check-runs`
endpoints work without auth on a public repo, but raw log download needs
repo-admin rights, which blocked getting the literal npm error text).

Root cause traced to `actions/checkout`/`actions/setup-node`/
`actions/upload-artifact` being pinned at `@v4` — GitHub had deprecated the
Node 20 runtime those action versions target and started force-running them
on Node 24 instead (visible as a warning annotation on every run: "Node.js
20 is deprecated... forced to run on Node.js 24"), right before the first
real step (`npm ci`) that then failed. The lockfile and dependencies
themselves check out fine — verified locally with a genuinely fresh
`npm_config_cache` pointed at an empty directory, not just a reused cache —
so this wasn't a project-code problem. Fixed by bumping all three actions to
`@v7`.

**Not yet re-verified against a real push** (this fix needs the next commit
after it to actually confirm `checks`/`visual` go green). If they do, the
`deploy` job still depends on the `SURGE_TOKEN` secret actually being set —
see the "safe failure mode" note above — which has never been exercised
either, since `deploy` has never previously gotten far enough to run at all.

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

In CI, the `visual` job starts `astro preview` in the background explicitly
and polls until it's reachable before running tests — see the workflow file.

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
