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
- **Home**: hero proposition + two buttons, "Why ODD" (headline, body, and
  up to four short labels for the grid around its photo), the two-ways-in
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
    live activity is published — as a hand-kept list since 2026-09-11,
    not the calendar embed this line originally referred to.
  - 2026-09-04: "Already in motion" now carries ODD's **cumulative** totals
    across its whole first two years (5,000+ participants, 500+
    collaborators, 100+ partners, €400K+ into the creative and cultural
    industries), not ODDfest 2025's figures alone. If you change a number
    here, change the intro paragraph above it too — they state the same
    facts twice, deliberately, and one of them going stale is the failure
    mode. `srValue` on a shortened number is what a screen reader says
    instead of the abbreviation ("More than €400,000").
  - 2026-09-14: both of "Already in motion"'s links are buttons now. The one
    under the figures (`proof.cta`, with `proof.ctaLead` as the line above
    it) goes to the ODDfest 2026 thank-you page instead of the 2025 Impact
    Report, so the old `reportNote` scope caveat is gone with it. About
    links both the report and the thank-you page under the same figures.
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
- **ODDfest**: hero (headline — "Hero video/image" → sub — meta and two
  buttons, over the aftermovie; since 2026-09-14 the eyebrow is not shown in
  the hero and there is no support line, the same as ODDference),
  what it is, the two look-back buttons under it, how it works (who does
  what, then the four numbered steps), how to join, programme (optional —
  empty until a real 2027 programme exists), highlights (`examples` — real, named Creative Week and ODDfest 2026
  events, each card with an optional photo and `external` for
  a partner's own page), "On the programme" (`programmeHighlights` — grouped
  lines of names that actually took part), the "Want your event in the next
  one?" band (`hostCta`), the partner route, FAQ. The last three were added
  2026-09-14.
  Rebuilt 2026-09-11; the bullet here previously listed a set of fields
  (who can take part / what ODD provides / organiser ownership / open call /
  for partners / previous edition) that had already been consolidated away
  in the V2 rebuild and no longer existed. The "what has happened before"
  section was removed on 2026-09-14. One rule on this page in particular:
  the deleted "shared platform" block must not come back until there is a
  platform to describe.
- **ODDference** (restructured 2026-09-11, cut down 2026-09-17 — seven
  sections, in this order): the hero, the premise, the heading + three
  reasons to come, past speakers, session highlights, tickets & partnership,
  FAQ. "Who it's for" was deleted on 2026-09-17; the audience list lives on
  in the FAQ answer.
  - _Past speakers_ is ten people, laid out 5 × 2 on desktop and 2 × 5 on
    phones — keep it at ten. _Session highlights_ is five.
  - _Past speakers_ and _session highlights_ are both records of ODDference
    **2026**, not promises about 2027. Don't add a name or a session title
    that wasn't really there, and don't rewrite a session title into
    marketing copy — they're quoted from the event's own run sheet.
  - _Tickets_ now lists the whole ladder, not just the tier on sale. Price,
    status, benefits and button come from the ticket backend at page load;
    what's in the content is the fallback if that request fails. That
    includes `priceNote` ("+ VAT 13.5%" — prices are ex-VAT). Two fields
    are yours: `badgeLabel` (the badge on the tier currently on sale — now
    "Available until 1 Nov 2026") and `locked: true` (dims a tier and
    removes its button while leaving its price readable).
  - _FAQ_: a lot about 2027 genuinely isn't decided — dates, venues, the
    programme, exactly what a ticket covers beyond ODDference itself. Say
    that in the answer rather than filling it in.
  - "What changes in 2027" was removed in the same pass. Its one real fact
    (ODDference runs alongside ODDfest week) is now in the FAQ.
- **ODDagency**: what it is, capabilities (+ types of project, shown in the
  same section), how a project works, cases (optional — hidden until real
  cases exist). 2026-08-31: removed the separate `features`/`whyOdd` fields
  (the first repeated "what it is," the second had drifted into internal
  language that had no place staying public) — don't re-add them without
  checking that reasoning first.
