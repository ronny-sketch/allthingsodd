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

const personItem = z.object({
  name: z.string(),
  role: z.string(),
  organisation: z.string().optional(),
  bio: z.string().optional(),
  href: z.string().optional(),
});

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
      // Field name kept as "preRegister" (its original purpose) rather than
      // renamed, but it currently points at the newsletter signup — there's
      // no real pre-registration destination yet, and a top-nav button
      // linking to "#" was a real launch blocker (a CTA visible on every
      // page that goes nowhere). Point this back to an actual
      // pre-registration URL, and give it its own honest field name, once
      // one exists.
      preRegister: z.object({ label: z.string(), href: z.string() }),
      // "tier" is optional and unset by default — which named company is a
      // Partner vs. Supporter vs. Media tier is a real business fact, not
      // something to invent. PartnerTiers.astro groups by it when present
      // and falls back to one unlabeled group when it isn't. See
      // docs/architecture.md#v2.
      partners: z.array(z.object({ name: z.string(), logo: image(), tier: z.string().optional() })),
      featuredIn: z.array(z.object({ name: z.string(), logo: image() })),
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

    // Shared by ODDfest/ODDference/ODDagency — the rail+hero+features+participate
    // shape that made them "subpages" in the first place. Each extends this
    // with the fields that are actually different between them, rather than
    // all three carrying every other page's optional fields.
    const subpageBase = z.object({
      seo,
      _slug: z.enum(['oddfest', 'oddference', 'oddagency']),
      eyebrow: z.string(),
      title: z.string(),
      meta: z.string(),
      primaryCta: linkCta.optional(),
      intro: z.string(),
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
      features: z.array(featureCard),
      participate: z.array(cta),
      railLeft: z.array(railItem),
      railRight: z.array(railItem),
    });

    return z.discriminatedUnion('_template', [
      z.object({
        _template: z.literal('home'),
        seo,
        hero: z.object({ mosaicAlt: z.string() }),
        // The mosaic hero stays pure visual impact (no text over it, by
        // design — see docs/architecture.md#v2). This is the actual
        // proposition moment: a shortened hero flows straight into it, so a
        // visitor never scrolls without a clue what ODD is. Only a headline
        // now — the old "subline" was a second, overlapping description of
        // what ODD builds; that idea now lives, unified with "whatOddIs"'s
        // own body, in the "More than one event" section below, where
        // primaryCta/secondaryCta also render (not here) — see index.astro.
        opening: z.object({
          headline: z.string(),
          primaryCta: linkCta.optional(),
          secondaryCta: linkCta.optional(),
        }),
        whatOddIs: sectionIntro,
        twoWaysIn: z.object({
          intro: z.string(),
          business: z.object({ lede: z.string(), body: z.string(), tracks: z.array(trackItem) }),
          creative: z.object({ lede: z.string(), body: z.string(), tracks: z.array(trackItem) }),
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
        workWithOdd: z.object({
          eyebrow: z.string(),
          title: z.string(),
          intro: z.string(),
          cards: z.array(cta),
          ctaLabel: z.string(),
          ctaHref: z.string(),
        }),
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

      subpageBase.extend({
        _template: z.literal('oddfest'),
        whatItIs: sectionIntro,
        howItWorks: z.array(featureCard),
        whoCanTakePart: z.array(z.string()),
        whatOddProvides: z.array(z.string()),
        organiserOwnership: sectionIntro,
        programme: z.array(programmeItem),
        openCall: z
          .object({
            status: z.string(),
            headline: z.string(),
            body: z.string(),
            deadline: z.string().optional(),
            cta: linkCta,
            eligibilityHref: z.string().optional(),
          })
          .optional(),
        forPartners: sectionIntro,
        previousEdition: z
          .object({
            eyebrow: z.string(),
            title: z.string(),
            body: z.string(),
            proof: z.array(proofItem).optional(),
            archiveHref: z.string().optional(),
          })
          .optional(),
        faq: z.array(faqItem),
      }),

      subpageBase.extend({
        _template: z.literal('oddference'),
        bigQuestion: sectionIntro,
        whoItsFor: z.array(audienceItem),
        whyAttend: z.array(featureCard),
        themes: z.array(z.object({ title: z.string(), body: z.string() })),
        formats: z.array(z.string()),
        speakers: z.array(personItem).optional(),
        programme: z.array(programmeItem).optional(),
        connection: sectionIntro,
        proof: proofSection
          .extend({ quote: z.object({ text: z.string(), attribution: z.string() }).optional() })
          .optional(),
        tickets: z.array(pricingTier).optional(),
        partnershipCta: cta,
        faq: z.array(faqItem),
      }),

      subpageBase.extend({
        _template: z.literal('oddagency'),
        whatItIs: sectionIntro,
        capabilities: z.array(featureCard),
        whyOdd: z.array(featureCard),
        howItWorks: z.array(featureCard),
        cases: z.array(caseStudy),
        projectTypes: z.array(z.string()),
      }),

      z.object({
        _template: z.literal('work-with-odd'),
        seo,
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        whyOdd: z.array(featureCard),
        pathways: z.array(platformCard),
        cases: z.array(caseStudy),
        howWeWork: z.array(featureCard),
        network: z.object({ eyebrow: z.string(), title: z.string(), note: z.string() }),
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
        // The four-panel horizontal scroll-pin stays for the conceptual
        // opening (What is ODD / Why we exist / How it works / One
        // platform) — see docs/architecture.md#v2 for why the deeper V2
        // sections (story, proof, people, network, ambition) continue below
        // it as a normal page instead of extending the pin to ten panels.
        panels: z.array(
          // "_kind" (not "kind") deliberately — a leading underscore is
          // CloudCannon's own convention for "hide this field from the
          // editor UI" (see cloudcannon.config.yml). It's the discriminant
          // that picks which of the three panel shapes below applies;
          // letting an editor retype it would desync the panel from its own
          // content and break rendering, for zero editorial value.
          z.discriminatedUnion('_kind', [
            z.object({
              _kind: z.literal('media'),
              image: image(),
              alt: z.string(),
              eyebrow: z.string(),
              title: z.string(),
              body: z.string(),
            }),
            z.object({
              _kind: z.literal('model'),
              eyebrow: z.string(),
              title: z.string(),
              items: z.array(z.object({ label: z.string(), meta: z.string(), href: z.string() })),
            }),
            z.object({
              _kind: z.literal('text'),
              eyebrow: z.string(),
              title: z.string(),
              body: z.string(),
              cta: linkCta.optional(),
            }),
          ]),
        ),
        marqueeItems: z.array(z.string()),
        story: z.object({
          eyebrow: z.string(),
          title: z.string(),
          milestones: z.array(z.object({ year: z.string(), title: z.string(), body: z.string() })),
        }),
        proof: proofSection.optional(),
        people: z.object({
          eyebrow: z.string(),
          title: z.string(),
          orgDescription: z.string(),
          team: z.array(personItem).optional(),
        }),
        network: z.object({ eyebrow: z.string(), title: z.string(), note: z.string() }),
        ambition: sectionIntro.optional(),
        participate: z.array(cta),
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
