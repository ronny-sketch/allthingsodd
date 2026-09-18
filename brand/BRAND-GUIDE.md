# BRAND-GUIDE — how to make something that looks like ODD

An instruction manual, not an essay. It is written for whoever makes the next
thing — a person, or an AI agent with repository access. If you read one file
before working on an ODD surface, read this one.

- **Designed for humans:** the same rules, illustrated, live at `/brand-book/`.
- **Machine-readable values:** `brand/tokens/brand-tokens.json`.
- **The CSS, for anything outside this repo:** `brand/tokens/odd.css` (§3.5).
- **Canonical for the web:** `src/styles/tokens.css` + `src/styles/typography.css`.
  If those and this file disagree, the CSS wins and this file is stale.
  `npm run check:brand` fails the build when the JSON drifts from the CSS.

---

## 1. The idea, in one paragraph

ODD does not make the culture; it builds what is around it — a week around
independent events (ODDfest), a room around an argument (ODDference), a
building around daily work (ODDspace). The visual system does the same thing:
a **precise, quiet frame** (Ink ground, hairline rules, numbered cells,
Gabarito, small tracked labels, five type sizes) **built around something
alive** (archive photographs, Forta statements, the steaming mark, warm heat
where you touch). The frame is institutional on purpose. What it holds is not.

**The working test.** Flat? Add life _inside_ the frame — a real photograph, a
statement, heat. Chaotic? Strengthen the frame — align it, rule it, number it.
Never fix either one by adding decoration.

## 2. The seven principles

1. **Build around, do not decorate.** Every structure holds something real.
2. **Evidence, not illustration.** Real photographs, real names, real counts.
3. **Two lights on one ground.** Ink or Paper; Ember and Signal are light, not paint.
4. **Say it loud, explain it quietly.** Forta states, Gabarito explains.
5. **Round is for what you touch.** Pill for actions and labels, square for content.
6. **Alive, in small doses.** One living thing per view, always with a still version.
7. **Creative first, business invited.**

## 3. Non-negotiables

- **Five type sizes.** `--text-hero`, `--text-display`, `--text-heading`,
  `--text-body`, `--text-small`. Never a `font-size` outside them. Nothing below 14px.
- **Two typefaces.** Forta (display, unicase) and Gabarito (body). Nothing else,
  except the platform monospace for storage keys and code.
- **Two grounds.** Ink `#0E090B` or Paper `#E2DFDE`. Never a coloured background.
- **No new colour without provenance** in the archive study, recorded in `tokens.css`.
- **Square content, pill actions,** `--radius-panel` (10px) for floating panels only.
- **1px hairlines.** No boxes, no shadows on content, no rounded cards.
- **Every animation has a reduced-motion branch,** and animation never makes
  content visible.
- **Photographs are real ODD moments.** No stock, no generated people, no renders.
- **Never invent a number, date, price or name.** The site's content files and the
  ticket backend are the source; say "not announced" instead.
- **British English.** Organisation, centre, colour, programme.
- **Product names are one word:** ODDfest, ODDference, ODDspace, ODDstudio,
  ODDagency. Never "ODD Fest", "Oddfest", "ODDFest". "All Things ODD" is the
  site/publisher name, not a replacement for ODD in a sentence.

---

## 3.5 Working outside this repository

Building something ODD that is not this website — a standalone page, a
prototype, an email, a partner's microsite? Take two files and nothing else:

- **`brand/tokens/odd.css`** — the website's own CSS in one file: every token,
  the five type roles, `.wrap`, `.wrap-wide`, `.flow`, `.section-head`,
  `.eyebrow`, the section rhythm, the base rules, the grain layer, the Pill and
  `.theme-light`. It is generated from `src/styles/` and checked, so it is never
  a second version of the truth.
- **`brand/fonts/*.ttf`** — `@font-face` them as `Forta` and `Gabarito`.

The page skeleton that works:

```html
<body>
  <!-- Ink ground, Gabarito, the desktop scale -->
  <div class="grain" aria-hidden="true"></div>
  <section>
    <!-- owns half the section gap on each side -->
    <div class="wrap flow">
      <!-- the parent owns the space between blocks -->
      <div class="section-head">
        <p class="eyebrow">What ODDfest is</p>
        <h2>One shared week, made by Helsinki's creative communities.</h2>
      </div>
      <p>…</p>
      <a class="pill pill-solid" href="…">Submit an event idea</a>
    </div>
  </section>
</body>
```