- **ODDspace**: what it is, the four spaces (each with its own button),
  the single membership tier (no invented pricing), the "studio is not
  included" callout, event-space rental rates, how joining works, location,
  the bigger picture, the "what's happening" events list, the "Life at
  ODDspace" photo wall, FAQ.
  - 2026-09-14: all photography replaced with people-and-activity shots from
    the ODDspace Drive folder (ODDstudio's photo kept), and the photo wall
    (`gallery`) added under the events list. Add, remove or reorder wall
    photos freely, portrait or landscape — it arranges them by shape and
    can't be left with gaps. Give every photo alt text that describes what
    is in it, without naming people.
  - 2026-09-11: cut from eleven sections to seven at Ronny's request.
    "Co-creative, not just coworking", "Who it's for", "The network is
    bigger than the room" and the (empty) proof numbers were removed along
    with their editing fields — the first three restated what "what is
    ODDspace" and "why ODDspace" already say, and the fourth had been
    rendering nothing since 2026-09-02. The Google Calendar embed was
    replaced by `events`, a hand-kept list: **nothing syncs it from the
    booking calendar**, so when a date moves or an event is cancelled it
    has to be changed here, and only things a stranger can actually turn
    up to or book belong on it.
- **ODDspace membership** (`/oddspace/membership`, new 2026-09-11) and
  **ODDspace as a venue** (`/oddspace/venue`, same date): the two pages that
  let somebody decide, or plan an event, without having to write to us
  first. Both live in `src/content/pages/oddspace-membership.json` and
  `oddspace-venue.json`. **Neither is wired into CloudCannon yet** — the CMS
  side was deliberately deferred in the September review, so these two are
  edited in the repo for now, unlike every other page above.
  - The membership page's "what's not included" list is the reason it
    exists. Do not quietly trim it to make the page read better: the studio
    carve-out and the absence of a private desk are what a member would
    otherwise find out after paying.
  - The venue page publishes only what the site already stands behind —
    the two member rates — and names capacities, dimensions, AV,
    accessibility, load-in, catering and non-member pricing as things we
    answer per enquiry (`askUs`). **Do not fill those in from the internal
    rental guide.** Its capacities are marked "TBD — confirm before
    publishing externally" and its prices contradict two other internal
    lists. When a number is genuinely confirmed, move it into the page and
    take it out of `askUs`.
- **Work with ODD** (moved into the "Info" nav dropdown 2026-08-30, route
  unchanged; it was publicly labelled "Work with us" there until 2026-09-11,
  and now leads that dropdown under its real name): hero (eyebrow/title/intro/primary
  button/photo), "what we do" intro, why ODD (3 reasons), the four pathways
  — ODDference/ODDnetwork/Event partnership/ODDagency (`pathways`, each with
  a number/stage/title/body/CTA — shown as a compact progression list, not a
  funnel: any card can be the starting point), "What we've built with our
  partners" (`casesIntro` heading + `cases`; since 2026-09-14 a case here can
  carry a photo, its own link label and `external` for an off-site link —
  hidden while empty), a page-specific curated logo list ("Organisations
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
  list), the 2025–2026 figures with their two buttons, the photo wall, and
  the participate band.
  - 2026-09-14: "What we have learned" was removed. The figures are now the
    homepage's cumulative four (`impact.items` — change a number in both
    places, never add an unverified one), with the 2025 Impact Report and
    the ODDfest 2026 thank-you page as `impact.ctas`; the old 2025-only
    snapshot and the empty 2026 one are gone. The ODDfest 2026 launch group
    photo (`launchPhoto`) now follows the opening argument, and a photo wall
    (`gallery` — ODDfest 2025 and 2026 from Flickr, host events, ODDspace)
    sits under the figures. Same wall rules as ODDspace's: any number of
    photos, any orientation, real alt text, no names.
  - 2026-09-11: the "Why now" section and its editing field were removed
    outright. Its headline read as strategy-deck writing rather than
    something that helps an outsider understand ODD; its one real fact is
    now inside the opening argument, which is three paragraphs instead of
    five.
  - 2026-09-14: "What we have learned" and its editing field were removed
    outright.
