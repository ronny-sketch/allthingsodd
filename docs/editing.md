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

**Pages** (Home, ODDfest, ODDference, ODDagency, Work with ODD, Membership,
About, Media, Contact) — nine fixed pages, can't be added to or deleted
(their filenames are wired to real URLs). Within each page, every section
below is a real editable field — headlines, intro paragraphs, eyebrow labels,
and every repeatable list (features, cases, speakers, programme items, FAQ,
tickets, …) has an "Add new" button in CloudCannon's array editor. A few
high-level notes:

- SEO title/description/social image — what shows in a browser tab, a Google
  result, and the preview card when the page is shared on social media, on
  every page.
- **Home**: hero proposition + two buttons, "What ODD is", the two-ways-in
  business/creative section, "What's happening" (a flat, editable activity
  list — mix ODDfest/ODDference/ODDspace items freely), the platform grid
  (not fixed at four cards), proof numbers (optional — omit the field rather
  than invent numbers), the Work with ODD teaser, a case/story teaser
  (optional), and the participate band (2-5 CTAs).
- **ODDfest**: what it is, how it works, who can take part, what ODD
  provides, organiser ownership, programme, open call (optional), for
  partners, previous edition/proof (optional), FAQ.
- **ODDference**: the big question, who it's for, why attend, themes,
  formats, speakers (optional — leave empty until real speakers are
  confirmed), programme (optional), connection & networking, proof (optional,
  can carry an attendee quote), tickets (optional — no invented prices), FAQ.
- **ODDagency**: what it is, capabilities, why ODD, how a project works,
  cases, types of project.
- **Work with ODD**: why ODD, the four pathways (ODDference/Membership/
  Agency/Partnerships), cases, how we work, the partner network note, the
  contact intro above the embedded inquiry form.
- **Membership**: what it is, who it's for, why join, what's included, the
  year-round rhythm, tiers (optional and empty by default — the whole section
  hides itself until pricing exists), the network note, the closing CTA.
- **About**: the four horizontal-scroll panels that open the page, then
  Story/timeline, Proof (optional), People & organisation, the partner
  network note, "The bigger picture" (optional), and the participate band.
- **Media**: eyebrow/title/intro text above the shared "Featured in" press
  logo strip (edited under Global, see below — it's the same list shown on
  the homepage).
- **Contact**: eyebrow/title/intro text above the contact form. See
  [Contact form setup](#contact-form-setup) below for the one field that
  actually makes it send.

A field marked "optional" in `cloudcannon.config.yml`'s comments can be left
out of the page's JSON entirely — the page renders correctly without it. This
is deliberate: several V2 sections (proof numbers, a case teaser, speakers,
membership tiers) should stay absent rather than be filled with invented
numbers, names or prices until real content exists.

**Global** (one entry, applies everywhere): top navigation links, footer
links, social media links, contact emails, footer address, the newsletter
sign-up link, the "Pre-register" button's destination, and the **Partners**
and **Featured in** press logo lists — each is one shared list, so an edit
here updates every page that shows it (Featured in appears on both Home and
Media from the same list, by design — see docs/architecture.md).

## Contact form setup

The Contact page's form submits via [Web3Forms](https://web3forms.com) — a
free service that emails you a submission, no backend of ours required.

1. Get a free access key at web3forms.com (just an email address, no signup).
2. Paste it into the Contact page's "Web3Forms access key" field.
3. Publish. The form starts sending for real; until then it renders normally
   but tells visitors it isn't connected yet, rather than silently discarding
   what they type.

## What you can't edit here (and why)

- **Layout, spacing, colors, fonts, animation.** These come from the design
  system (`src/styles/`) and the components that read this content — not from
  CloudCannon fields. See `docs/design-system.md` for why: this keeps every
  page visually coherent and keeps a content edit from ever being able to
  break the layout.
- **Which pages exist, or their URLs.** Nine pages, fixed filenames
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