**The hero**, which is the one composition the classes do not give you:

- The product lockup at `width: min(100%, 30rem)`, or the mark at
  `height: 1.35rem` if this is ODD itself. Top left, or centred over a
  photograph.
- **One statement**, the page's `<h1>`, at `--text-hero` (`--text-display` if
  the page is a document rather than a front door). Two sentences at most:
  premise in `--color-paper-40`, point in `--color-paper`.
- A meta line under it: Small, `--color-paper-40`, `Product · City · Year`.
- Then the ask, or nothing. No eyebrow above a lockup — the lockup is the label.
- A photograph behind it needs the Ink scrim: `linear-gradient` from
  `rgb(14 9 11 / 78%)` at the text to `rgb(14 9 11 / 10%)` away from it.

**Grid convention** (the breakpoints are in the tokens; this is what to do at
them): three cells across from 820px, two from 640px, one below. An editorial
column is 6–8 of 12; a sticky label 2–3. A cell grid is `gap: 1px` on a
`--color-paper-12` background, so the ground shows through as the rule.

**Cards.** "No boxes" means no border drawn around free-floating content. A
cell in a grid takes hairlines, because those hairlines _are_ the grid. Never a
radius, never a shadow, never a border that outlines one lone card.

**Pills** need a 44px minimum height on touch: the Pill in `odd.css` already
does this under `@media (hover: none)`.

**The living layer.** `.grain` is in `odd.css` and is enough on its own — one
living thing per view is the rule, not one of each. Steam, rails, warping type
and the archive mosaic are website features; do not reimplement them badly
somewhere else, and never add motion that content depends on.

---

## 4. When creating a new All Things ODD page

1. **Content first.** Real copy goes in `src/content/pages/<page>.json` with a
   schema in `src/content.config.ts`; the route in `src/pages/<page>.astro`
   composes components. Never hardcode editorial copy in markup.
2. **Compose, do not invent.** Look in `src/components/sections/` before writing
   a section: `PageIntro`, `SectionIntro`, `FeatureGrid`, `ProgramGrid`,
   `CaseGrid`, `AudienceList`, `PathwayList`, `Timeline`, `PricingGrid`,
   `FAQList`, `PersonGrid`, `ParticipateBand`, `PhotoBreak`, `LogoStrip`.
3. **The page shape that works:**
   `Hero → what it is (SectionIntro) → how it works (numbered cells) → proof
(figures, photographs, names) → the one ask (band or ParticipateBand) →
FAQ → footer`. One primary ask per page.
4. **Every section:** `.section-head` (eyebrow → Forta title → hairline), then a
   `.flow` container. Do not set section padding — `layout.css` owns it.
5. **Type:** one Hero or Display per page, everything else Heading/Body/Small.
   A two-sentence headline uses premise (quiet) + point (figure).
6. **Colour:** ground + figure + one accent at most, and only as text, keyline,
   wash or hover.
7. **Images:** `astro:assets` only (`<Image>`/`getImage`), from `src/assets/`,
   with `widths`/`sizes`. Square corners, 4:3 / 1:1 / 4:5 / 16:9 / 2:1.
8. **Check:** `npm run quality` and `npx playwright test --grep-invert "full page"`.

## 5. When adding a section to an existing page

- Reuse the component that already renders that shape. A "similar but slightly
  different" card is a prop on the existing component, not a new file.
- The parent's `.flow` owns the space above it. The component carries no outer
  margin, no `margin-bottom`, and never a negative margin.
- If the section needs a sixth type size, it needs different spacing or a
  different layout instead.
- New editable fields go into `cloudcannon.config.yml` in the same commit.

## 6. When adding a campaign

A campaign is the same system pushed harder, not a new look.

- Pick **one statement** and set it in Hero. Cut words until it fits three lines.
- Pick **one photograph** from the archive, or a grid of them with hairline gaps.
- Use the product's own accent — Ember for ODDfest, Signal for ODDference — as a
  label or a wash, never as a fill.
- Recurring campaign devices: the full-bleed photograph with an Ink scrim; the
  mosaic; the numbered cell grid; the vertical rail; the figure row.
- Deadlines, prices and dates come from the content files or the ticket
  catalog. If something is undecided, say so in the copy.
- Do not introduce a campaign logo, a campaign colour or a campaign typeface.

## 6.5 When the thing is not announced yet

