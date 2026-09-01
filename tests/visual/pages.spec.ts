import { test, expect, type Page } from '@playwright/test';

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

// Scrolls the whole page in fine-grained steps before capturing — the same
// pattern site-integrity.spec.ts already uses to force lazy images to
// load, needed here for a real, independently-confirmed reason too:
// `.reveal` elements (src/scripts/reveal.ts, most of the content on every
// page) only get their visible `.in` class from a real IntersectionObserver
// entry, and this project's `reducedMotion: 'reduce'` (playwright.config.ts)
// — which the rest of this suite assumes makes `.reveal` unconditionally
// visible via its own prefers-reduced-motion CSS branch (motion.css) —
// does not actually take effect at the browser level in this Playwright/
// Chromium combination (confirmed directly: `matchMedia('(prefers-reduced-
// motion: reduce)').matches` reports `false` even via a bare
// `test.use({ reducedMotion: 'reduce' })`, isolated from this file's own
// setup entirely). Without scrolling, `.reveal` content below the first
// viewport never intersects, never gets `.in`, and is captured at its
// real opacity:0.
//
// Two real, independently-confirmed causes behind why a first attempt at
// this (coarse, near-viewport-height steps) still left specific elements
// unrevealed — found via `document.querySelectorAll('.reveal:not(.in)')`
// after each change, not assumed:
//
// 1. A *tall* `.reveal` element (a multi-row pathway/FAQ/feature list) can
//    have its entire 15%-intersection-ratio window land *between* two large
//    discrete scroll jumps, so the IntersectionObserver callback never sees
//    it cross threshold at all — reproduced on Work with ODD's pathways/
//    "Why ODD" sections. Smaller (150px) steps fixed this — every element
//    gets multiple chances to be observed mid-transit instead of one.
// 2. Separately, a *content-dense* page (many simultaneous `.reveal`
//    elements competing for the same per-step timing budget — ODDference's
//    speaker/pricing grids, ODDspace's photo sections + a live Google
//    Calendar iframe) still dropped several observations at a fast 40ms/step
//    pace, even with the smaller step size from (1) — the browser's
//    IntersectionObserver callback queue falling behind, not a geometry
//    problem. 120ms/step gives it enough headroom; confirmed clean across
//    all 8 `.reveal`-bearing routes, 2 full repeated runs.
async function scrollThroughPage(page: Page) {
  await page.evaluate(async () => {
    const step = 150;
    const height = document.body.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    // Explicit final jump to the true bottom — the loop's last step can
    // undershoot it by up to `step - 1` px, which matters for a `.reveal`
    // element sitting right at the very end of the page (e.g. a closing
    // CTA/footer-adjacent section).
    window.scrollTo(0, height);
    await new Promise((r) => setTimeout(r, 200));
    window.scrollTo(0, 0);
  });
  // One entrance-transition duration (motion.css's --duration-reveal is
  // 0.7s) so the last-triggered reveals finish fading in before capture —
  // `animations: 'disabled'` on toHaveScreenshot below only forces a
  // transition already in progress to its end state, it doesn't help an
  // IntersectionObserver callback that hasn't fired yet.
  await page.waitForTimeout(1000);
}

for (const route of ROUTES) {
  test(`${route || 'home'} — full page`, async ({ page }) => {
    // Above Playwright's 30s default — scrollThroughPage's deliberately
    // slow 120-200ms/step pacing (see its own comment) on the tallest
    // pages at the widest breakpoint (confirmed: ODDspace/wide) can push
    // the test's total wall-clock time past the default on its own,
    // before the screenshot assertion's own budget even starts.
    test.setTimeout(45_000);
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
    // Let entrance animations (mosaic fly-in) settle before capturing, so
    // the baseline isn't flaky against animation timing.
    await page.waitForTimeout(1200);
    // Triggers every .reveal element's IntersectionObserver entry — see
    // scrollThroughPage's own comment above for why this is load-bearing,
    // not just the lazy-image nicety it is in site-integrity.spec.ts.
    await scrollThroughPage(page);
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
