// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // The production domain, cut over from odd-field-guide.surge.sh on
  // 2026-09-03 (see docs/deployment.md#domain-migration). This single value
  // is where every public absolute URL on the site comes from — canonical
  // links and og:url (Layout.astro), og:image/twitter:image (Layout.astro),
  // Organization/WebSite JSON-LD (StructuredData.astro), the Media page's
  // copyable press URL (media.astro), and the generated sitemap. Changing it
  // here changes all of them; there are no hardcoded production hostnames in
  // src/. The one place that does NOT read from it is public/robots.txt
  // (a static file Astro copies verbatim) — update its Sitemap: line too.
  site: 'https://allthingsodd.co',

  integrations: [
    sitemap({
      // The two transient ticketing pages carry <meta name="robots"
      // content="noindex"> (Layout.astro's `noindex` prop) — a checkout form
      // and a per-order confirmation screen, neither of which is a page
      // anyone should land on from search. Listing them in the sitemap while
      // telling crawlers not to index them is a contradiction Search Console
      // reports as "Indexed, though blocked" / "Excluded by noindex" noise,
      // and it would follow the site onto the new domain as day-one errors.
      // Everything else — the ten real content pages plus /tickets itself —
      // stays in. Keep in sync with the pages that pass `noindex` to Layout.
      filter: (page) =>
        !['/tickets/checkout/', '/tickets/confirmation/'].some((path) => page.endsWith(path)),
    }),
  ],
});
