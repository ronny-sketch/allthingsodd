import { test, expect } from '@playwright/test';

// Every internal link that carries a query string must put a trailing slash
// before the `?` — `/work-with-odd/?interest=…`, never `/work-with-odd?…`.
//
// Why this test exists (2026-09-13): Surge serves every page as
// `<route>/index.html` and answers the un-slashed form with a 301 to the
// slashed one — and that redirect DROPS THE QUERY STRING. Verified live:
//
//   /work-with-odd?interest=oddspace&intent=membership  -> 301 /work-with-odd/
//   /work-with-odd/?interest=oddspace&intent=membership -> 200
//
// So eighteen enquiry and contact deep links across the site — ODDfest's
// "Submit an event idea", both partner routes, every ODDspace membership and
// venue enquiry — reached their form with nothing preselected, and a contact
// message could route to the wrong inbox. Nothing caught it, because
// `astro preview` (what every other test here runs against) does not do that
// redirect: the broken links worked perfectly in every test run and failed
// only in production.
//
// That is why this asserts on the href SHAPE rather than following the link:
// following it locally proves nothing. It reads the route list from the
// built sitemap, so a new page is covered without anyone remembering to add
// it here.
//
// The same redirect also strips `?order_token=` from Stripe's return to
// /tickets/confirmation. That URL is built by the Growth OS Worker
// (TICKETS_RETURN_URL in ../odd-growth-os/wrangler.toml), not by this site,
// so it cannot be guarded from here — but it has the identical cause.

async function sitemapRoutes(baseURL: string): Promise<string[]> {
  const index = await (await fetch(`${baseURL}/sitemap-index.xml`)).text();
  const childUrls = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const routes = new Set<string>();
  for (const child of childUrls) {
    // The sitemap carries absolute production URLs; fetch the same path locally.
    const xml = await (await fetch(`${baseURL}${new URL(child).pathname}`)).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) routes.add(new URL(m[1]).pathname);
  }
  return [...routes];
}

test('no internal link puts a query string on an un-slashed path', async ({ page, baseURL }) => {
  const routes = await sitemapRoutes(baseURL!);
  expect(routes.length, 'sitemap should list the site’s routes').toBeGreaterThan(10);

  const offenders: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      const q = href.indexOf('?');
      if (q === -1) continue;
      // The path before `?` must end in `/` — otherwise Surge's 301 eats the query.
      if (!href.slice(0, q).endsWith('/')) offenders.push(`${route} → ${href}`);
    }
  }

  expect(
    offenders,
    `internal links whose query string Surge's trailing-slash redirect would drop:\n${offenders.join('\n')}`,
  ).toEqual([]);
});