- **Media**: a full press kit — accreditation callout, key facts, ODDfest
  highlights (optional — a stats grid, same "leave it out rather than invent
  numbers" rule as everywhere else), the shared "Featured in" press logo
  strip (edited under Global — same list shown on the homepage), boilerplate,
  press releases, info packs, assets & photos (with a photo-credit usage
  note), a named press contact, and social media.
- **Contact**: eyebrow/title/intro text above the contact form. The access
  keys that actually make it send live under Global — see
  [Contact form setup](#contact-form-setup) below for those and for where
  each topic's message goes.

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

The form asks the visitor what their message is about, and each topic goes to
a different address. A Web3Forms access key is tied to exactly one recipient,
so there is one key per topic:

| Topic on the form         | Key field    | Sends to              |
| ------------------------- | ------------ | --------------------- |
| Something else / not sure | `general`    | `hello@oddfest.co`    |
| Partnerships & ODDference | `partnering` | `partners@oddfest.co` |
| ODDspace                  | `oddspace`   | `space@oddfest.co`    |
| ODDfest                   | `oddfest`    | `fest@oddfest.co`     |

The three `partners@`/`space@`/`fest@` addresses are **Google Groups**, not
mailboxes. Who receives each topic is the group's membership, changed in
Google Workspace admin — not here, and not in the code. That is the whole
point of the setup: teams change more often than this site deploys, and
deploying needs a manual step (see `docs/deployment.md`), so a list of
people's addresses living in the repo would quietly go stale and keep mailing
someone who left. Each group also contains `hello@oddfest.co`, so the shared
inbox sees every message without being addressed separately.

`hello@allthingsodd.co` is a Workspace **domain alias** of `hello@oddfest.co`
— the same mailbox, so adding it as a second recipient would only deliver two
copies of everything to one inbox.

The **Work with ODD** enquiry form uses the same `partnering` key: it writes
the enquiry to Attio as it always has, and now also emails
`partners@oddfest.co` so somebody is actually told it arrived. That is why the
keys live under **Global → Form routing**, not on the Contact page — two
different forms send to the same place, and pasting the key twice would let
them drift into mailing different people about the same partnership.

To connect it:

1. In Google Workspace admin, create the three groups above and add the right
   people plus `hello@oddfest.co` to each.
2. At web3forms.com, get a free access key for each of the four addresses
   (just an email address, no signup — the key is mailed to that address, and
   for a group any member receives it).
3. Paste each into its field under **Global → Form routing — Web3Forms access
   keys**.
4. Publish.

A topic left blank falls back to the General key, so the message still reaches
a human rather than the visitor being told the form is broken — you can
connect General first and add the rest later. (The Work with ODD notification
is the one exception: with no `partnering` key it simply doesn't send, and
that form behaves exactly as it did before — the Attio record is still
written.) Until General is set too, the
form renders normally but tells visitors it isn't connected yet, rather than
silently discarding what they type.

## Links with a query string need a trailing slash

If a link carries anything after a `?` — `?topic=`, `?interest=`,
`?intent=` — put a `/` before the `?`:

- **Right:** `/contact/?topic=oddfest_2027_event`
- **Wrong:** `/contact?topic=oddfest_2027_event`

This is not style. Surge answers `/contact` with a redirect to `/contact/`,
and that redirect **throws the query string away**. The wrong form still
loads the page, so it looks fine when you click it — but the form arrives
with nothing preselected, and a contact message can go to the wrong inbox.
Found live on 2026-09-13, when eighteen links across the site had been doing
exactly this. `tests/functional/query-string-links.spec.ts` now fails the
build if one comes back.

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
