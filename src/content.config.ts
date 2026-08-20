import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Shared fragments reused across page schemas.
const cta = z.object({
  eyebrow: z.string(),
  title: z.string(),
  linkLabel: z.string(),
  href: z.string(),
});

const trackItem = z.object({
  label: z.string(),
  meta: z.string(),
  href: z.string(),
});

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

// One singleton: everything that repeats identically on every page (nav, footer,
// social links, contact) instead of being duplicated per-page. See docs/design-system.md.
// "partners" and "featuredIn" live here (not on a page) for the same reason: the
// user asked for the identical logo set on both Home and Media — one shared list,
// not two content files that could drift apart.
const site = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/site' }),
  schema: ({ image }) =>
    z.object({
      nav: z.array(
        z.object({ label: z.string(), href: z.string(), external: z.boolean().optional() }),
      ),
      social: z.array(z.object({ platform: z.string(), href: z.string() })),
      contact: z.array(z.object({ label: z.string(), email: z.string() })),
      footerAddress: z.string(),
      footerTag: z.string(),
      newsletterLabel: z.string(),
      newsletterHref: z.string(),
      preRegister: z.object({ label: z.string(), href: z.string() }),
      partners: z.array(z.object({ name: z.string(), logo: image() })),
      featuredIn: z.array(z.object({ name: z.string(), logo: image() })),
    }),
});

// Seven fixed pages, each with its own real (not generic) shape — this is a small
// bespoke brand site, not a stack of interchangeable blocks, so each page gets a
// named schema instead of a generic section composer. See docs/architecture.md.
const pages = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/pages' }),
  schema: ({ image }) =>
    // "_template"/"_slug" (leading underscore) throughout this union are
    // CloudCannon's hide-from-editor convention — see the "_kind" comment
    // on the about-page panels below for why: these are routing
    // discriminants an editor retyping would break, not real content.
    z.discriminatedUnion('_template', [
      z.object({
        _template: z.literal('home'),
        seo,
        hero: z.object({ mosaicAlt: z.string() }),
        openingLine: z.string(),
        converge: z.object({
          intro: z.string(),
          business: z.object({ lede: z.string(), body: z.string(), tracks: z.array(trackItem) }),
          creative: z.object({ lede: z.string(), body: z.string(), tracks: z.array(trackItem) }),
        }),
        news: z.array(z.object({ image: image(), caption: z.string(), href: z.string() })),
        whatsOn: z.object({
          note: z.string(),
          columns: z.array(
            z.array(
              z.object({
                date: z.string(),
                title: z.string(),
                href: z.string(),
                description: z.string(),
                ticketLabel: z.string().optional(),
              }),
            ),
          ),
        }),
        programGrid: z.array(
          z.object({
            meta: z.string(),
            title: z.string(),
            body: z.string(),
            goLabel: z.string(),
            href: z.string(),
            image: image(),
          }),
        ),
        participate: z.array(cta),
        aftermovie: z.object({ poster: image(), video: z.string() }),
      }),
      z.object({
        _template: z.literal('subpage'),
        seo,
        _slug: z.enum(['oddfest', 'oddference', 'oddagency']),
        eyebrow: z.string(),
        title: z.string(),
        meta: z.string(),
        primaryCta: z.object({ label: z.string(), href: z.string() }).optional(),
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
      }),
      z.object({
        _template: z.literal('about'),
        seo,
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
              cta: z.object({ label: z.string(), href: z.string() }).optional(),
            }),
          ]),
        ),
        marqueeItems: z.array(z.string()),
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
      }),
    ]),
});

export const collections = { site, pages };
