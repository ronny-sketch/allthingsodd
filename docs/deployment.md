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

## Recommended production workflow

```
commit to main (code, or CloudCannon content commit)
  → GitHub Actions CI (.github/workflows/ci.yml): check, lint, build, test
  → on green: deploy job (host-specific, not yet wired up — see below)
```

`main` is the deploy branch. CI (`checks` + `visual` jobs) gates every push
and PR — see `.github/workflows/ci.yml`. **Deploys are currently manual**
(`npx surge dist odd-field-guide.surge.sh`, run by whoever's promoting a
build) — CI does not yet auto-deploy on green. Wiring that up (surge again,
or a switch to Cloudflare Pages/Netlify/Vercel — any static host works,
since this is still a fully static build with zero server runtime) is the
next real infrastructure step, not yet done.

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
