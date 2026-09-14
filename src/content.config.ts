import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Shared fragments reused across page schemas. Kept here (not per-page) only
// where the same real shape genuinely repeats — see docs/architecture.md's
// "reusable content models" note: a page-specific field beats a forced-generic
// one, so this list stays short on purpose.
const cta = z.object({
  eyebrow: z.string(),
  title: z.string(),
  linkLabel: z.string(),
  href: z.string(),
  // Optional, used only by Home's "The way in is by participation" band —
  // groups CTAs under a Business/Creative/Stay-in-touch label instead of
  // relying on array order or nth-child CSS. Every other page's participate/
  // cta arrays simply omit it and render exactly as before (ParticipateBand
  // falls back to one flat ungrouped row when nothing in the array sets
  // this) — see docs/architecture.md and ParticipateBand.astro.
  audience: z.string().optional(),
  // Optional one-line description — added for Home's quiet "Work with ODD"
  // pathway card (2026-08-31 final pass), which needs a short body under its
  // title the way a participate/finalCta entry never has. Every existing
  // caller simply omits it and renders exactly as before.
  body: z.string().optional(),
});

const linkCta = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional(),
});

const trackItem = z.object({
  label: z.string(),
  // Optional since the 2026-09-11 homepage reorg: Converge now renders each
  // side's `tracks` as a row of real buttons (Pill), where a second line of
  // small meta text has nowhere to go and nothing to say — the destination
  // name *is* the label. Kept in the shape (rather than deleted) because
  // Converge still renders it as a captioned list row when it's present, and
  // a future caller stacking several same-kind destinations under one side
  // would want that distinction back. See Converge.astro.
  meta: z.string().optional(),
  href: z.string(),
});

// number/title/body — reused verbatim as the site's one "steps/capabilities/
// process" card shape (ODDfest's How it works, ODDference's Why attend,
// ODDagency's Capabilities/Why ODD/How a project works, etc.) rather than
// inventing a near-duplicate per page.
const featureCard = z.object({
  number: z.string(),
  title: z.string(),
  body: z.string(),
});

const railItem = z.object({
  kind: z.enum(['logo', 'word', 'meta']),
  text: z.string().optional(),
});

const seo = z.object({
  title: z.string(),
  description: z.string(),
  ogImage: z.string().optional(),
});

// A single-column "editorial intro" block (eyebrow/headline/body/optional
// link) — the shape of "What ODD is", ODDference's "Big question", ODDagency's
// "What it is", Membership's "What it is", etc. One fragment, many pages.
const sectionIntro = z.object({
  eyebrow: z.string(),
  headline: z.string(),
  body: z.string(),
  cta: linkCta.optional(),
});

const proofItem = z.object({
  value: z.string(),
  label: z.string(),
  context: z.string().optional(),
  // Screen-reader-only expansion of an abbreviated `value` — see
  // ProofGrid.astro's `srValue`. Home's "€400K+" carries the full
  // "More than €400,000" here so the abbreviation the design needs never
  // costs the claim its meaning.
  srValue: z.string().optional(),
});

// A whole proof/traction module — optional at the object level (not just an
// empty array) so a page can omit it entirely until real numbers exist. See
// ProofGrid.astro. `eyebrow`/`title` are optional (2026-09-02 copywriting
// pass) — Home's new "Already in motion" proof module pairs a SectionIntro
// (which already carries its own eyebrow/headline) directly above a bare
// ProofGrid stat row, so that instance omits both rather than repeating the
// eyebrow twice. About/ODDspace keep passing both as before.
const proofSection = z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  items: z.array(proofItem),
  // The button under the figures — see ProofGrid.astro's `cta`. Home points
  // it at the ODDfest 2026 thank-you page (2026-09-14); it used to link the
  // 2025 Impact Report through `reportLabel`/`reportUrl`, plus a `reportNote`
  // scope caveat that the thank-you page doesn't need. About's impact
  // snapshots keep their own `reportLabel`/`reportUrl` fields (they predate
  // this fragment) and about.astro maps them onto the same prop.
  cta: linkCta.optional(),
  // One short line set above that button.
  ctaLead: z.string().optional(),
});

const caseStudy = z.object({
  category: z.string(),
  title: z.string(),
  partner: z.string().optional(),
  summary: z.string(),
  challenge: z.string().optional(),
  approach: z.string().optional(),
  result: z.string().optional(),
  metrics: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  href: z.string(),
});

// image() is only available inside the `pages` collection's own schema
// closure (see below) — personItem needs it (ODDference's speakers now
// carry real photos), so its full definition lives there, not here.

const programmeItem = z.object({
  title: z.string(),
  organiser: z.string().optional(),
  category: z.string(),
  date: z.string().optional(),
  time: z.string().optional(),
  venue: z.string().optional(),
  description: z.string(),
  href: z.string().optional(),
});

const faqItem = z.object({
  question: z.string(),
  answer: z.string(),
});

// A titled, dated, linked-out resource — Media page's whole media bank and
// archive share this exact shape. `type`/`year` are optional small badges
// (e.g. "Press release" / "2026") that ResourceList.astro renders next to
// the title — added for the Media page rebuild rather than forking a new
// component, per the "reuse before inventing" rule.
const resourceLink = z.object({
  title: z.string(),
  type: z.string().optional(),
  year: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  href: z.string(),
});

const audienceItem = z.object({
  label: z.string(),
  description: z.string(),
});

// Tickets (ODDference) and membership tiers share this exact shape — one
// pricing-card fragment, no invented price/date values (see each page's JSON).
const pricingTier = z.object({
  name: z.string(),
  audience: z.string().optional(),
  description: z.string().optional(),
  price: z.string(),
  status: z.string().optional(),
  benefits: z.array(z.string()),
  ctaLabel: z.string(),
  href: z.string(),
  recommended: z.boolean().optional(),
  // The badge on the emphasised card (2026-09-11). Defaults to
  // "Recommended" when unset, which is what Membership's three genuinely
  // alternative tiers still want. ODDference sets it to the real sale
  // deadline instead — on a ladder where exactly one tier can be bought,
  // "Recommended" describes a choice the reader does not have. See
  // PricingGrid.astro.
  badgeLabel: z.string().optional(),
  // "Real price, not purchasable yet" — renders the card dimmed with an
  // inert CTA so the whole price ladder is visible without offering a
  // checkout that would fail. ODDference only, and a build-time fallback
  // only: oddference-tickets.ts re-derives it from the catalog's `upcoming`
  // status at runtime, so the backend opening a tier unlocks it here with
  // no content edit. See PricingGrid.astro.
  locked: z.boolean().optional(),
  // ODDference only. The ticket-type slug in the ticket backend's catalog
  // (GET /api/tickets/catalog — see AGENTS.md's ticketing section). Setting
  // it hands price/status/benefits/CTA for that card to the backend at
  // runtime (src/scripts/oddference-tickets.ts); the values in this JSON
  // become the no-JS/offline fallback rather than a second source of truth.
  // The reason this exists: the marketing page and the storefront had
  // already drifted — main advertised Blind Bird at EUR 300 while the
  // catalog charged EUR 250 — and no test could see it, because nothing
  // compared the two.
  syncSlug: z.string().optional(),
  note: z.string().optional(),
  // Optional low-friction secondary link under the note (2026-09-02
  // copywriting pass — ODDference's "Want to know more before buying?"
  // mailto route). A different shape from `note` (plain text) since this
  // one needs a real href — see PricingGrid.astro.
  noteLink: linkCta.optional(),
});

