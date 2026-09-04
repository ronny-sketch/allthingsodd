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
   program cards, feature cards, timeline milestones) produce sensible blank
   templates — the one thing genuinely easier to verify live than from a
   schema alone.

[cc-skill]: https://github.com/CloudCannon/agent-skills/blob/main/skills/cloudcannon-configuration/SKILL.md

## What you can edit

**Pages** (Home, ODDfest, ODDference, ODDagency, ODDspace, Work with ODD,
Membership, About, Media, Contact) — ten fixed pages, can't be added to or deleted
(their filenames are wired to real URLs). Within each page, every section
below is a real editable field — headlines, intro paragraphs, eyebrow labels,
and every repeatable list (features, cases, speakers, programme items, FAQ,
tickets, …) has an "Add new" button in CloudCannon's array editor. A few
high-level notes:

- SEO title/description/social image — what shows in a browser tab, a Google
  result, and the preview card when the page is shared on social media, on
  every page.
- **Home**: hero proposition + two buttons, "What ODD is", the two-ways-in
  business/creative section (audience explanation only, as of 2026-08-30 —
  see below), the platform grid (not fixed at four cards), the "Already in
  motion" proof module (its editorial intro plus the four cumulative
  figures — see below), a case/story teaser (optional), and the participate
  band (2-5 CTAs, each can carry an "audience" tag — see below).
  - 2026-09-04: the homepage's "What's happening" activity list was removed
    outright, along with its editing fields. It is not hidden and there is
    nothing to re-enable — a running list of current activity only stays
    true if someone maintains it weekly, and nobody owned that. ODDspace's
    own calendar on `/oddspace` is unaffected and is still the place where
    live activity is published.
  - 2026-09-04: "Already in motion" now carries ODD's **cumulative** totals
    across its whole first two years (5,000+ participants, 500+
    collaborators, 100+ partners, €400K+ into the creative and cultural
    industries), not ODDfest 2025's figures alone. If you change a number
    here, change the intro paragraph above it too — they state the same
    facts twice, deliberately, and one of them going stale is the failure
    mode. Two supporting fields: `srValue` on a shortened number is what a
    screen reader says instead of the abbreviation ("More than €400,000"),
    and `reportNote` under the report link is what keeps that link's scope
    honest ("the 2025 report covers ODDfest 2025 alone").
  - 2026-08-30 homepage revision: the separate "For organisations / Work
    with ODD." teaser section (and its `workWithOdd` field) was removed —
    the platform grid immediately above it already includes a Work with ODD
    card, so the section only duplicated it. The real Work with ODD page is
    unaffected. The business/creative section's small per-track destination
    buttons (ODDference/Work with ODD/ODDfest/ODDspace links) were removed
    for the same reason — those destinations now live only in the platform
    grid. Each participate-band item can carry an "audience" value
    (Business/Creative/Stay in touch, or leave blank) to group it under a
    label instead of one flat row — set it to match how a new CTA should
    group, or leave it empty for an ungrouped card.
- **ODDfest**: what it is, how it works, who can take part, what ODD
  provides, organiser ownership, programme, open call (optional), for
  partners, previous edition/proof (optional), FAQ.
- **ODDference**: the big question, who it's for, why attend, themes,
  formats, speakers (optional — leave empty until real speakers are
  confirmed), programme (optional), connection & networking, proof (optional,
  can carry an attendee quote), tickets (optional — no invented prices), FAQ.
- **ODDagency**: what it is, capabilities (+ types of project, shown in the
  same section), how a project works, cases (optional — hidden until real
  cases exist). 2026-08-31: removed the separate `features`/`whyOdd` fields
  (the first repeated "what it is," the second had drifted into internal
  language that had no place staying public) — don't re-add them without
  checking that reasoning first.
- **ODDspace**: why it exists, who it's for, proof numbers, membership
  benefits, the single membership tier (no invented pricing), event-space
  rental rates, how it works, location, an optional live events-calendar
  embed, FAQ.
- **Work with ODD** (public label "Work with us" — moved into the "Info" nav
  dropdown 2026-08-30, route unchanged): hero (eyebrow/title/intro/primary
  button/photo), "what we do" intro, why ODD (3 reasons), the four pathways
  — ODDference/ODDnetwork/Event partnership/ODDagency (`pathways`, each with
  a number/stage/title/body/CTA — shown as a compact progression list, not a
  funnel: any card can be the starting point), cases (optional — hidden
  until real cases exist), a page-specific curated logo list ("Organisations
  we've worked with" — `logos`, deliberately separate from the sitewide
  Partner logos, also hidden until curated), the contact intro above the
  embedded enquiry form.
- **Membership** (public label "ODDnetwork"): what it is, who it's for, what
  participation may involve (`includes`), tiers (optional and empty by
  default — the whole section hides itself until pricing exists), the
  closing CTA. 2026-08-31: removed the separate `whyJoin`/`rhythm` fields,
  which repeated the same "ongoing relationship" idea `includes` already
  covers, and the generic team-photo PhotoBreak (it wasn't real ODDnetwork
  proof) — don't re-add them without checking that reasoning first.
- **About**: an opening headline + intro + the deeper "why ODD exists" case
  (as separate paragraphs), Story/timeline (with the New Nordic Way rf legal
  note underneath it), "How we make it happen" (the Events/Spaces/
  Relationships & projects pillars, plus a short ways-of-working principles
  list), two impact snapshots — 2025 and 2026 (leave a year's numbers out
  and use its placeholder note instead until they're verified — same
  "no invented numbers" rule as everywhere else), the participate band, and
  a closing photo (leave unset until a real, confirmed photo exists — the
  page shows a plain placeholder panel instead of guessing).
- **Media**: a full press kit — accreditation callout, key facts, ODDfest
  highlights (optional — a stats grid, same "leave it out rather than invent
  numbers" rule as everywhere else), the shared "Featured in" press logo
  strip (edited under Global — same list shown on the homepage), boilerplate,
  press releases, info packs, assets & photos (with a photo-credit usage
  note), a named press contact, and social media.
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
Media from the same list, by design — see docs/architecture.md). Also here,
as of 2026-08-30: **Supported by** (a short list of confirmed foundation/
supporter logos, shown as a small quiet row in the footer — leave empty
until a logo is genuinely confirmed as a funder/supporter, not just a
partner; the footer shows nothing while this is empty) and **the grouped
logo wall** (Partners/Media/Supported by/Collaborators — a prepared but
hidden future homepage section; toggle its "visible" field on only once
every logo in every group has been confirmed for that specific category).
Navigation links can be grouped: give a link "children" (see the real example
already set up on "Info", which as of 2026-08-30 renders as a pill-styled
dropdown on the right side of the header, not inline with the other nav
links — see Nav.astro) and it becomes a hover dropdown on desktop, and
flattens into plain, direct links in both the footer and the mobile menu
(as of 2026-08-30, the mobile menu no longer shows a grouped "Info" heading —
About/Media/Contact are direct tappable items, same as every other nav link).

Newsletter sign-up itself lives in exactly two places as of 2026-08-30: the
footer (persistent, on every page) and a timed popup that appears ~15
seconds after a visitor first arrives, once per browser session — it is no
longer in the header or the mobile menu. Both reuse the same sign-up
mechanism, so there's nothing extra to configure beyond the newsletter
sign-up link above.

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
- **Which pages exist, or their URLs.** Ten pages, fixed filenames
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
