# Editing the site (no code)

This is what changes on the live site without anyone touching this repo's
code — everything here is a JSON field in `src/content/`, exposed as a real
CloudCannon input per `cloudcannon.config.yml`.

## First-time setup

1. Connect this GitHub repo to a new CloudCannon site.
2. CloudCannon auto-detects the Astro build (`npm run build` → `dist/`) — spot
   check this in the Site dashboard's build settings; adjust if it guessed
   wrong.
3. `cloudcannon.config.yml` at the repo root defines the editing experience
   below. It's checked against CloudCannon's own real JSON schema — run
   `npx @cloudcannon/cli validate` after any change to it (see
   `.cloudcannon/migration/`, gitignored, re-download with the two `curl`
   commands in [CloudCannon's `cloudcannon-configuration` skill][cc-skill] if
   missing). Still worth **walking through the actual Collections view once
   after connecting** to confirm the array "add new" buttons (news photos,
   program cards, feature cards, about panels) produce sensible blank
   templates — the one thing genuinely easier to verify live than from a
   schema alone.

[cc-skill]: https://github.com/CloudCannon/agent-skills/blob/main/skills/cloudcannon-configuration/SKILL.md

## What you can edit

**Pages** (home, ODDfest, ODDference, ODDagency, About) — five fixed pages,
can't be added to or deleted (their filenames are wired to real URLs). Within
each page:

- Headlines, intro paragraphs, eyebrow labels, meta lines — plain text fields.
- SEO title/description/social image — what shows in a browser tab, a Google
  result, and the preview card when the page is shared on social media.
- **Home page**: the "What's happening" photo filmstrip (reorder, edit
  captions, swap photos), the "What's on" date list, the four program cards,
  the two "Ways to participate" CTAs.
- **ODDfest/ODDference/ODDagency**: the three-item feature grid, the two
  participate CTAs, the hero video/image and its caption.
- **About**: the five horizontal-scroll panels, in order — each is either a
  photo+text panel, the "four ways in" program list, or a plain text panel.

**Global** (one entry, applies everywhere): top navigation links, footer
links, social media links, contact emails, footer address, the "Pre-register"
button's destination.

## What you can't edit here (and why)

- **Layout, spacing, colors, fonts, animation.** These come from the design
  system (`src/styles/`) and the components that read this content — not from
  CloudCannon fields. See `docs/design-system.md` for why: this keeps every
  page visually coherent and keeps a content edit from ever being able to
  break the layout.
- **Which pages exist, or their URLs.** Five pages, fixed filenames
  (`disable_add`/`disable_file_actions` in `cloudcannon.config.yml`).
- **New button/card shapes, custom CSS.** The button and card vocabulary
  (`Pill` variants, program card, feature card, CTA) is fixed by design; a
  genuinely new shape is a code change, not a content edit.

If something feels like it should be editable and isn't, that's worth raising
— it likely means either a field is missing from `cloudcannon.config.yml`
(a quick fix) or it's implementation detail nobody should need to touch
(worth confirming which, rather than assuming).

## Publishing

A save in CloudCannon is a git commit to this repo. What happens after that
commit (automatic rebuild + deploy, or a manual step) depends on the CI/deploy
hook set up for this repo — see [deployment.md](deployment.md).
