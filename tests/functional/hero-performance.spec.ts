import type { Page } from '@playwright/test';
import { test, expect } from '../base';
import { suppressInterruptions } from '../mobile/helpers';

// Hero performance guards (2026-09-25). Each of these shipped to production
// once without any check noticing; see the comments they point at.
//
// Motion is switched on explicitly and checked (2026-09-28). The config's
// project-level `reducedMotion` has not reliably reached the browser (see
// CLAUDE.md, "Known gap"), so these tests set it themselves: a test of the
// swap loop or the tilt that silently ran under reduced motion would pass
// with no swap and no tilt at all, which proves nothing.
async function withMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}
async function expectMotion(page: Page) {
  const reduce = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(reduce, 'reduced motion is on, so this test would exercise nothing').toBe(false);
}

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
    await withMotion(page);
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
    await expectMotion(page);
    // Well past the first ambient swap (2.5s) and several after it, which is
    // what used to take over.
    await page.waitForTimeout(6000);
    const entries = await page.evaluate(
      () => (window as unknown as { __lcp: { tag: string; t: number }[] }).__lcp,
    );
    const last = entries.at(-1);
    expect(last?.tag, `LCP candidates: ${JSON.stringify(entries)}`).toBe('H1');
    expect(last!.t).toBeLessThan(2500);
  });
}

// The headline is readable at its first paint: its entrance moves it, never
// fades it. Checked while the entrance is running, not after it ends.
test('hero headline is fully opaque from the first frame', async ({ page }) => {
  await withMotion(page);
  await page.goto('/', { waitUntil: 'commit' });
  await expectMotion(page);
  // The first sample taken once the stylesheet applies, while the 1.2s
  // entrance is still running: an opacity ramp would read well below 1 here.
  const h1 = page.locator('.hero-headline');
  let sample = { animation: 'none', opacity: '' };
  await expect
    .poll(async () => {
      sample = await h1.evaluate((el) => ({
        animation: getComputedStyle(el).animationName,
        opacity: getComputedStyle(el).opacity,
      }));
      return sample.animation;
    })
    .not.toBe('none');
  expect(sample.opacity).toBe('1');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('hero headline is visible', async ({ page }) => {
    await withMotion(page);
    await page.goto('/');
    await expect(page.locator('.hero-headline')).toBeVisible();
    expect(
      await page.locator('.hero-headline').evaluate((el) => getComputedStyle(el).opacity),
    ).toBe('1');
  });
});

// An animated SVG filter re-renders on the CPU every frame. The hero logo's
// cost 87% of the homepage's main thread. See SteamFilters.astro. The torn
// steam edge itself stays: the filter is still there and still applied.
test('the hero logo keeps its steam filter, and nothing in it is animated', async ({ page }) => {
  await page.goto('/');
  const animated = await page.locator('filter animate, filter animateTransform').count();
  expect(animated).toBe(0);
  await expect(page.locator('filter#steam-hero feTurbulence')).toHaveCount(2);
  await expect(page.locator('filter#steam-hero feDisplacementMap')).toHaveCount(1);
  const filter = await page
    .locator('.hero-logo svg')
    .first()
    .evaluate((el) => getComputedStyle(el).filter);
  expect(filter).toContain('#steam-hero');
});

