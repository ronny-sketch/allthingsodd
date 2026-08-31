import { test, expect } from '@playwright/test';

// Every real route in the rebuilt site. Screenshots are checked into
// tests/visual/pages.spec.ts-snapshots/ as the visual-regression baseline —
// see docs/architecture.md#visual-regression for how to update them
// deliberately (`npx playwright test --update-snapshots`) vs. catching an
// accidental regression (a failing `npx playwright test`).
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

for (const route of ROUTES) {
  test(`${route || 'home'} — full page`, async ({ page }) => {
    // Pre-seed the "seen" flag NewsletterPopup.astro checks (see
    // src/scripts/newsletter-popup.ts) before any page script runs — added
    // 2026-08-31 after the homepage revision made the popup global (every
    // page via Layout.astro, not just Home). Its 15s timer can otherwise
    // fire in the middle of toHaveScreenshot's own stability-polling window
    // on a heavier page (oddspace/membership/about), mutating the DOM
    // mid-check and failing "two consecutive stable screenshots" — a real
    // interaction between two independently-developed features, not a
    // layout regression. Matches how a real returning-same-session visitor
    // already never sees it twice; doesn't change what a first-time visitor
    // sees in production.
    await page.addInitScript(() => sessionStorage.setItem('oddNewsletterPopupSeen', '1'));
    await page.goto(route);
    // Not 'networkidle': WarpingText's per-frame canvas.toDataURL() call (see
    // src/scripts/warping-text.ts) is heavy enough that on a page carrying an
    // active instance (oddfest/oddagency/membership), it starves the main
    // thread enough to keep pushing the cursor's own repeating (harmless)
    // image requests past networkidle's 500ms-quiet window — confirmed via a
    // direct A/B: reduced-motion (WarpingText inactive) reaches networkidle
    // in ~500ms, normal motion never reaches it at all. 'load' isn't affected
    // by legitimate ongoing background activity the way networkidle is (this
    // is Playwright's own documented guidance for pages with continuous
    // animation/polling), and document.fonts.ready + the settle wait below
    // already cover what networkidle was otherwise being used as a proxy for.
    await page.waitForLoadState('load');
    await page.evaluate(() => document.fonts.ready);
    // Let entrance animations (mosaic fly-in, reveal-on-scroll) settle before
    // capturing, so the baseline isn't flaky against animation timing.
    await page.waitForTimeout(1200);
    // A future regression adding a second heading, or removing the only one,
    // would still pass every other assertion in this file — this is the only
    // place that would catch it.
    await expect(page.locator('h1')).toHaveCount(1);
    // Checked per-route at every registered breakpoint (this project runs
    // mobile through wide) since horizontal overflow is viewport-dependent —
    // this is exactly the check that caught two real sitewide/homepage
    // overflow bugs at 768-1024px during the 2026-08-27 quality pass (see
    // docs/QUALITY_AUDIT.md RESP-1/RESP-2), which no prior test covered.
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      scrollWidth,
      `horizontal overflow: document is ${scrollWidth}px wide, viewport is ${clientWidth}px`,
    ).toBeLessThanOrEqual(clientWidth);
    await expect(page).toHaveScreenshot(`${route === '/' ? 'home' : route.slice(1)}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      timeout: 20_000,
      // Large photographic regions (hero mosaic, hero video/poster, news
      // filmstrip, program cards, about media) re-decode with tiny
      // pixel-level compositing noise between runs on this large a canvas —
      // real-world noise for media-heavy full-page captures, not a layout
      // regression. Masked out so this suite still catches what it's for:
      // structural/layout changes, not photo re-compression noise.
      mask: [
        page.locator(
          // .odds-calendar-embed: a live, embedded Google Calendar (real
          // ODDspace bookings) — its content changes day to day (today's
          // date highlight, new events), so it's masked for the same
          // "real noise, not a layout regression" reason as the
          // photographic regions below. .warping-text: added 2026-08-31 —
          // its per-instance canvas.toDataURL() distortion (see
          // src/scripts/warping-text.ts) redraws with tiny sub-pixel AA
          // differences every call even under reduced motion (one settle
          // render, not zero), which was intermittently failing
          // toHaveScreenshot's own same-run stability check (two
          // consecutive captures never quite byte-identical) on every page
          // carrying an active instance — About, ODDspace, Membership,
          // ODDagency — regardless of any real layout change. The text
          // content itself still has its own coverage (the h1-count
          // assertion above, functional nav/heading tests).
          '.mosaic, .news-panel img, .four-card-bg, .aftermovie-full, .oddfest-hero video, .oddfest-hero img, .oddf-hero-video video, .oddf-hero-video img, .photo-break img, .odds-calendar-embed, .warping-text',
        ),
      ],
    });
  });
}

test('404 page — real 404 status and branded content', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('404.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
    timeout: 20_000,
  });
});

// WebKit's own native media-controls pipeline logs "Button failed to load,
// iconName = ...-placard" to the console for autoplay/muted/playsinline video
// even with no visible controls — benign internal noise, not an app error.
const isWebkitMediaControlsNoise = (text: string) =>
  /Button failed to load, iconName = .*-placard/.test(text);

test('no console errors on any route', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isWebkitMediaControlsNoise(msg.text())) errors.push(msg.text());
  });
  for (const route of ROUTES) {
    await page.goto(route);
    // 'load', not 'networkidle' — see the full-page test above.
    await page.waitForLoadState('load');
  }
  expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
});
