# ODD Field Guide

The production site for ODD (ODDfest / ODDference / ODDspace / ODDagency) —
Astro + structured content, edited through CloudCannon.

> **This is live** at **https://allthingsodd.co** (domain cutover 2026-09-03;
> before that, odd-field-guide.surge.sh, which is still published with the
> identical build so no existing link breaks). The old single-file build at
> `../ODD NEW WEBPAGE/` is no longer deployed — see
> [docs/deployment.md](docs/deployment.md) for how a change reaches
> production now, and
> [docs/deployment.md#domain-migration](docs/deployment.md#domain-migration)
> for what the domain change did and did not touch.

## Install and run

```bash
npm install
npm run dev       # dev server at http://localhost:4321
```

This project's `astro dev`/`astro preview` are managed as background daemons
on the maintainer's machine (`astro dev --background`, then `astro dev stop` /
`astro dev status` / `astro dev logs`) — see `CLAUDE.md`. On a normal machine,
`npm run dev` in the foreground works exactly as any Astro project does.

## Scripts

| Command                           | What it does                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Local dev server with HMR                                                                                                    |
| `npm run build`                   | Production build to `dist/`                                                                                                  |
| `npm run preview`                 | Serve the built `dist/` locally                                                                                              |
| `npm run check`                   | Astro + TypeScript diagnostics                                                                                               |
| `npm run lint`                    | ESLint                                                                                                                       |
| `npm run format` / `format:check` | Prettier (write / check)                                                                                                     |
| `npm test`                        | Full Playwright suite — visual regression + functional/cross-browser (needs `npm run preview` running first)                 |
| `npm run test:update-snapshots`   | Regenerate visual-regression baselines after an intentional design change                                                    |
| `npm run cc:validate`             | Validate `cloudcannon.config.yml` — CI gate                                                                                  |
| `npm run quality`                 | `check` + `lint` + `format:check` + `cc:validate` + `build` in sequence — the same static/build gates CI's `checks` job runs |

**Corrected 2026-09-01:** this repo has no `worker/` of its own — Growth OS's
Cloudflare Worker (and its own `worker:check`/`worker:test`/`worker:dev`
scripts) lives in the separate `../odd-growth-os` repo as of the 2026-08-28
split; a prior version of this table listed those scripts here, which was
stale even before this correction (they'd never resolved in this repo's
`package.json`). See `AGENTS.md`'s "Growth OS integration" section for the
`/api/*` boundary.

## Documentation

- [docs/architecture.md](docs/architecture.md) — how the system fits together
- [docs/design-system.md](docs/design-system.md) — tokens, components, motion rules
- [docs/editing.md](docs/editing.md) — editing the site in CloudCannon (no code)
- [docs/deployment.md](docs/deployment.md) — how a change reaches production
- [CLAUDE.md](CLAUDE.md) — full project constitution for AI coding agents (also
  read by humans; it's the most complete single doc in this repo)