Most new ODD surfaces are for something with no date, no venue, no price and
no channel. The rules do not bend for that; these two answer it:

- **The ask.** If there is no form and no route yet, the ask is
  `hello@oddfest.co` with a label that says what happens: _Ask us about
  ODDcity_, _Tell us what you would bring_. Never a button that goes nowhere,
  never "Coming soon", never a fake sign-up.
- **The photograph.** If the thing has not happened, there is no photograph of
  it. Use a real ODD archive photograph of something adjacent, credited
  honestly — or leave the cells empty with their hairlines showing and say in
  the caption that they are empty because it has not happened yet. Never stock,
  never a render, never a grey placeholder box.
- Say what is undecided, in the copy, in the ODD voice: "Nothing here is
  announced. There is no date, no venue and no programme, because none of them
  have been decided."

## 7. When building a new sub-brand

1. Name it `ODD` + one lowercase word (under eight letters) that says what it is.
2. Add it to `LOCKUPS` in `brand/logos/build.py`, run
   `python3 brand/logos/build.py` and `node brand/logos/rasterize.mjs`.
   The lockup now exists in both colours, correct by construction.
3. Choose the ground: **Ink** by default; **Paper** (`theme="light"` on `Layout`)
   only if the thing is daylight and physical, like ODDspace.
4. Choose **at most one** accent from the existing palette, or none.
5. Give it rail words: product · city · year (`SubpageFrame`).
6. Find its photographs. None yet? Borrow the archive. Never buy stock.
7. Design nothing else. Everything it needs already exists.

## 8. When creating a deck

- Start from `brand/deck/all-things-odd-template.pptx`, or regenerate:
  `cd brand/deck/src && npm install && npm run build && npm run preview`.
- Install `brand/fonts/*.ttf` first, or PowerPoint substitutes Arial for Forta.
- Slide size 13.333 × 7.5in. Margins 0.625in, 12 columns, 0.25in gutter.
- Type in points: Hero 72 / Display 48 / Heading 30 / Body 18 / Small 14.
- One statement a slide. A slide with two competing headlines is two slides.
- Ink ground by default; Paper for a daylight or data moment; never a third.
- Photographs full-bleed or in hairline cells, never in rounded frames.
- Pills only for real calls to action. Numbers in Forta with Small caps labels.
- Speaker notes carry the argument; the slide carries the statement.
- Deck tooling is isolated in `brand/deck/` and must never be imported by the site.

## 9. When making a poster, a post or a sign

- **Print:** set Small first (9–11pt on A3–A2), then scale the whole ladder by the
  same ratios. Never enlarge one step alone. Margin = half the mark's height.
  No grain in print.
- **Social:** 4:5 feed, 9:16 stories. Type sits in a Paper or Ink block, not on
  the photograph — unless there is a scrim under it.
- **Signage:** Forta names the room, Gabarito says where it is, one hairline per
  division.
- The mark keeps its clear space (half its height) everywhere.

## 10. When you think the system needs something new

In order, stop at the first that works:

1. An existing component with a different prop.
2. An existing token in a new place.
3. A documented reuse: Forta at the Body size; Gabarito 600 at the Body size;
   colour, weight, case or position instead of size.
4. Only then: a new token — with its reasoning written as a comment next to it in
   `tokens.css`, the JSON updated (`npm run check:brand` will tell you), and a
   line in `brand/CHANGELOG.md`.

A new colour also needs provenance in the archive study or an explicit,
documented departure. A new type size needs a reason the other five cannot
cover — there has not been one yet.

---

## 10.5 Voice, in ten real lines

From the site, so they are the calibration, not an impression of it:

- "One shared week, made by Helsinki's creative communities."
- "You bring the idea. ODD brings the week together."
- "Finland has creative talent. What's missing are the structures that help it
  grow, connect and last."
- "An idea still at the notes-on-your-phone stage is a fine thing to send."
- "Creative work needs more than moments."
- "Don't just hear the argument. Experience it."
- "We do not claim to represent the creative field."
- "You are the heroes of ODD."
- "Ways to take part."
- "Stay ODD."

Banned constructions, in ODD's own words: adjective stacks ("sharp strategy,
bold creativity, real-world execution"), "world-class", "revolutionary",
"we believe in the power of…", "leveraging", "synergies", "ecosystem" as a
compliment, "unlock", "curated" about anything ODD did not curate, "coming
soon", exclamation marks, a pun on "odd" that has to be explained, and any
sentence another festival could have written unchanged.

