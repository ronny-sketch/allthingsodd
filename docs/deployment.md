# Deployment

## Current state (as of this migration)

This repo is **not yet deployed anywhere**. The live domain
(odd-field-guide.surge.sh) is still served by the old single-file site at
`../ODD NEW WEBPAGE/` via its own `npx surge .` command — untouched by this
project. Cutting the live domain over to this Astro build is a deliberate,
explicit-sign-off step (it's a production/DNS change), not something to do as
part of routine development here.

## Recommended production workflow

```
commit to main (code, or CloudCannon content commit)
  → GitHub Actions CI (.github/workflows/ci.yml): check, lint, build, test
  → on green: deploy job (host-specific, not yet wired up — see below)
```

`main` is the deploy branch. CI (`checks` + `visual` jobs) gates every push
and PR — see `.github/workflows/ci.yml`. A deploy step needs to be added once
a hosting target is chosen (Cloudflare Pages, Netlify, Vercel, or `surge`
again with a static `dist/` upload — any static host works, since this is
still a fully static Astro build with zero server runtime, same shape as the
original site).

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
