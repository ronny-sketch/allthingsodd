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
          // photographic regions below.
          '.mosaic, .news-panel img, .four-card-bg, .about-media img, .aftermovie-full, .oddfest-hero video, .oddfest-hero img, .oddf-hero-video video, .oddf-hero-video img, .photo-break img, .odds-calendar-embed',
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