// One singleton: everything that repeats identically on every page (nav, footer,
// social links, contact) instead of being duplicated per-page. See docs/design-system.md.
// "partners" and "featuredIn" live here (not on a page) for the same reason: the
// user asked for the identical logo set on both Home and Media — one shared list,
// not two content files that could drift apart. V2 reuses these same two real
// logo lists everywhere else a "partner network" grid is needed (About, Work with
// ODD, Membership) instead of inventing new placeholder logos per page.
const site = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/site' }),
  schema: ({ image }) =>
    z.object({
      // "children" is optional — a normal flat nav item omits it. An item
      // that has children (currently just "Info", grouping About/Media/
      // Contact) renders as a hover/focus dropdown on desktop (Nav.astro)
      // and as a small labeled group in the mobile menu; Footer.astro
      // flattens it back into ordinary footer links since a footer doesn't
      // need a dropdown. See docs/architecture.md#v2.
      nav: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
          external: z.boolean().optional(),
          children: z
            .array(
              z.object({
                label: z.string(),
                href: z.string(),
                external: z.boolean().optional(),
              }),
            )
            .optional(),
        }),
      ),
      social: z.array(z.object({ platform: z.string(), href: z.string() })),
      contact: z.array(z.object({ label: z.string(), email: z.string() })),
      // Where a form's message is emailed, by topic. Global rather than on
      // contact.json (where it started, 2026-09-11) because two different
      // pages send to the same places: /contact's form, and /work-with-odd's
      // business enquiry, which notifies `partnering` on top of its Attio
      // write. One key pasted once, so the two can never drift into mailing
      // different people about the same thing.
      //
      // A Web3Forms (web3forms.com) access key is bound to exactly one
      // recipient address, which is why there is one key per topic rather
      // than one key plus a recipient list. The fan-out to individual people
      // is NOT done here — each non-general key points at a Google Group on
      // oddfest.co (partners@/space@/fest@) whose membership is managed in
      // Workspace admin. That is deliberate: team membership changes far
      // more often than this site deploys, and the deploy path needs a
      // manual `npx surge dist` (docs/deployment.md), so a routing table of
      // people's addresses living in the repo would go stale silently. Each
      // group already contains hello@oddfest.co, so the shared inbox sees
      // everything without being addressed separately.
      //
      // Any key left blank falls back to `general` rather than failing: a
      // message reaching the shared inbox with the wrong subject beats a
      // visitor being told the form is broken.
      formAccessKeys: z
        .object({
          general: z.string().optional(),
          partnering: z.string().optional(),
          oddspace: z.string().optional(),
          oddfest: z.string().optional(),
        })
        .optional(),
      footerAddress: z.string(),
      footerTag: z.string(),
      newsletterLabel: z.string(),
      newsletterHref: z.string(),
      // Field name kept as "preRegister" (its original purpose), but as of
      // the 2026-08-30 homepage revision no component reads this field —
      // Nav.astro's header used to render it as the top-right "Newsletter"
      // button; that slot is now the "Info" dropdown instead, and
      // persistent newsletter UI lives only in the footer. Kept (not
      // deleted) for a real future pre-registration CTA — wire it up
      // wherever that should render once one exists, rather than reviving
      // its old nav placement by default.
      preRegister: z.object({ label: z.string(), href: z.string() }),
      // "tier" is optional and unset by default — which named company is a
      // Partner vs. Supporter vs. Media tier is a real business fact, not
      // something to invent. PartnerTiers.astro groups by it when present
      // and falls back to one unlabeled group when it isn't. See
      // docs/architecture.md#v2.
      partners: z.array(z.object({ name: z.string(), logo: image(), tier: z.string().optional() })),
      // "pressCoverage" is optional and unset by default — true only on an
      // item that's a verified real editorial/media outlet that has actually
      // covered ODD, as opposed to an award body, community, funder or
      // industry organisation that also gets a "featured in"-style logo slot
      // for other reasons. Home's own featuredIn render (index.astro) is
      // unaffected by this flag and keeps showing the full list; the Media
      // page's "Featured in" filters on it (media.astro) so it never
      // presents a funder or award body as press coverage. See the Media
      // page rebuild's featuredIn audit (2026-08-30) for which items were
      // verified and which were excluded as unconfirmed.
      featuredIn: z.array(
        z.object({ name: z.string(), logo: image(), pressCoverage: z.boolean().optional() }),
      ),
      // The future grouped logo wall (Partners / Media / Supported by /
      // Collaborators — see the homepage UX brief, 2026-08-30). Deliberately
      // separate from "partners" above rather than repurposing its "tier"
      // field: which named organisation belongs in which of these four
      // categories is a real business fact nobody has confirmed yet, so this
      // stays optional/hidden (`visible: false`, empty groups) until it is.
      // See docs/editing.md and LogoWall usage in PartnerTiers.astro (the
      // `groups` prop) for how this renders once populated + switched on.
      logoWall: z
        .object({
          visible: z.boolean(),
          groups: z.array(
            z.object({
              label: z.string(),
              items: z.array(z.object({ name: z.string(), logo: image() })),
            }),
          ),
        })
        .optional(),
      // Footer "Supported by" — deliberately separate from "partners" for
      // the same reason as logoWall above: foundation/supporter status isn't
      // recorded anywhere in this repo yet (no partner currently has
      // `tier: "Supporter"` set). Optional and left empty until it is — see
      // Footer.astro, which renders nothing when this is absent/empty.
      supportedBy: z.array(z.object({ name: z.string(), logo: image() })).optional(),
    }),
});

