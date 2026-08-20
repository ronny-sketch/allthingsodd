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
const site = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/site' }),
  schema: z.object({
    nav: z.array(
      z.object({ label: z.string(), href: z.string(), external: z.boolean().optional() }),
    ),
    social: z.array(z.object({ platform: z.string(), href: z.string() })),
    contact: z.array(z.object({ label: z.string(), email: z.string() })),
    footerAddress: z.string(),
    footerTag: z.string(),
    newsletterLabel: z.string(),
    preRegister: z.object({ label: z.string(), href: z.string() }),
  }),
});

// Five fixed pages, each with its own real (not generic) shape — this is a small
// bespoke brand site, not a stack of interchangeable blocks, so each page gets a
// named schema instead of a generic section composer. See docs/architecture.md.
const pages = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/pages' }),
  schema: ({ image }) =>
    z.discriminatedUnion('template', [
      z.object({
        template: z.literal('home'),
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
        template: z.literal('subpage'),
        seo,
        slug: z.enum(['oddfest', 'oddference', 'oddagency']),
        eyebrow: z.string(),
        title: z.string(),
        meta: z.string(),
        primaryCta: z.object({ label: z.string(), href: z.string() }).optional(),
        intro: z.string(),
        heroVariant: z.enum(['split-video', 'split-image', 'fullbleed-video']),
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
        template: z.literal('about'),
        seo,
        panels: z.array(
          z.discriminatedUnion('kind', [
            z.object({
              kind: z.literal('media'),
              image: image(),
              alt: z.string(),
              eyebrow: z.string(),
              title: z.string(),
              body: z.string(),
            }),
            z.object({
              kind: z.literal('model'),
              eyebrow: z.string(),
              title: z.string(),
              items: z.array(z.object({ label: z.string(), meta: z.string(), href: z.string() })),
            }),
            z.object({
              kind: z.literal('text'),
              eyebrow: z.string(),
              title: z.string(),
              body: z.string(),
              cta: z.object({ label: z.string(), href: z.string() }).optional(),
            }),
          ]),
        ),
        marqueeItems: z.array(z.string()),
      }),
    ]),
});

export const collections = { site, pages };
