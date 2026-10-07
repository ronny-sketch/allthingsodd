import { test, expect } from '@playwright/test';

// What Search Console sees (2026-10-07). It reported a new "Excluded by
// 'noindex' tag": /membership/, retired 2026-10-05 through astro.config's
// `redirects`, whose generated stub carries <meta name="robots"
// content="noindex">. The stub is now src/pages/membership.astro, without it.

const ROBOTS = /<meta[^>]+name="robots"[^>]*>/i;

test('every sitemap page is indexable', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const routes: string[] = [];
  for (const [, child] of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const xml = await (await request.get(new URL(child).pathname)).text();
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) routes.push(new URL(loc).pathname);
  }
  expect(routes).toContain('/oddspace/membership/');
  expect(routes).not.toContain('/membership/');

  const noindexed: string[] = [];
  for (const route of routes) {
    const html = await (await request.get(route)).text();
    if (/noindex/i.test(html.match(ROBOTS)?.[0] ?? '')) noindexed.push(route);
  }
  expect(noindexed, 'sitemap pages telling Google not to index them').toEqual([]);
});

test('/membership/ redirects without noindex', async ({ page, request }) => {
  const html = await (await request.get('/membership/')).text();
  expect(html).not.toMatch(ROBOTS);
  expect(html).toContain(
    '<link rel="canonical" href="https://allthingsodd.co/oddspace/membership/"',
  );

  await page.goto('/membership/');
  await expect(page).toHaveURL(/\/oddspace\/membership\/$/);
});