Headlines are sentences and end with a full stop. CTAs are verb-first and
under five words. Numbers come from the content files or the backend, never
from a draft.

## 11. Cheat sheet

```css
/* Ground and figure — both flip under .theme-light (ODDspace) */
background: var(--color-bg); /* Ink, or Paper on a light page      */
color: var(--color-paper); /* the figure                          */
color: var(--color-paper-80); /* lead paragraph                      */
color: var(--color-paper-60); /* supporting body                     */
color: var(--color-paper-40); /* eyebrow, meta, quiet premise        */
border: 1px solid var(--color-paper-12); /* hairline                            */
border-color: var(--color-paper-35); /* outline control                     */
background: var(--color-backstage); /* raised card                         */
color: var(--color-heat); /* hover / press                       */
color: var(--color-amber-bright); /* "For creatives"                     */
color: var(--color-signal-bright); /* "For business"                      */

/* Type — always the shorthand plus its tracking */
font: var(--text-heading);
letter-spacing: var(--tracking-heading);
/* Eyebrow */
font: var(--text-small);
font-weight: 600;
letter-spacing: var(--tracking-eyebrow);
text-transform: uppercase;
/* Forta at the Body size (nav, session titles, names) */
font-family: var(--font-display);
font-size: var(--font-size-body);

/* Space */
gap: var(--space-3); /* label → value, title → body         */
margin-block-start: var(--space-content); /* heading → what it introduces      */
gap: var(--space-grid); /* rows of cards                       */
/* section → section is layout.css's job. Never set section padding.           */

/* Shape and motion */
border-radius: var(--radius-pill); /* buttons, tags, badges               */
border-radius: var(--radius-panel); /* floating panels only                */
transition: color var(--duration-fast) ease;
```

```astro
<!-- The section skeleton -->
<section>
  <div class="wrap flow">
    <div class="section-head">
      <p class="eyebrow">What ODDfest is</p>
      <h2>One shared week, made by Helsinki's creative communities.</h2>
    </div>
    <p class="lede">…</p>
    <FeatureGrid items={page.items} />
    <Pill href="/oddfest" variant="solid">Submit an event idea</Pill>
  </div>
</section>
```

## 12. Mistakes that keep happening here

- Writing `font-size: 1.25rem` instead of using a role.
- Adding `margin-bottom` between blocks (the parent's `.flow` owns it), or a
  negative margin to claw space back.
- `margin: 0 auto` on a `.flow` child — the shorthand zeroes the flow step. Use
  `margin-inline: auto`.
- `#000` for a scrim or a shadow. Scrims are Ink: `rgb(14 9 11 / N%)`.
- An accent as a large fill, or Ember as text on Paper (3.2:1 — use Amber).
- Heat as text on a raised card (3.75:1 on `--color-backstage`). There the text
  goes to full figure and the underline or border carries the heat instead.
- A rounded card, a drop shadow on a photograph, an icon set.
- Inventing a price, a date or a speaker. ODDference prices come from the ticket
  catalog; page values are fallbacks only.
- Typing a headline in capitals. Forta capitalises for you.
- Adding a route without adding it to `tests/functional/site-integrity.spec.ts`
  and `tests/mobile/helpers.ts`.
- Editing `src/assets/logos/*` by hand. They are generated: `brand/logos/build.py`.

## 13. Where everything lives

```
src/styles/tokens.css        colour, space, radius, motion, fonts  (canonical)
src/styles/typography.css    the five-size ladder                  (canonical)
brand/tokens/odd.css         all of it in one file, for use elsewhere (generated)
src/styles/layout.css        containers, section rhythm, .flow
src/components/primitives/   Logo, Pill, SocialIcon, NewsletterForm
src/components/sections/     every section shape the site has
src/content/pages/*.json     all editorial copy
src/pages/brand-book.astro   the designed brand book (/brand-book/)
brand/tokens/                brand-tokens.json + the drift check
brand/logos/                 build.py, rasterize.mjs, svg/, png/
brand/fonts/                 Forta + Gabarito, OFL
brand/deck/                  the PowerPoint system (isolated tooling)
brand/AUDIT.md               what the 2026-09-18 audit found
brand/CHANGELOG.md           what changed, and why
docs/design-system.md        the engineering-side rules, in more depth
AGENTS.md                    how this repository is meant to be worked on
```