// A swapped-in photo that fails to load must not replace the one showing.
// See mosaic.ts's swap(). The test proves a replacement was really attempted
// and really failed — a run with no swap would pass without proving anything.
test('hero mosaic keeps its photos when swaps fail to load', async ({ page }) => {
  await withMotion(page);
  await page.goto('/');
  await expectMotion(page);
  const cells = page.locator('.mosaic-cell');
  await expect(cells).toHaveCount(20);
  // Every initial photo is loaded before anything is blocked, so only swaps
  // can hit the route below.
  await expect
    .poll(() =>
      page
        .locator('.mosaic-cell img')
        .evaluateAll((imgs) =>
          imgs.every(
            (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth,
          ),
        ),
    )
    .toBe(true);
  let aborted = 0;
  await page.route('**/_astro/*.webp', (route) => {
    aborted++;
    return route.abort();
  });
  await page.waitForTimeout(6000); // first swap at 2.5s, then one every ~0.7s
  expect(aborted, 'no swap requested a photo, so no failure was exercised').toBeGreaterThan(2);

  const cellsState = await cells.evaluateAll((els) =>
    els.map((cell) =>
      Array.from(cell.querySelectorAll('img')).map((img) => ({
        ok: img.complete && img.naturalWidth > 0,
        opacity: getComputedStyle(img).opacity,
      })),
    ),
  );
  const broken = cellsState.flat().filter((i) => !i.ok).length;
  expect(broken, 'a failed swap was faded in over a working photo').toBe(0);
  const blank = cellsState.filter((imgs) => !imgs.some((i) => i.ok && i.opacity !== '0')).length;
  expect(blank, 'a cell was left without a visible photo').toBe(0);
});

// The pointer tilt eases toward the cursor and then stops asking for frames
// (see hero-tilt.ts's tick()). It used to repaint every frame for as long as
// the pointer sat in the hero, moving or not.
test('hero tilt settles, stops scheduling frames, resumes and resets', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'pointer branch only; touch gets the scroll-linked tilt');
  // Everything below is measured in frames, not seconds. CI's Linux WebKit
  // renders this 3D-transformed hero in software and, under the suite's
  // parallel load, delivers about two frames a second. The ease-out takes
  // ~99 frames (0.06 per frame down to 0.01deg), so it can outlast any
  // fixed one-second window or 45 s poll without being wrong. That is how this
  // test failed on #113: every window read "too few frames to tell" until the
  // poll gave up. The timeout only has to cover the frame budget below at
  // that rate.
  test.setTimeout(240_000);
  // The newsletter popup and consent banner open over the cursor, which is a
  // real mouseleave and resets the tilt before anything here is measured.
  await suppressInterruptions(page);
  await withMotion(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  // Counts the rAF requests the tilt loop makes (its callback is the one that
  // writes rotateX), and keeps the unwrapped rAF so the page can count real
  // frames itself.
  await page.addInitScript(() => {
    const w = window as unknown as {
      __tilt: number;
      __leaves: number;
      __raf: typeof requestAnimationFrame;
    };
    w.__tilt = 0;
    w.__leaves = 0;
    const raf = window.requestAnimationFrame.bind(window);
    w.__raf = raf;
    window.requestAnimationFrame = (cb) => {
      if (String(cb).includes('rotateX')) w.__tilt++;
      return raf(cb);
    };
    document.addEventListener(
      'mouseleave',
      (e) => {
        if ((e.target as Element).classList?.contains('hero')) w.__leaves++;
      },
      true,
    );
  });
  await page.goto('/');
  await expectMotion(page);
  const mosaic = page.locator('#heroMosaic');
  const transform = () => mosaic.evaluate((el) => el.style.transform);
  const tiltRequests = () => page.evaluate(() => (window as unknown as { __tilt: number }).__tilt);

  // Started: the move asks for tilt frames and one of them paints.
  const before = await tiltRequests();
  await page.mouse.move(700, 440);
  await page.mouse.move(1300, 150, { steps: 8 });
  await expect.poll(transform).toContain('rotateX(');
  expect((await tiltRequests()) - before, 'the tilt loop never ran').toBeGreaterThan(0);

  // Pointer at rest: the loop eases in, then stops asking for frames. It used
  // to keep requesting one every frame for as long as the pointer stayed.
  // Settled means 10 real frames in a row with no tilt request, since a
  // running loop asks once per frame. Budget: 400 frames, about four times
  // the ease-out. A loop that never stops fails here at frame 400, and a
  // stalled engine runs into the test timeout. Neither can pass.
  const rest = await page.evaluate(
    () =>
      new Promise<{ frames: number; quiet: boolean }>((resolve) => {
        const w = window as unknown as { __tilt: number; __raf: typeof requestAnimationFrame };
        let frames = 0;
        let quietFor = 0;
        let last = w.__tilt;
        const step = () => {
          frames++;
          quietFor = w.__tilt === last ? quietFor + 1 : 0;
          last = w.__tilt;
          if (quietFor >= 10) return resolve({ frames, quiet: true });
          if (frames >= 400) return resolve({ frames, quiet: false });
          w.__raf(step);
        };
        w.__raf(step);
      }),
  );
  expect(
    rest.quiet,
    `the tilt loop kept running with the pointer at rest (still asking after ${rest.frames} frames)`,
  ).toBe(true);
  const leaves = await page.evaluate(() => (window as unknown as { __leaves: number }).__leaves);
  expect(leaves, 'the pointer left the hero, so the loop stopped for another reason').toBe(0);
  const settled = await transform();

  // Resumes on movement.
  await page.mouse.move(200, 800, { steps: 8 });
  await expect.poll(transform).not.toBe(settled);

  // Resets on leave — to nothing, not to its last frame.
  await page.evaluate(() =>
    document.querySelector('.hero')!.dispatchEvent(new MouseEvent('mouseleave')),
  );
  await expect.poll(transform, { timeout: 3000 }).toBe('');
});

// A tilt small enough to settle before the 600ms reset timer used to leave
// its last frame, scale(1.02), on the mosaic after the pointer had gone.
test('hero tilt resets on leave even when it settled first', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer branch only');
  await suppressInterruptions(page);
  await withMotion(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expectMotion(page);
  const transform = () => page.locator('#heroMosaic').evaluate((el) => el.style.transform);
  // One event at the dead centre of the hero: the target is no tilt at all.
  const box = (await page.locator('.hero').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(transform).toContain('scale(1.02)');
  await page.evaluate(() =>
    document.querySelector('.hero')!.dispatchEvent(new MouseEvent('mouseleave')),
  );
  await expect.poll(transform, { timeout: 3000 }).toBe('');
});
