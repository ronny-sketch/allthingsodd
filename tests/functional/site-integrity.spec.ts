import { test, expect, type Page } from '@playwright/test';

// Structural invariants that neither the visual suite (screenshots) nor
// interactions.spec.ts (hand-picked click paths) actually assert: every
// internal link the generated site contains really resolves, and every
// rendered image really loads. Both crawl the live rendered DOM rather than
// a hand-maintained list of hrefs, so a new page/link/image added later is
// covered automatically. See docs/QUALITY_AUDIT.md LINK-1/LINK-2.

const ROUTES = [
  '/',
  '/oddfest',
  '/oddference',
  '/oddagency',
  '/oddspace',
  '/work-with-odd',
  '/membership',
  '/about',
  '/media',
  '/contact',
];

// Forces every loading="lazy" image to actually load before checking it —
// without this, a not-yet-scrolled-to lazy image reports naturalWidth 0 and
// would be a false positive for "broken", not a true one.
async function scrollThroughPage(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100);
    const height = document.body.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
}

test('every internal link on every route resolves to a real page or in-page anchor', async ({
  page,
  request,
}) => {
  const brokenLinks: string[] = [];
  const checkedPaths = new Map<string, number>(); // path -> status, avoid re-requesting the same path

  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState('load');

    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.getAttribute('href') || '')
        // Same-origin only — external links (social, Flickr, YouTube, etc.)
        // aren't this site's responsibility to keep alive.
        .filter((href) => href.startsWith('/') || href.startsWith('#')),
    );

    for (const href of hrefs) {
      const [rawPath, hash] = href.split('#');
      const path = rawPath || route; // "#foo" alone means "this page"

      if (path === route || path === '') {
        // In-page anchor — the target id must exist on the page we're
        // already on (no navigation needed).
        if (hash) {
          const exists = await page.evaluate((id) => !!document.getElementById(id), hash);
          if (!exists) brokenLinks.push(`${route}: anchor "#${hash}" has no matching id`);
        }
        continue;
      }

      // A different route — check it actually resolves (once per unique path).
      if (!checkedPaths.has(path)) {
        const res = await request.get(path);
        checkedPaths.set(path, res.status());
      }
      const status = checkedPaths.get(path)!;
      if (status >= 400) {
        brokenLinks.push(`${route}: href "${href}" -> ${path} returned ${status}`);
      } else if (hash) {
        // Cross-page anchor — actually navigate and check the id exists there.
        await page.goto(path);
        await page.waitForLoadState('load');
        const exists = await page.evaluate((id) => !!document.getElementById(id), hash);
        if (!exists) brokenLinks.push(`${route}: href "${href}" -> #${hash} has no matching id on ${path}`);
        await page.goto(route);
        await page.waitForLoadState('load');
      }
    }
  }

  expect(brokenLinks, brokenLinks.join('\n')).toEqual([]);
});

test('every same-origin image on every route actually loads', async ({ page }) => {
  // Real `error` events, not naturalWidth === 0 — an SVG with no intrinsic
  // width/height/viewBox can legitimately report naturalWidth 0 while having
  // loaded and rendered correctly (confirmed: this exact false positive fired
  // on every logo-*.svg on first draft of this test), so that check can't
  // distinguish "loaded, sizeless format" from "actually failed to load."
  // The `error` event only fires on genuine load failure, for any format.
  await page.addInitScript(() => {
    (window as unknown as { __imgErrors: string[] }).__imgErrors = [];
    window.addEventListener(
      'error',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'IMG') {
          (window as unknown as { __imgErrors: string[] }).__imgErrors.push(
            (target as HTMLImageElement).src,
          );
        }
      },
      true, // capture — image error events don't bubble
    );
  });

  const broken: string[] = [];

  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState('load');
    await scrollThroughPage(page);

    const errorsOnRoute = await page.evaluate(
      () => (window as unknown as { __imgErrors: string[] }).__imgErrors,
    );
    // Same-origin only — third-party embeds (Flickr, in Media's press
    // gallery) are outside this repo's control; their availability isn't a
    // website defect to assert on here.
    const origin = new URL(page.url()).origin;
    broken.push(
      ...errorsOnRoute.filter((src) => src.startsWith(origin)).map((src) => `${route}: ${src}`),
    );
  }

  expect(broken, broken.join('\n')).toEqual([]);
});
