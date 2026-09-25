import { test, expect } from '../base';

// Hero performance guards (2026-09-25). Each of these shipped to production
// once without any check noticing; see the comments they point at.

// LCP is the hero <h1>, not a mosaic photo. Chrome only counts an element
// visible at its first paint, so any opacity ramp on the headline drops it and
// LCP falls to a cell, then to the first ambient swap ~2.7s in. See
// Hero.astro's .hero-headline comment. Chromium only: the LCP API is.
for (const viewport of [
  { width: 1366, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`homepage LCP is the hero headline at ${viewport.width}px`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'largest-contentful-paint is Chromium-only');
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      const w = window as unknown as { __lcp: { tag: string; t: number }[] };
      w.__lcp = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { element?: Element })[])
          w.__lcp.push({ tag: e.element?.tagName ?? '', t: e.startTime });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto('/');
    // Past the first ambient swap (2.5s), which is what used to take over.
    await page.waitForTimeout(4500);
    const entries = await page.evaluate(
      () => (window as unknown as { __lcp: { tag: string; t: number }[] }).__lcp,
    );
    const last = entries.at(-1);
    expect(last?.tag, `LCP candidates: ${JSON.stringify(entries)}`).toBe('H1');
    expect(last!.t).toBeLessThan(2500);
  });
}

// An animated SVG filter re-renders on the CPU every frame. The hero logo's
// cost 87% of the homepage's main thread. See SteamFilters.astro.
test('no SVG filter is animated', async ({ page }) => {
  await page.goto('/');
  const animated = await page.locator('filter animate, filter animateTransform').count();
  expect(animated).toBe(0);
});

// A swapped-in photo that fails to load must not replace the one showing.
// See mosaic.ts's swap().
test('hero mosaic keeps its photos when swaps fail to load', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mosaic-cell img').first()).toBeVisible();
  await page.route('**/_astro/*.webp', (route) => route.abort());
  await page.waitForTimeout(5000); // first swap at 2.5s, then one every ~0.7s
  const broken = await page
    .locator('.mosaic-cell img')
    .evaluateAll(
      (imgs) =>
        imgs.filter(
          (img) => (img as HTMLImageElement).complete && !(img as HTMLImageElement).naturalWidth,
        ).length,
    );
  expect(broken, 'a failed swap was faded in over a working photo').toBe(0);
});
