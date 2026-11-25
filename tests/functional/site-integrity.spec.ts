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
  '/oddfest-2026',
  '/oddference',
  '/oddagency',
  '/oddspace',
  '/oddspace/event-info-pack',
  '/oddspace/code-of-conduct',
  '/tickets/terms',
  '/invoicing',
  '/oddstudio',
  '/work-with-odd',
  '/about',
  '/media',
  '/contact',
  // The brand book (2026-09-18). Not in the visual suite: it is a ~64,000px
  // document, so five baseline screenshots of it would cost more than they
  // could catch. Its links, images, console errors and mobile overflow are
  // covered here and in tests/mobile.
  '/brand-book',
  '/impact-report-2026',
  // The speakers' page (2026-11-25): noindex, shared by link only.
  '/oddference/speakers',
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

// One test per route, not one test looping over every route (2026-11-25).
// Both checks used to be a single 30 s test each that crawled all of ROUTES,
// and in WebKit on CI (Desktop Safari, two workers per shard) they had crept
// up to ~30 s as pages were added: /brand-book alone scrolls for ~5 s and
// /impact-report-2026 for ~3.5 s. Main went red four times in November on
// "Test timeout of 30000ms exceeded" with nothing actually broken. Split per
// route, every route still gets the identical check, each with its own full
// timeout, and a new route adds a test rather than eating into a shared
// budget. Slowest single route in WebKit on CI is ~7 s.

test.describe('every internal link resolves to a real page or in-page anchor', () => {
  for (const route of ROUTES) {
    test(route, async ({ page, request }) => {
      const brokenLinks: string[] = [];
      const statusByPath = new Map<string, number>(); // path -> status, request each path once
      // path -> every id in that page's rendered DOM. Collected once per page
      // instead of navigating to the target and back for every cross-page
      // anchor: /oddspace has five links into /oddspace/venue/ and /oddfest
      // six into /oddfest/, and that back-and-forth was ~40 of the old test's
      // ~70 navigations.
      const idsByPath = new Map<string, Set<string>>();
      const idsOnPage = async () =>
        new Set(
          await page.evaluate(() => Array.from(document.querySelectorAll('[id]'), (el) => el.id)),
        );

      await page.goto(route);
      await page.waitForLoadState('load');

      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((a) => a.getAttribute('href') || '')
          // Same-origin only — external links (social, Flickr, YouTube, etc.)
          // aren't this site's responsibility to keep alive.
          .filter((href) => href.startsWith('/') || href.startsWith('#')),
      );
      idsByPath.set(route, await idsOnPage());

      for (const href of hrefs) {
        const [rawPath, hash] = href.split('#');
        const path = rawPath || route; // "#foo" alone means "this page"

        if (path === route || path === '') {
          // In-page anchor — the target id must exist on this route's page.
          if (hash && !idsByPath.get(route)!.has(hash)) {
            brokenLinks.push(`${route}: anchor "#${hash}" has no matching id`);
          }
          continue;
        }

        // A different route — check it actually resolves (once per unique path).
        if (!statusByPath.has(path)) {
          const res = await request.get(path);
          statusByPath.set(path, res.status());
        }
        const status = statusByPath.get(path)!;
        if (status >= 400) {
          brokenLinks.push(`${route}: href "${href}" -> ${path} returned ${status}`);
        } else if (hash) {
          // Cross-page anchor — load the target in the browser (ids can be
          // rendered client-side) and check the id exists there.
          if (!idsByPath.has(path)) {
            await page.goto(path);
            await page.waitForLoadState('load');
            idsByPath.set(path, await idsOnPage());
          }
          if (!idsByPath.get(path)!.has(hash))
            brokenLinks.push(`${route}: href "${href}" -> #${hash} has no matching id on ${path}`);
        }
      }

      expect(brokenLinks, brokenLinks.join('\n')).toEqual([]);
    });
  }
});

test.describe('every same-origin image actually loads', () => {
  for (const route of ROUTES) {
    test(route, async ({ page }) => {
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
      const broken = errorsOnRoute
        .filter((src) => src.startsWith(origin))
        .map((src) => `${route}: ${src}`);

      expect(broken, broken.join('\n')).toEqual([]);
    });
  }
});
