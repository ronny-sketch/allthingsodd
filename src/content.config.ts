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
});

const linkCta = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional(),
});

const trackItem = z.object({
  label: z.string(),
  meta: z.string(),
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
});

// A whole proof/traction module — optional at the object level (not just an
// empty array) so a page can omit it entirely until real numbers exist. See
// ProofGrid.astro.
const proofSection = z.object({
  eyebrow: z.string(),
  title: z.string(),
  items: z.array(proofItem),
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

// A titled, dated, linked-out resource — Media page's Press Releases, Info
// Packs and Assets & Photos all share this exact shape.
const resourceLink = z.object({
  title: z.string(),
  date: z.string().optional(),
  description: z.string().optional(),
  href: z.string(),
});

const activityItem = z.object({
  date: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
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
  note: z.string().optional(),
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
      featuredIn: z.array(z.object({ name: z.string(), logo: image() })),
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
      _slug: z.enum(['oddfest', 'oddference', 'oddagency', 'oddspace']),
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
        // body, in the "More than one event" section below, where
        // primaryCta/secondaryCta also render (not here) — see index.astro.
        opening: z.object({
          headline: z.string(),
          primaryCta: linkCta.optional(),
          secondaryCta: linkCta.optional(),
        }),
        whatOddIs: sectionIntro,
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
          }),
          creative: z.object({
            lede: z.string(),
            body: z.string(),
            tracks: z.array(trackItem).optional(),
          }),
        }),
        whatsHappening: z.object({
          note: z.string(),
          items: z.array(activityItem),
        }),
        // Not fixed at four — see platformCard's own comment above.
        platforms: z.array(platformCard),
        // Optional at the object level so this module can be entirely
        // absent from the page until real proof numbers exist — see
        // ProofGrid.astro.
        proof: proofSection.optional(),
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
        whatItIs: sectionIntro,
        howItWorks: z.array(featureCard),
        // Optional at the object level only in the sense that it renders
        // nothing until real, verified 2027 dates/venues exist — same
        // "leave it out rather than invent it" rule as previousEdition used
        // to follow. Kept in the schema (not deleted) because the shared
        // ProgrammeList component is exactly what the 2027 programme will
        // need once it's live.
        programme: z.array(programmeItem),
        examples: z.array(creativeWeekExample),
        register: z.object({
          headline: z.string(),
          body: z.string(),
          cta: linkCta,
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
        // A second hero CTA (ODDfest's FullbleedVideoHero call doesn't pass
        // one) — declared here, not on subpageBase, since it's genuinely
        // page-specific: "Buy Blind Bird" + "Partner with ODDference" only
        // makes sense once there's something to sell and someone to court.
        secondaryCta: linkCta.optional(),
        // The one-paragraph concept explainer directly under the hero — same
        // sectionIntro shape oddfest.whatItIs uses. No separate "Big
        // Question" section repeats this below.
        concept: sectionIntro,
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
        // "What changes in 2027" — one section: a sectionIntro-shaped
        // headline plus 3 featureCard items (More immersive / More
        // connected / More intentional encounters), same shape
        // oddfest.whatItIs + oddfest.howItWorks already use split across two
        // sections, combined here into one.
        whatsChanging: sectionIntro.extend({ items: z.array(featureCard) }),
        // The active Blind Bird ticket only — ships with exactly one tier.
        // No invented checkout URL (see oddference.json's own comment on
        // each tier's href); the future Early Bird/Standard/Late ladder
        // stays out of both the content and this array until it's live.
        tickets: z.array(pricingTier).optional(),
        partnershipCta: cta,
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

      subpageBase.extend({
        _template: z.literal('oddagency'),
        intro: z.string(),
        features: z.array(featureCard),
        whatItIs: sectionIntro,
        capabilities: z.array(featureCard),
        whyOdd: z.array(featureCard),
        howItWorks: z.array(featureCard),
        cases: z.array(caseStudy),
        projectTypes: z.array(z.string()),
        participate: z.array(cta),
      }),

      // ODDspace used to be an external link (oddspace.co) from the nav and
      // every card that mentioned it — now a real subpage, on the same
      // subpageBase shape as ODDfest/ODDference/ODDagency, so it can host a
      // real membership pitch, event-space rental rates and a live events
      // calendar instead of sending visitors off-site.
      subpageBase.extend({
        _template: z.literal('oddspace'),
        intro: z.string(),
        features: z.array(featureCard),
        whatItIs: sectionIntro,
        community: sectionIntro,
        proof: proofSection,
        whatYouGet: z.array(featureCard),
        // A single tier, not an array like ODDference's tickets/Membership's
        // tiers — ODDspace's real pricing is deliberately one flat rate
        // ("one membership, full access, no tiers"), so this reuses the
        // same pricingTier shape as a single object instead of forcing an
        // N=1 array just for consistency with those other pages.
        membership: pricingTier,
        // Event-space rental rates (member pricing) — a plain price list,
        // not the fuller pricingTier shape (no benefits list/CTA per row
        // needed here, just name/price/note).
        rentalRates: z.array(
          z.object({ name: z.string(), price: z.string(), note: z.string().optional() }),
        ),
        howItWorks: z.array(featureCard),
        location: sectionIntro,
        // Optional — the live Google Calendar embed. Omit rather than embed
        // a broken/placeholder calendar if the real one isn't available.
        calendar: z
          .object({
            eyebrow: z.string(),
            title: z.string(),
            note: z.string().optional(),
            embedUrl: z.string(),
          })
          .optional(),
        faq: z.array(faqItem),
        participate: z.array(cta),
      }),

      z.object({
        _template: z.literal('work-with-odd'),
        seo,
        // Rebuilt 2026-08-30 around the page's new role. Note: an earlier
        // pass on this same day briefly moved this page's nav placement into
        // the Info dropdown (relabelled "Work with us") — the 2026-08-30
        // homepage revision brief explicitly requires "Work with ODD" stay a
        // primary top-level nav item (see site/global.json's `nav`), so that
        // move was reverted. This page's own H1 still reads "Work with us."
        // from that pass — left as-is (a copy/positioning call on this page,
        // not this brief's scope) rather than reverted without confirming
        // which title is actually wanted; seo.title above keeps
        // "Work with ODD" for continuity either way.
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        heroImage: image(),
        primaryCta: linkCta,
        // "What we do" — one short editorial paragraph, same shape as
        // ODDference's bigQuestion / ODDagency's whatItIs, not a list of
        // five independent business units.
        whatWeDo: sectionIntro,
        whyOdd: z.array(featureCard),
        pathways: z.array(pathwayCard),
        cases: z.array(caseStudy),
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
        whatItIs: sectionIntro,
        whoItsFor: z.array(audienceItem),
        whyJoin: z.array(featureCard),
        includes: z.array(z.object({ title: z.string(), body: z.string() })),
        rhythm: z.array(z.string()),
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
        // Web3Forms (web3forms.com) needs no backend of ours — just a free
        // access key pasted here. Left blank until a real key exists; the
        // form renders either way but only submits once this is set. See
        // docs/editing.md#contact-form.
        formAccessKey: z.string().optional(),
      }),
      z.object({
        _template: z.literal('media'),
        seo,
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        accreditation: sectionIntro,
        keyFacts: z.array(z.object({ label: z.string(), value: z.string() })),
        highlights: proofSection.optional(),
        boilerplate: sectionIntro,
        pressReleases: z.array(resourceLink),
        infoPacks: z.array(resourceLink),
        assets: z.object({
          eyebrow: z.string(),
          title: z.string(),
          usageNote: z.string().optional(),
          items: z.array(resourceLink),
        }),
        pressContact: z.object({ name: z.string(), role: z.string(), email: z.string() }),
        // A visual Flickr photobank — each item renders via Flickr's own
        // official embed widget (a `data-flickr-embed` anchor + the
        // embedr.flickr.com script), not a raw iframe pointed at flickr.com
        // itself: flickr.com's own pages send `X-Frame-Options: SAMEORIGIN`
        // (confirmed via a real header check, not assumed), which blocks
        // embedding outright; embedr.flickr.com is Flickr's dedicated,
        // iframe-friendly embed service and is what the "Embed" button on
        // flickr.com itself generates. `photo`/`photoWidth`/`photoHeight` are
        // just the placeholder image shown before that script upgrades it
        // into the real interactive widget. Optional at the object level,
        // same "omit rather than invent" rule as the rest of this page.
        photobank: z
          .object({
            eyebrow: z.string(),
            title: z.string(),
            note: z.string().optional(),
            items: z.array(
              z.object({
                label: z.string(),
                href: z.string(),
                photo: z.string(),
                photoWidth: z.number(),
                photoHeight: z.number(),
              }),
            ),
          })
          .optional(),
      }),
    ]);
  },
});

export const collections = { site, pages };
