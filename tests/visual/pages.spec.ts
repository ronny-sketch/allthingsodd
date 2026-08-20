import { test, expect } from '@playwright/test';

// Every real route in the rebuilt site. Screenshots are checked into
// tests/visual/pages.spec.ts-snapshots/ as the visual-regression baseline —
// see docs/architecture.md#visual-regression for how to update them
// deliberately (`npx playwright test --update-snapshots`) vs. catching an
// accidental regression (a failing `npx playwright test`).
const ROUTES = ['/', '/oddfest', '/oddference', '/oddagency', '/about', '/media', '/contact'];

for (const route of ROUTES) {
  test(`${route || 'home'} — full page`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
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
          '.mosaic, .news-panel img, .four-card-bg, .about-media img, .aftermovie-full, .oddfest-hero video, .oddfest-hero img, .oddf-hero-video video, .oddf-hero-video img',
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
    await page.waitForLoadState('networkidle');
  }
  expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
});