// Nine fixed pages, each with its own real (not generic) shape — this is a
// small bespoke brand site, not a stack of interchangeable blocks, so each
// page gets a named schema instead of a generic section composer. See
// docs/architecture.md. V2 split the old single "subpage" template into three
// real ones (oddfest/oddference/oddagency) once their content stopped
// actually overlapping — see docs/architecture.md#v2.
const pages = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/pages' }),
  schema: ({ image }) => {
    // "_template"/"_slug" (leading underscore) throughout this union are
    // CloudCannon's hide-from-editor convention — see the "_kind" comment
    // on the about-page panels below for why: these are routing
    // discriminants an editor retyping would break, not real content.

    // meta/title/body/goLabel/href + optional image — the site's one
    // "link-out card in an N-up grid" shape. Home's platform grid, Work with
    // ODD's four pathways, and ODDagency's project types all use it. `image`
    // is optional (unlike the old fixed four-card grid) precisely so this
    // grid isn't forced to exactly four equally-sized photo cards — see
    // ProgramGrid.astro's fallback treatment for a card with no photo.
    const platformCard = z.object({
      meta: z.string(),
      title: z.string(),
      body: z.string(),
      goLabel: z.string(),
      href: z.string(),
      image: image().optional(),
    });

    // Work with ODD's four entry points — platformCard plus a number ("01"–
    // "04") and a one-line "stage" ("Come in." / "Stay involved." / ...).
    // These aren't sequential funnel steps an organisation must pass through
    // in order (any card can be the starting point) — the number/stage pair
    // is a lightweight progression cue for scanning the row, not a gate.
    const pathwayCard = platformCard.extend({
      number: z.string(),
      stage: z.string(),
    });

    // Work with ODD's "What we've built with our partners" references
    // (2026-09-14): caseStudy plus an optional photo, a per-card link label
    // and an `external` flag. These references are real ODDfest work with
    // real photography, and every one of them points off-site (Flickr,
    // YouTube), where a same-tab "Read more →" was wrong. Lives in this
    // closure for `image()`; ODDagency and Home keep the plain caseStudy
    // and render exactly as before. See CaseGrid.astro.
    const referenceCase = caseStudy.extend({
      image: image().optional(),
      linkLabel: z.string().optional(),
      external: z.boolean().optional(),
    });

    // ODDfest's "Last year, this looked like…" grid — real, named 2026
    // Creative Week examples across varied formats (exhibition, performance,
    // screening, club night, workshop, talk, ...). image is optional (falls
    // back to a plain surface, same convention as platformCard/ProgramGrid)
    // since not every example has a usable photo. Ship this array empty
    // until real, verified 2026 examples exist to put in it — no invented
    // events/hosts, same "no placeholder data in production" rule as
    // proof/speakers/previousEdition elsewhere in this file. See
    // OddfestExamples.astro, which simply doesn't render the section when
    // this is empty.
    const creativeWeekExample = z.object({
      category: z.string(),
      title: z.string(),
      host: z.string().optional(),
      body: z.string(),
      image: image().optional(),
      href: z.string().optional(),
      // true when href leaves this site (a partner's event page or write-up)
      // — opens in a new tab with rel=noreferrer. See OddfestExamples.astro.
      external: z.boolean().optional(),
    });

    // Speaker/team grid shape — About's team (no photos yet) and
    // ODDference's 2026 speaker roster (real, verified photos — see
    // oddference.json and PersonGrid.astro's photo-led card). `image` needs
    // this collection's own `image()` helper, which is why this fragment
    // lives in the closure instead of alongside the other shared fragments
    // above `pages`.
    const personItem = z.object({
      name: z.string(),
      role: z.string(),
      organisation: z.string().optional(),
      bio: z.string().optional(),
      href: z.string().optional(),
      image: image().optional(),
    });

    // Shared by ODDfest/ODDference/ODDagency/ODDspace — the rail+hero shape
    // that made them "subpages" in the first place. Each extends this with
    // the fields that are actually different between them, rather than all
    // four carrying every other page's optional fields. "intro", "features"
    // and "participate" are deliberately NOT here even though 3 of the 4
    // use them — ODDfest's 2027 rebuild dropped the split-hero intro
    // paragraph, the standalone feature grid and the closing "Ways to
    // participate" band in favour of its own six-section flow (see
    // docs/architecture.md's 2027 ODDfest rebuild note), so those three
    // fields are declared individually on the oddference/oddagency/oddspace
    // branches below instead of forced onto all four.
    const subpageBase = z.object({
      seo,
      _slug: z.enum(['oddfest', 'oddference', 'oddagency', 'oddspace', 'oddstudio']),
      eyebrow: z.string(),
      title: z.string(),
      meta: z.string(),
      primaryCta: linkCta.optional(),
      // Which hero layout a subpage uses (split-video/split-image/
      // fullbleed-video) is fixed per page in the route file itself
      // (src/pages/odd*.astro's <SplitHero variant="...">), not content —
      // it's a structural choice, not something an editor would ever
      // plausibly toggle. See docs/architecture.md#hero-variants.
      heroMedia: z.object({
        video: z.string().optional(),
        poster: image().optional(),
        image: image().optional(),
        sub: z.string().optional(),
      }),
      railLeft: z.array(railItem),
      railRight: z.array(railItem),
    });

    return z.discriminatedUnion('_template', [
      z.object({
        _template: z.literal('home'),
        seo,
        hero: z.object({ mosaicAlt: z.string() }),
        // The page's real proposition line, rendered directly under the logo
        // mark inside the full-height hero itself (Hero.astro's optional
        // `headline` prop — at Ronny's direct request, replacing an earlier
        // separate light-band placement below the hero). Only a headline —
        // the old "subline" was a second, overlapping description of what
        // ODD builds; that idea now lives, unified with "whatOddIs"'s own
        // body, in the "Why ODD" section below, where primaryCta/secondaryCta
        // also render (not here) — see index.astro.
        opening: z.object({
          headline: z.string(),
          primaryCta: linkCta.optional(),
          secondaryCta: linkCta.optional(),
        }),
        // "Why ODD" (BuiltAround.astro, 2026-09-14). `missingPieces` label the
        // empty grid cells around the section's photograph — what the body
        // says has to be found again after every project. The grid has four
        // places, so four at most.
        whatOddIs: sectionIntro.extend({
          missingPieces: z.array(z.string()).max(4).optional(),
        }),
        // "tracks" (the small ODDference/Work with ODD/ODDfest/ODDspace
        // destination buttons under each audience blurb) is optional as of
        // the 2026-08-30 homepage revision — those destinations now live in
        // "What we do" (ProgramGrid) directly below this section instead of
        // being duplicated here too. Converge.astro renders nothing extra
        // when a side's `tracks` is omitted; kept optional (not deleted)
        // since Converge is a shared component and another page reusing it
        // may still want the track links. See docs/architecture.md.
        twoWaysIn: z.object({
          intro: z.string(),
          business: z.object({
            lede: z.string(),
            body: z.string(),
            tracks: z.array(trackItem).optional(),
            // Optional single routing CTA (2026-09-02 copywriting pass —
            // "Work with ODD →" / "Find your way in →") — a different shape
            // from `tracks` (a whole list of destinations); most callers
            // omit it. See Converge.astro.
            cta: linkCta.optional(),
          }),
          creative: z.object({
            lede: z.string(),
            body: z.string(),
            tracks: z.array(trackItem).optional(),
            cta: linkCta.optional(),
          }),
        }),
        // The three primary ODD destinations only (ODDfest / ODDference /
        // ODDspace) — see platformCard's own comment above. "Work with ODD"
        // moved out of this array in the 2026-08-31 final implementation
        // pass: it's a deeper way to work with ODD, not a fourth equal
        // masterbrand product, so it no longer competes for the same giant
        // photo-card treatment as the three real programmes — see
        // `workWithOdd` below and docs/architecture.md.
        platforms: z.array(platformCard),
        // Home's quiet "Work with ODD" pathway card — reuses the shared
        // `cta` shape (now with an optional `body`) rather than a full
        // platformCard, since this renders as a slim organisational banner,
        // not a giant photo card, immediately under the three-across
        // platforms grid. See index.astro.
        workWithOdd: cta,
        // Optional at the object level so this module can be entirely
        // absent from the page until real proof numbers exist — see
        // ProofGrid.astro.
        proof: proofSection.optional(),
        // "Already in motion" — the editorial intro (eyebrow/headline/body/
        // cta) rendered as a SectionIntro directly above the bare `proof`
        // ProofGrid stat row (2026-09-02 copywriting pass, "Proof / what is
        // already real"). Kept as its own field rather than folded into
        // `proof` since it's a different shape (sectionIntro) feeding a
        // different component.
        proofIntro: sectionIntro.optional(),
        // "workWithOdd" (the separate "For organisations / Work with ODD."
        // teaser section, with its own four-card grid) was removed from Home
        // in the 2026-08-30 homepage revision — it duplicated the "What we
        // do" platform grid immediately above it, which already includes a
        // Work with ODD card. The real /work-with-odd page and its content
        // are untouched. See docs/architecture.md.
        // Named "caseTeaser" (not "story") — this is a single case/proof
        // teaser card, a different shape from About's "story" (a timeline of
        // milestones). CloudCannon's _inputs are keyed by field name across
        // the whole `pages` collection, so two same-named-but-differently-
        // shaped fields would collide — see docs/architecture.md#v2.
        caseTeaser: z
          .object({
            category: z.string(),
            title: z.string(),
            summary: z.string(),
            metrics: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
            href: z.string(),
          })
          .optional(),
        // Home's closing participation band headline. Editorial copy, so it
        // lives here rather than hardcoded in index.astro (CMS rules in
        // AGENTS.md) — it was a literal string in the page until the
        // 2026-09-03 final integration pass, which is how it survived the
        // copywriting master's rewrite of this exact line ("participation" ->
        // "doing") while every field around it was updated.
        participateTitle: z.string().optional(),
        participate: z.array(cta),
        aftermovie: z.object({ poster: image(), video: z.string() }),
      }),

      // The 2027 ODDfest rebuild: a distributed city-wide creative week, not
      // a booked lineup — see docs/architecture.md#v2 and the six-section
      // flow in src/pages/oddfest.astro (hero / what it is / how it works /
      // examples / register / FAQ). whatItIs now carries the whole "made
      // across Helsinki, organisers keep ownership, ODD provides the
      // umbrella" story in one consolidated section (folding in what used to
      // be separate whoCanTakePart/whatOddProvides/organiserOwnership
      // fields) rather than three thin sections repeating the same idea.
      // forPartners and previousEdition were real 2026-era fields with no
      // home in the new flow — removed rather than left as stale CMS
      // controls; re-add a partners-facing section on Work with ODD instead
      // if that need resurfaces (see CLAUDE.md's Growth-OS-boundary note —
      // this is a website content decision, not one of those).
      subpageBase.extend({
        _template: z.literal('oddfest'),
        // The hero's second CTA ("Look back at 2026"). Declared on this
        // branch rather than on subpageBase for the same reason ODDference
        // declares its own: a page-specific addition to FullbleedVideoHero's
        // optional props, not something all five subpages carry.
        //
        // `heroSupport` was removed from this branch on 2026-09-14, when the
        // hero moved to ODDspace's composition (`frame="space"` — wordmark /
        // short display headline / meta / CTAs, no paragraph), the same
        // change ODDference got on 2026-09-11. Removed rather than made
        // optional: oddfest.astro no longer passes it, so an optional field
        // would be a CMS control whose text appears nowhere. What it said —
        // independently made events, you make yours, ODD builds the week —
        // is `whatItIs` and `ownership` directly below the hero, at length.
        secondaryCta: linkCta.optional(),
        whatItIs: sectionIntro,
        // The two ways to look back at ODDfest 2026, as a pair of buttons
        // under `whatItIs` (2026-09-11): the archived thank-you page, now
        // hosted on this site at /oddfest-2026/ (public/oddfest-2026/ — a
        // standalone page, deliberately not rebuilt as an Astro route), and
        // oddfest.co, the 2026 site still live on its own domain. Both are
        // history rather than the current offer, which is why they sit under
        // the explainer instead of competing with the hero's own CTAs.
        // `external: true` on a link opens it in a new tab — set it on
        // oddfest.co (a different domain) and leave it off the archived
        // page, which is on this site and carries its own way back.
        lookBack: z.object({
          label: z.string(),
          thankYou: linkCta,
          oldSite: linkCta,
        }),
        // The host/ODD responsibility split. Was `sharedLayer` until
        // 2026-09-11; renamed because the thing it was named after is gone.
        //
        // `sharedLayer.platform` — the "shared platform" sub-block — was
        // DELETED at Ronny's direct request, not moved. It described 2027
        // programme and discovery-platform features that are still unbuilt
        // and unconfirmed, which is precisely the promise-ahead-of-the-build
        // this file forbids everywhere else (see `examples`, `programme`,
        // `proof`). Do not reintroduce it until the platform exists.
        //
        // `stepsLabel` is the small label above the `howItWorks` steps, which
        // now render inside this same section: the split and the steps are
        // one argument — who does what, then what actually happens — and
        // were two adjacent sections saying it twice.
        ownership: z.object({
          headline: z.string(),
          host: z.object({ title: z.string(), body: z.string() }),
          odd: z.object({ title: z.string(), body: z.string() }),
          closing: z.string(),
          stepsLabel: z.string(),
        }),
        // Kept as a bare array of featureCards, NOT folded into `ownership`
        // above, even though the two now render as one section: `howItWorks`
        // is also a field on ODDspace, ODDagency and ODDstudio, and
        // CloudCannon's _inputs are keyed by field name across the whole
        // collection — changing the shape here would collide with theirs.
        // See the `caseTeaser` note above for the same trap.
        howItWorks: z.array(featureCard),
        // `history` ("What has happened before", the 2025/2026/2027
        // timeline chapter) was deleted on 2026-09-14 at Ronny's request.
        // Removed rather than made optional, so CloudCannon shows no control
        // for text that renders nowhere.
        // Optional at the object level only in the sense that it renders
        // nothing until real, verified 2027 dates/venues exist — same
        // "leave it out rather than invent it" rule as previousEdition used
        // to follow. Kept in the schema (not deleted) because the shared
        // ProgrammeList component is exactly what the 2027 programme will
        // need once it's live.
        programme: z.array(programmeItem),
        // The "2026 examples" section's editorial framing (eyebrow/headline/
        // body/closing) — kept separate from `examples` itself (the actual
        // NEEDS-REAL-PROOF list, still empty) so this copy is ready the
        // moment real, verified Creative Week 2026 examples exist, without
        // needing a code change. Renders only when `examples` is non-empty
        // — see oddfest.astro.
        examplesIntro: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          closing: z.string(),
        }),
        examples: z.array(creativeWeekExample),
        // Programme highlights (2026-09-14): names from the 2025 and 2026
        // programmes, grouped under a label ("Music & performance",
        // "Partners", ...) and rendered with AudienceList's label + line
        // treatment directly under the examples. Only names that verifiably
        // took part — not names that were merely announced. Renders nothing
        // while `groups` is empty.
        programmeHighlights: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          groups: z.array(audienceItem),
        }),
        // "Want your event in the next one?" (2026-09-14): the proof chapter's
        // closing ask, pointing back at the same submission route as "How to
        // join". A quieter band than `join`, so the page keeps one loudest ask.
        hostCta: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          cta: linkCta,
        }),
        // "How to join" — the page's conversion section. Was `register`
        // (headline/body/one cta) until 2026-09-11; renamed and widened at
        // Ronny's request into a clear, unmissable ask with two ways to act
        // on it. `cta` is the real one: submit an event idea. `altCta` is
        // for the reader who is interested but has nothing to submit yet,
        // so the section has no dead end.
        //
        // `reassurance` exists because the single biggest reason a host does
        // not submit is believing the idea is not finished enough to show
        // anyone. Keep it; it is doing more work than the headline.
        join: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          reassurance: z.string(),
          cta: linkCta,
          altCta: linkCta,
        }),
        // The page's second conversion, added 2026-09-11: a week made by
        // hundreds of independent hosts also has to be able to convert an
        // organisation that wants to back it. Deliberately a quiet band
        // after the proof chapter rather than a second loud ask beside
        // "How to join" — the host ask is this page's primary job, and two
        // competing CTAs of equal weight would cost it. Routes into the
        // existing Work with ODD partnerships enquiry, not a new form.
        partnerCta: z.object({
          eyebrow: z.string(),
          title: z.string(),
          body: z.string(),
          linkLabel: z.string(),
          href: z.string(),
        }),
        faq: z.array(faqItem),
      }),

      // The 2027 ODDference rebuild: the centrally-produced professional
      // experience (distinct from ODDfest, the distributed creative week —
      // see docs/architecture.md's ODDference 2027 rebuild note). Four real
      // jobs — explain the product, prove 2026 credibility, sell the active
      // Blind Bird ticket, generate partnership enquiries — replace the old
      // "Big Question" framing and the Themes/Formats/Why attend/Connection/
      // generic-FAQ sections that didn't map to any of those jobs.
      subpageBase.extend({
        _template: z.literal('oddference'),
        // A second hero CTA — declared here, not on subpageBase, since it's
        // genuinely page-specific (ODDfest declares its own the same way): "Get your ticket" + "Partner with ODDference" only
        // makes sense once there's something to sell and someone to court.
        secondaryCta: linkCta.optional(),
        // The hero's practical-value support line (2026-09-02 copywriting
        // pass — "A professional event for learning from creative and
        // cultural expertise — and meeting..."), rendered under the
        // question-headline `title`/h1. Page-specific (not on subpageBase —
        // ODDfest's hero has no equivalent line) — see
        // FullbleedVideoHero.astro's new optional `support` prop.
        //
        // Optional as of 2026-09-11, and currently unset: the hero was
        // retuned to match ODDspace's (`frame="space"` — see
        // FullbleedVideoHero.astro), whose composition is wordmark / short
        // display headline / meta / CTAs with no supporting paragraph. The
        // practical-value line that used to live here is now the first thing
        // `concept` says, where it has room to be a real sentence instead of
        // a caption competing with a display-sized h1. Kept in the schema
        // because the prop still exists and a future edition may want it back.
        heroSupport: z.string().optional(),
        // The one-paragraph concept explainer directly under the hero — same
        // sectionIntro shape oddfest.whatItIs uses. This is the page's "what
        // is it" section: as of 2026-09-11 it carries the central question
        // (previously the hero h1) as its headline, so the hero can hold a
        // short positioning line the way ODDspace's does.
        concept: sectionIntro,
        // The section head above `reasons` (2026-09-11). The three blocks
        // used to start with no heading at all, which made them read as a
        // continuation of the premise above rather than as the page's three
        // selling points.
        reasonsIntro: z.object({
          eyebrow: z.string(),
          headline: z.string(),
        }),
        // "Three reasons to come" — major editorial blocks (Ideas / People /
        // Experience), not FeatureGrid cards, per the rebuild brief; each can
        // carry its own photo. Rendered by page-scoped markup in
        // oddference.astro, not a shared grid component.
        reasons: z.array(
          z.object({
            number: z.string(),
            eyebrow: z.string().optional(),
            title: z.string(),
            body: z.string(),
            image: image().optional(),
          }),
        ),
        whoItsFor: z.array(audienceItem),
        // ODDference 2026's real, verified speaker roster — social proof,
        // not a line-up for a not-yet-programmed 2027 edition. Optional at
        // the object level only in the "ships empty until real names exist"
        // sense; it's populated for this rebuild (10 confirmed 2026
        // speakers with real photos).
        speakers: z.array(personItem).optional(),
        // Kept for a real future 2027 programme (ProgrammeList is exactly
        // what it'll need) — ships empty, same "don't invent it" rule as
        // oddfest.examples. Not rendered while empty.
        programme: z.array(programmeItem).optional(),
        // Real sessions from ODDference 2026 (2026-09-11). The second half of
        // the same social-proof job `speakers` does: a roster of names proves
        // who showed up, this proves what was actually discussed — which is
        // what a business reader is deciding about.
        //
        // Source is the event's own master stage schedule ("ODDference
        // Ajolista", the run sheet the venue was operated from), not the
        // live oddfest.co/oddference page — that page never published
        // session-level content, only the three programme tracks and the
        // speaker wall. Titles are verbatim from the run sheet, with one
        // typo fixed ("Creative Econony" → "Creative Economy").
        //
        // A curated selection, not the full 30-session programme: this is a
        // "what this event is like" proof block on a 2027 sales page, not an
        // archive. `format` is the session's real format from the run sheet
        // (Keynote / Fireside chat); `speakers` is a display string because
        // half of these are multi-person panels and none of them need to be
        // individually linkable.
        sessionHighlights: z
          .array(
            z.object({
              format: z.string(),
              title: z.string(),
              speakers: z.string(),
            }),
          )
          .optional(),
        // The active Blind Bird ticket only — ships with exactly one tier.
        // No invented checkout URL (see oddference.json's own comment on
        // each tier's href); the future Early Bird/Standard/Late ladder
        // stays out of both the content and this array until it's live.
        tickets: z.array(pricingTier).optional(),
        partnershipCta: cta,
        // The page's FAQ (2026-09-11), same `faqItem` shape and same
        // FAQList component ODDfest and ODDspace use. Answers are held to
        // the same standard as the rest of this file: only what is actually
        // settled about 2027 — everything still open (exact dates, venues,
        // the programme) says so rather than being filled in.
        faq: z.array(faqItem),
        // No dedicated ODDference aftermovie exists yet (checked the repo
        // and the live 2026 oddfest.co/oddference/ page — neither has one).
        // Ships undefined; the section doesn't render until Ronny supplies
        // real footage. Deliberately not the homepage's Aftermovie.astro
        // (a fixed 3-brand marquee built for the generic home-aftermovie.mp4
        // — reusing it here would either mislabel that generic video as
        // ODDference's or fork the marquee for no real content to show).
        aftermovie: z
          .object({
            poster: image(),
            video: z.string(),
          })
          .optional(),
        // No ODDference-specific partner/collaborator list could be
        // verified (the live 2026 page has no partners section; global
        // partners/press are sitewide and undated, not attributable to
        // ODDference specifically) — ships empty, same "don't invent it"
        // rule as tickets/aftermovie/speakers above. Flagged for Ronny.
        partners: z
          .array(
            z.object({
              name: z.string(),
              logo: image(),
            }),
          )
          .optional(),
      }),

      // 2026-08-31 final implementation pass: dropped `features` (a near-
      // duplicate of `capabilities` — same "what ODDagency can do" idea
      // twice) and the old `whyOdd` grid — removed rather than left as
      // stale CMS controls, same convention as membership's whyJoin/rhythm
      // above.
      //
      // 2026-09-02 copywriting pass: dropped `whatItIs` too — its content is
      // now folded into the richer hero `intro` itself, and the doc's
      // recommended flow (Hero → When this work makes sense → What
      // ODDagency contributes → How it works → Cases → CTA) has no separate
      // "what it is" chapter. Added `whenThisWorks` (NEW SECTION, right
      // after the hero) and replaced the two-card `participate` array with
      // a single `closingCta` (doc: "[SIMPLIFY] Closing CTA... one clear
      // exit is enough") — reuses the shared `cta` shape (already carries
      // an optional `body`, exactly what the new headline+body+one-link
      // closing needs).
      //
      // Also 2026-08-31: oddagency.astro switched from SubpageFrame (the
      // side-rail ticker ODDfest/ODDference/ODDspace use) + SplitHero to
      // Work with ODD's plainer HeroCentered — ODDagency shouldn't visually
      // pretend to be a fourth core masterbrand product. `heroMedia`,
      // `railLeft`/`railRight` and `meta` stay in this shape only because
      // they're inherited from the shared `subpageBase` all four subpages
      // extend (not worth forking the base type over); they're no longer
      // rendered on this specific page — don't be surprised editing one of
      // them has no visible effect here.
      subpageBase.extend({
        _template: z.literal('oddagency'),
        intro: z.string(),
        whenThisWorks: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          items: z.array(featureCard),
        }),
        capabilities: z.array(featureCard),
        howItWorks: z.array(featureCard),
        cases: z.array(caseStudy),
        projectTypes: z.array(z.string()),
        closingCta: cta,
      }),

      // ODDspace used to be an external link (oddspace.co) from the nav and
      // every card that mentioned it — now a real subpage, on the same
      // subpageBase shape as ODDfest/ODDference/ODDagency, so it can host a
      // real membership pitch, event-space rental rates and a live events
      // calendar instead of sending visitors off-site.
      //
      // 2026-08-30 rebuild: restructured around two conversion goals
      // (become a member / organise an event) instead of one section per
      // fact.
      //
      // 2026-09-11 cut, at Ronny's direct request: the page is now seven
      // sections — hero / what it is / what's here / enter the space / the
      // bigger picture / what's happening / FAQ. `coCreative`, `community`,
      // `networkBeyondRoom` and `proof` are gone from the template (not
      // "hidden"): each was a second, softer restatement of something the
      // four surviving prose sections already say, and an empty `proof`
      // had been rendering nothing since 2026-09-02 anyway. The Google
      // Calendar embed is gone too, replaced by `events` — a hand-kept
      // list of the things that actually recur or are booked, which is
      // readable at a glance where a month grid of mostly-empty days was
      // not. See src/pages/oddspace.astro. `heroMedia` (shared, subpageBase) is unused here — the new
      // hero takes a photo grid via `heroPhotos` instead of one video/image
      // — so oddspace.json just sets `heroMedia: {}`. The old dedicated
      // `location` section and `features` grid are gone (a whole section for
      // the address was more than it needed; the old features grid is
      // consolidated into other sections) — see `visit` below for the
      // compact, 2026-08-31 final-pass replacement: a one-line address +
      // directions link surfaced in the practical "Enter the space" flow,
      // not its own section. `whatYouGet` is gone, replaced by `spaces` (one
      // card per real space type, each with its own photo) — the membership
      // benefit list now lives entirely on `membership.benefits`.
      subpageBase.extend({
        _template: z.literal('oddspace'),
        // "What is ODDspace" — the concrete, once-only explainer (section 2
        // of the rebuild). `intro` carries the short human/practical
        // follow-up line rendered directly under it, not a hero paragraph.
        intro: z.string(),
        whatItIs: sectionIntro,
        // The real street address + a directions link — shown as one quiet
        // line inside "Enter the space" (section 6), not a dedicated
        // section (see the comment above this extend block). `directionsUrl`
        // is a generated Google Maps search URL for the same real address in
        // `address`, not a separately-typed-in value that could drift from
        // it — see oddspace.astro.
        visit: z.object({ address: z.string(), directionsUrl: z.string() }),
        // The 7-8 photo hero grid — see SpaceHero.astro. Deliberately not
        // capped at an exact count in the schema (a real editor should be
        // able to add/remove one without a code change), but the component
        // itself expects roughly 6-8 for the grid to read well.
        heroPhotos: z.array(z.object({ image: image(), alt: z.string() })),
        // Section 3: the four real, distinct spaces — co-working, event/
        // gallery, auditorium, studio — each with its own photo. Not
        // `featureCard` (number/title/body only) since this needs a photo
        // and an optional short bullet list per space; see SpaceShowcase.astro.
        spaces: z.array(
          z.object({
            name: z.string(),
            body: z.string(),
            bullets: z.array(z.string()).optional(),
            image: image().optional(),
            // The card's own CTA. Added 2026-09-11 for ODDstudio (the one
            // space with a page of its own) and extended the same day to
            // every card: "what's here" is where a reader decides which
            // room they want, so each card now routes straight to the
            // enquiry for that room instead of making them scroll back to
            // a generic pair of buttons. Set both or neither; a label with
            // no href renders nothing (SpaceShowcase.astro).
            href: z.string().optional(),
            goLabel: z.string().optional(),
          }),
        ),
        // A single tier, not an array like ODDference's tickets/Membership's
        // tiers — ODDspace's real pricing is deliberately one flat rate
        // ("one membership, full access, no tiers"), so this reuses the
        // same pricingTier shape as a single object instead of forcing an
        // N=1 array just for consistency with those other pages.
        membership: pricingTier,
        // The one carve-out from "one membership, full access" (2026-09-11):
        // ODDstudio is booked separately. This renders directly under the
        // €150 price rather than further down the page, because a member who
        // learns this later learns it from an invoice. Required, not
        // optional — while the carve-out is true, the page must say so.
        studioCallout: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          cta: linkCta,
        }),
        // Event-space rental rates (member pricing) — a plain price list,
        // not the fuller pricingTier shape (no benefits list/CTA per row
        // needed here, just name/price/note). Rendered inside the event
        // half of "Enter the space", next to the button that acts on them.
        rentalRates: z.array(
          z.object({ name: z.string(), price: z.string(), note: z.string().optional() }),
        ),
        howItWorks: z.array(featureCard),
        // Section 6, the event-enquiry half of "Enter the space" — the
        // membership half reuses `membership`/`primaryCta` directly rather
        // than a second copy block.
        eventEnquiry: z.object({
          headline: z.string(),
          body: z.string(),
          cta: linkCta,
        }),
        // "Organise an event" — the page's secondary CTA, alongside
        // subpageBase's `primaryCta` ("Become a member"). Both appear in
        // the hero and again in section 6. ODDference also declares its own
        // `secondaryCta` (a different purpose, "Partner with ODDference") —
        // see cloudcannon.config.yml's shared `secondaryCta` _inputs entry.
        secondaryCta: linkCta.optional(),
        // Section 7 — the bigger-picture reason ODDspace exists, kept
        // distinct from `whatItIs` (section 2's concrete "what is this
        // place" explainer) so the two don't repeat each other.
        vision: sectionIntro,
        // "What's happening" (2026-09-11, replacing the consent-gated
        // Google Calendar embed this field used to describe). A hand-kept
        // list beats the embed for three reasons that were all true of the
        // live calendar: a month grid gave a first-time reader no way to
        // tell a weekly open morning from a one-off festival, half of what
        // is on that calendar is an internal room booking nobody can
        // attend, and the embed could not load at all until the visitor
        // accepted third-party cookies. Reuses `programmeItem` and
        // ProgrammeList — the same shape ODDfest's programme uses — rather
        // than a fourth list component.
        //
        // Publish only what a stranger can actually turn up to or book,
        // and only what is confirmed: this list is edited by hand, so a
        // cancelled or moved date stays wrong until someone fixes it. The
        // canonical booking calendar stays internal.
        events: z
          .object({
            eyebrow: z.string(),
            title: z.string(),
            note: z.string().optional(),
            items: z.array(programmeItem),
            cta: linkCta.optional(),
          })
          .optional(),
        // "Life at ODDspace" (2026-09-14): a wall of real photographs of the
        // space in use, directly under the events list — the list says what
        // you could turn up to, the wall shows what that looks like. Any
        // number of photos, any mix of portrait and landscape: PhotoWall.astro
        // packs them by orientation, so an editor can't open a hole in it.
        // Each photo needs alt text describing what is actually shown.
        // Optional so the section can be removed without touching the page.
        gallery: z
          .object({
            eyebrow: z.string().optional(),
            title: z.string(),
            note: z.string().optional(),
            photos: z.array(z.object({ image: image(), alt: z.string() })),
          })
          .optional(),
        // The live @oddspace.co Instagram wall, under the events list
        // (2026-09-03 final integration pass; it sat under the calendar
        // embed until that was replaced on 2026-09-11). Only the editorial framing lives here —
        // which account, which provider and how many posts are technical
        // config, in src/scripts/oddspace-instagram-config.ts, per the CMS
        // rules in AGENTS.md. Optional so the section can be removed from
        // content without touching the page.
        instagram: z
          .object({
            eyebrow: z.string(),
            headline: z.string(),
            ctaLabel: z.string(),
          })
          .optional(),
        faq: z.array(faqItem),
      }),

      // ODDspace membership (2026-09-11) and ODDspace as a venue (below) —
      // the two conversion journeys /oddspace itself deliberately does not
      // carry. That page's job is to make someone want the place; these two
      // exist so that someone who already does can get every fact they need
      // before writing to us, which is what the September planning review
      // asked for. Both reuse ODDspace's own `_slug`, so the rails, logo and
      // frame are the ODDspace ones rather than a new identity.
      //
      // Both pages publish only what the site already stands behind. Where a
      // fact is genuinely not verified — capacities, AV inventory,
      // accessibility — the venue page says so and asks, rather than
      // printing a number from an internal draft. The internal rental guide
      // has three conflicting price lists as of 2026-09-11; none of them is
      // on this site.
      subpageBase.extend({
        _template: z.literal('oddspace-membership'),
        secondaryCta: linkCta.optional(),
        heroPhotos: z.array(z.object({ image: image(), alt: z.string() })),
        intro: z.string(),
        whatItIs: sectionIntro,
        // Two deliberately symmetrical lists. "notIncluded" is the one that
        // earns this page: the studio carve-out and the absence of private
        // desks are exactly what a prospective member otherwise discovers
        // after joining. Never quietly drop it to make the page read better.
        included: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          items: z.array(z.string()),
        }),
        notIncluded: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          items: z.array(z.string()),
          note: z.string().optional(),
        }),
        // The membership itself plus the studio combination, in the shared
        // pricing-card shape (same component as ODDference's tickets).
        tiers: z.array(pricingTier),
        ratesNote: z.string(),
        audiencesIntro: z.object({ eyebrow: z.string(), headline: z.string() }),
        audiences: z.array(audienceItem),
        howItWorks: z.array(featureCard),
        faq: z.array(faqItem),
        finalCta: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          cta: linkCta,
        }),
      }),

      subpageBase.extend({
        _template: z.literal('oddspace-venue'),
        secondaryCta: linkCta.optional(),
        heroPhotos: z.array(z.object({ image: image(), alt: z.string() })),
        intro: z.string(),
        whatItIs: sectionIntro,
        eventTypes: z.array(z.string()),
        spacesIntro: z.object({ eyebrow: z.string(), headline: z.string() }),
        // Same shape and component as /oddspace's own room cards.
        spaces: z.array(
          z.object({
            name: z.string(),
            body: z.string(),
            bullets: z.array(z.string()).optional(),
            image: image().optional(),
          }),
        ),
        pricing: sectionIntro,
        memberRates: z.array(
          z.object({ name: z.string(), price: z.string(), note: z.string().optional() }),
        ),
        ratesNote: z.string(),
        whatWeCanDo: sectionIntro,
        howItWorks: z.array(featureCard),
        // The honest half of a venue sales page: the specifications a real
        // event needs that this site cannot yet verify (capacities, AV,
        // accessibility, load-in) are named here as things we answer in an
        // enquiry. This block is not a placeholder to be filled with
        // plausible numbers later — when a number is genuinely verified it
        // moves into the page proper and leaves this list.
        askUs: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          items: z.array(z.string()),
        }),
        faq: z.array(faqItem),
        finalCta: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          cta: linkCta,
        }),
      }),

      // ODDstudio (2026-09-11) — the recording/production room inside
      // ODDspace, run with TUNEMENT. It exists as its own page rather than a
      // longer section on /oddspace for one commercial reason: it is the one
      // thing in the building that is NOT covered by the €150 membership, and
      // burying that in a fourth "spaces" card is how a member finds out by
      // being invoiced. /oddspace keeps the one-line correction and links
      // here; the full offer, rates, rules and terms live here.
      //
      // Deliberately reuses `subpageBase` (so the rails/hero/SEO behave like
      // every other subpage) plus ODDspace's own `heroPhotos`, `membership`
      // and `howItWorks` shapes, per the reuse-before-inventing rule. Only
      // the genuinely studio-specific fields are new.
      subpageBase.extend({
        _template: z.literal('oddstudio'),
        // Narrowed from subpageBase's optional: this page's whole job is to
        // get someone to book the room, so the booking CTA is not something
        // an editor should be able to empty. Same for the hero grid —
        // SpaceHero has no no-photo state.
        primaryCta: linkCta,
        secondaryCta: linkCta,
        heroPhotos: z.array(z.object({ image: image(), alt: z.string() })),
        // The short human line under the hero, same role as oddspace's.
        intro: z.string(),
        whatItIs: sectionIntro,
        // Same shape as oddspace's `spaces` — name/body/bullets/photo,
        // rendered by the same SpaceShowcase component. Here it's the four
        // equipment groups (monitoring, mics, instruments, the room itself)
        // rather than four rooms.
        kit: z.array(
          z.object({
            name: z.string(),
            body: z.string(),
            bullets: z.array(z.string()).optional(),
            image: image().optional(),
          }),
        ),
        // The framing above the pricing: says plainly that the studio is not
        // in the €150 membership. If this text ever stops saying that, the
        // whole reason this page exists is gone — see the note above and
        // tests/functional/oddstudio.spec.ts.
        access: sectionIntro,
        // The €250/month combined tier (ODDspace + studio). Single object,
        // not an array, for the same reason oddspace's is — there is one.
        membership: pricingTier,
        // Two separate rate lists because they are two different offers, not
        // one list with a qualifier column: members book at an hourly member
        // rate, everyone else buys from the standard card. Keeping them apart
        // is what stops the page implying a non-member can pay the member
        // rate. Same row shape as oddspace's `rentalRates`.
        memberRates: z.array(
          z.object({ name: z.string(), price: z.string(), note: z.string().optional() }),
        ),
        publicRates: z.array(
          z.object({ name: z.string(), price: z.string(), note: z.string().optional() }),
        ),
        // VAT + payment terms. One string, under both rate tables.
        ratesNote: z.string(),
        howItWorks: z.array(featureCard),
        houseRules: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          items: z.array(z.string()),
        }),
        // The individual-booking terms, rendered in the same accordion as
        // every FAQ on the site — they are genuinely question-shaped and an
        // accordion is how people read terms they mostly already accept.
        terms: z.array(faqItem),
        // Who actually runs the room. TUNEMENT is a real third party, so this
        // block carries its own contact and privacy-policy links rather than
        // implying ODD handles studio bookings or studio booking data.
        // Jarkko's personal mobile is deliberately NOT a field here — it is
        // in the internal house-rules document, and publishing a private
        // number on a public page is a decision for him, not for this repo.
        operator: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string(),
          image: image().optional(),
          imageAlt: z.string().optional(),
          cta: linkCta,
          privacyPolicy: linkCta.optional(),
        }),
        // Photographer credit for the whole set on this page.
        photoCredit: z.string().optional(),
      }),

      z.object({
        _template: z.literal('work-with-odd'),
        seo,
        // Rebuilt 2026-08-30 around the page's new role; hero rewritten
        // again 2026-09-02 (copywriting master pass) to open with the
        // visitor's own question ("What are you trying to make happen?")
        // rather than a naming choice between "Work with us"/"Work with
        // ODD" — nav placement stays a primary top-level item either way
        // (see site/global.json's `nav`); seo.title keeps "Work with ODD"
        // for continuity.
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        heroImage: image(),
        primaryCta: linkCta,
        // NEW SECTION (2026-09-02 copywriting pass) — "When ODD is useful":
        // the clearest articulation of the organisational use case, right
        // after the hero. Not `sectionIntro` (no intro paragraph in the
        // doc's copy, straight from headline to the list) — eyebrow/
        // headline plus featureCard items only, rendered as a plain
        // editorial list (see work-with-odd.astro) — "not sales cards" per
        // the doc's implementation note.
        whenOddIsUseful: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          items: z.array(featureCard),
        }),
        // "Why ODD" — one short editorial paragraph, same shape as
        // ODDference's bigQuestion / ODDagency's whatItIs, not a list of
        // five independent business units. Now the page's merged "Why ODD"
        // explanation (2026-09-02 pass folded the old three-card `whyOdd`
        // grid into this single paragraph, rendered after Pathways — see
        // work-with-odd.astro).
        whatWeDo: sectionIntro,
        pathways: z.array(pathwayCard),
        // The references section's own heading (2026-09-14) — was hardcoded
        // as "Selected work" / "Things we've built together" in the page
        // markup. `body` is an optional one-line lede under it.
        casesIntro: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          body: z.string().optional(),
        }),
        cases: z.array(referenceCase),
        // Page-specific curated logo set for organisations ODD has actually
        // worked with — deliberately NOT the sitewide `partners`/`featuredIn`
        // lists (those mix festival sponsors, press and historical
        // relationships that aren't the same claim as "worked with").
        // Starts empty on purpose: the section renders conditionally, same
        // pattern as `cases` above, until this is curated by hand.
        logos: z.array(z.object({ name: z.string(), logo: image() })),
        network: z.object({ eyebrow: z.string(), title: z.string() }),
        contact: z.object({ eyebrow: z.string(), title: z.string(), body: z.string() }),
      }),

      z.object({
        _template: z.literal('membership'),
        seo,
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        // NEW SECTION (2026-09-02 copywriting pass) — "Why this exists":
        // explains the need for year-round continuity without promising
        // benefits that are not yet designed.
        whyThisExists: sectionIntro,
        // "What we are shaping" — SIMPLIFIED (2026-09-02 copywriting pass)
        // from `whatItIs` + the three-card `whoItsFor` audience list + the
        // three-card `includes` benefit grid down to one deliberately small
        // paragraph. The doc is explicit: "Remove the current three
        // audience cards and three benefit cards until the offer, cadence,
        // tiers and annual price are actually approved. This page can be
        // deliberately small." Removed rather than left as stale CMS
        // controls, same convention as the 2026-08-31 pass this section
        // itself replaces — re-add a richer version once ODDnetwork's real
        // model is settled.
        whatWeAreShaping: sectionIntro,
        // Optional so tiers can be dropped from the page entirely until
        // pricing is final — see PricingGrid.astro.
        tiers: z.array(pricingTier).optional(),
        // No "network" field here (unlike About's/Work with ODD's) — this
        // page's own shared-partner-logo-strip section used to reuse the
        // sitewide sponsor list under a "members" heading, which is
        // misleading before any real member organisations exist (a
        // launch-readiness pass caught this: don't present ODD's ODDfest
        // partners as ODDmembership members). Removed rather than left
        // empty — re-add it, and its rendering in membership.astro, once
        // real members exist to show under it honestly.
        // Named "finalCta" (not "contact") — this is a single cta-shaped
        // closing CTA, a different shape from Work with ODD's "contact"
        // (an eyebrow/title/body intro above an embedded form).
        finalCta: cta,
      }),

      z.object({
        _template: z.literal('about'),
        seo,
        // Rebuilt 2026-08-30 around a simpler six-section shape (see
        // docs/architecture.md#v2-about-rebuild) instead of the old
        // four-panel scroll-pin opening: Why ODD exists (this uses the same
        // PageIntro-shaped eyebrow/title/intro as Work with ODD, plus
        // `argument` for the deeper editorial case) → Our story → How we
        // make things happen → Impact → Get involved → closing photo.
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        // The deeper "why this matters" case, as separate paragraphs (not
        // one long string) so the editorial rhythm survives in the CMS —
        // see about.json for the real copy.
        argument: z.array(z.string()),
        story: z.object({
          eyebrow: z.string(),
          title: z.string(),
          milestones: z.array(z.object({ year: z.string(), title: z.string(), body: z.string() })),
          // The one place the legal operator fact lives on this page — a
          // quiet caption under the timeline, not its own section. See
          // Timeline.astro / about.astro.
          legalNote: z.string(),
        }),
        howWeMakeItHappen: z.object({
          eyebrow: z.string(),
          title: z.string(),
          intro: z.string(),
          // Events / Spaces / Relationships & projects — reuses the same
          // number/title/body feature-card shape as every other "how it
          // works" section on the site (see featureCard above).
          pillars: z.array(featureCard),
          principlesEyebrow: z.string(),
          principlesTitle: z.string(),
          // A small number of working principles, same feature-card shape
          // as `pillars` — kept inside this same object (not a new
          // top-level field) since it's a sub-part of the same section.
          principles: z.array(featureCard),
        }),
        // `whatWeLearned` ("What we have learned") was deleted on 2026-09-14
        // at Ronny's request, field and all.
        // Two fixed snapshots (2025 real, 2026 pending) — an array, not the
        // shared `proofSection` object other pages use, precisely because
        // About needs two of them side by side. `items` is deliberately
        // allowed to be empty (2026's real numbers don't exist yet — see
        // ProofGrid.astro's `placeholder` prop): never fabricate a number to
        // fill it.
        impact: z.array(
          z.object({
            year: z.string(),
            eyebrow: z.string(),
            title: z.string(),
            items: z.array(proofItem),
            reportLabel: z.string().optional(),
            reportUrl: z.string().optional(),
            // Shown instead of the grid when `items` is empty — e.g. "The
            // 2026 Impact Report is being compiled — verified numbers will
            // replace this once it's published." Never invent items instead
            // of using this.
            placeholder: z.string().optional(),
          }),
        ),
        participate: z.array(cta),
        // The full-bleed 2026 launch photo the page ends on. `image` is
        // optional on purpose: no verified 2026 launch photo could be
        // identified from the archive at rebuild time (2026-08-30) — see
        // PhotoBreak.astro's empty-state handling. Do not point this at a
        // guessed/random crowd photo; leave it unset until a real one is
        // confirmed.
        closingImage: z
          .object({
            image: image().optional(),
            alt: z.string().optional(),
          })
          .optional(),
      }),

      z.object({
        _template: z.literal('contact'),
        seo,
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
      }),
      // Media page rebuild (2026-08-30): a public press/asset hub, not a
      // marketing page — see docs/architecture.md's Media page note. Seven
      // fixed sections: hero, Featured in, boilerplate (the reusable "what
      // is ODD" text infrastructure), the media bank (logos/photos/video —
      // "publish now"), the archive (grouped by year — "research history"),
      // press contact (+ optional accreditation notice), Follow ODD.
      // Evergreen facts (what ODD is, the operator, the core products, the
      // Helsinki base) live only in boilerplate/keyFacts; anything
      // time-specific (dates, themes, curators, venues, a given year's
      // numbers) lives only in `archive`, never presented as current truth.
      z.object({
        _template: z.literal('media'),
        seo,
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        // Optional compact anchor row under the hero (About ODD / Media bank
        // / Archive / Press contact) — omit entirely to drop it.
        jumpLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
        boilerplate: z.object({
          eyebrow: z.string(),
          headline: z.string(),
          // The canonical, copyable "what ODD is" paragraph — must stay
          // consistent with about.json/work-with-odd.json's own approved
          // framing of ODD/ODDfest/ODDference/ODDspace, not reinvent it.
          body: z.string(),
          // Optional Finnish version for later — leave unset until a real,
          // approved Finnish press text exists. Never machine-translate a
          // legal/press description into this field.
          bodyFi: z.string().optional(),
          // Genuinely evergreen only (Based in / Operated by / Main
          // activities) — no event dates, themes or venues here. "Website"
          // is not stored as data: media.astro derives it from `Astro.site`
          // the same way StructuredData.astro does, so it can never drift
          // into a hardcoded domain.
          keyFacts: z.array(z.object({ label: z.string(), value: z.string() })),
        }),
        // Small, undated background reading (e.g. "Event Formats Explained")
        // — separate from the dated archive because it explains what ODD's
        // formats/terms mean rather than reporting on one year's edition.
        // Optional: leave out rather than invent one.
        background: z.array(resourceLink).optional(),
        mediaBank: z.object({
          eyebrow: z.string(),
          title: z.string(),
          logos: z.object({
            note: z.string().optional(),
            // Only real, locally-available brand files — no invented
            // dark/light variants. `format` is a plain display label (SVG/
            // PNG), not a MIME type.
            items: z.array(
              z.object({ name: z.string(), format: z.string().optional(), logo: image() }),
            ),
            // Link-out to the fuller/approved logo kit (Drive) rather than
            // fabricating variants that don't exist locally.
            driveLink: resourceLink.optional(),
          }),
          // Each photo resource carries its own scoped usage/credit note —
          // deliberately not one blanket site-wide note, since the existing
          // note is ODDfest-specific and hasn't been confirmed to cover
          // ODDspace/ODDference collections too.
          photos: z.array(resourceLink.extend({ usageNote: z.string().optional() })),
          video: z.array(resourceLink),
        }),
        // Grouped by year — "research history", separate from the media
        // bank above ("publish now"). Each year's stale/time-specific facts
        // (a given edition's dates, theme, curators, venues, attendance,
        // press release) live here, never in boilerplate/keyFacts. No
        // invented years or entries — only real content that already
        // existed on the page, reorganised.
        archive: z.array(z.object({ year: z.string(), items: z.array(resourceLink) })),
        // Optional and off by default — replaces the old permanent
        // "Press accreditation" section. Only render this when accreditation
        // is genuinely, currently open; never fabricate an open process.
        accreditationNotice: z
          .object({
            active: z.boolean(),
            text: z.string().optional(),
            ctaLabel: z.string().optional(),
            ctaHref: z.string().optional(),
          })
          .optional(),
        pressContact: z.object({
          eyebrow: z.string(),
          title: z.string(),
          body: z.string(),
          name: z.string(),
          role: z.string(),
          email: z.string(),
        }),
        // Heading + short supporting line only — the actual platform/href
        // list is sourced live from site/global.json's `social` (already the
        // sitewide source of truth), not duplicated here.
        followSocial: z.object({ title: z.string(), body: z.string() }),
      }),
      // Legal pages (privacy & cookies today). Deliberately the site's one
      // generic prose template rather than a page-specific shape like every
      // variant above: a legal document is genuinely just headed sections of
      // text, it is the one kind of content here that really does recombine,
      // and a second one (terms of sale, a code of conduct) should be a new
      // JSON file plus a two-line route, not a new schema.
      //
      // The cookie table is NOT content and is not in here — it is rendered
      // from src/scripts/consent-config.ts, the same array the consent
      // banner gates on, so the declaration can't drift from what the site
      // actually sets. `cookieSection` below is only the prose around it.
      z.object({
        _template: z.literal('legal'),
        seo,
        eyebrow: z.string(),
        title: z.string(),
        /** Displayed to the reader and meaningful in law — a policy with no
         *  visible date can't be shown to have been in force on a given day.
         *  Free text, not a date type, so it reads "3 September 2026". */
        lastUpdated: z.string(),
        intro: z.string(),
        sections: z.array(
          z.object({
            title: z.string(),
            /** One string per paragraph. An array rather than one blob with
             *  newlines in it because CloudCannon gives an editor a real
             *  repeatable list for the former and a single textarea whose
             *  line breaks silently don't render for the latter. */
            body: z.array(z.string()),
            /** Optional bullet list under the paragraphs — used for the
             *  GDPR rights list, where each item is "Right to X: what it
             *  means" and a paragraph would bury it.
             *
             *  An item may instead be `{ text, onlyWhen }`, which renders
             *  only while that optional integration is actually configured
             *  in this build. It exists for exactly one problem: a
             *  third-party processor that ships switched off (the ODDspace
             *  Instagram feed) must not be disclosed as if it were running,
             *  and must be impossible to forget once it is. The copy still
             *  lives in content; only the condition lives in code — see
             *  src/pages/privacy.astro. */
            items: z
              .array(
                z.union([
                  z.string(),
                  z.object({ text: z.string(), onlyWhen: z.enum(['oddspace-instagram']) }),
                ]),
              )
              .optional(),
          }),
        ),
        cookieSection: z.object({
          title: z.string(),
          body: z.array(z.string()),
          /** Label on the button that reopens the consent banner. */
          settingsLabel: z.string(),
        }),
        contact: z.object({
          title: z.string(),
          body: z.array(z.string()),
          name: z.string(),
          email: z.string(),
          address: z.string(),
        }),
      }),
    ]);
  },
});

export const collections = { site, pages };
