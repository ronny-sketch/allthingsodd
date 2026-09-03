import { test, expect } from '@playwright/test';
import { ROUTES, invisibleContent, suppressInterruptions } from '../mobile/helpers';

/*
  The reduced-motion contract, on mobile.

  Two directions, both of which have to hold:

  - Suppressing motion must suppress *motion* — no autoplaying decorative
    video, no running animation loops.
  - Suppressing motion must never suppress *content*. This is the direction
    that regresses quietly: an entrance animation whose "before" state is
    `opacity: 0` hides the content outright if the reduced-motion branch is
    ever forgotten.
*/

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    // `reducedMotion` declared on a project's `use` block does *not* reach
    // the browser in this Playwright/engine combination — verified directly
    // by the guard test below, which failed with the project setting alone
    // and passes with this call. (tests/visual/pages.spec.ts documents the
    // same finding from the other direction: its own screenshots are
    // captured with motion running, despite the config asking for reduce.)
    //
    // Called before `goto` so the preference is in effect while the document
    // parses — Layout.astro's inline head script reads the media query
    // during parse to decide whether the reveal system engages at all, so
    // emulating it after navigation would be too late to matter.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await suppressInterruptions(page);
  });

  test('the preference is actually emulated', async ({ page }) => {
    // Guards the rest of this file from silently testing normal motion.
    await page.goto('/');
    const reduced = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(reduced).toBe(true);
  });

  for (const route of ROUTES) {
    test(`${route} — all content visible with no scrolling at all`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1200);

      // Nothing is reveal-gated under reduced motion, so this holds before a
      // single pixel of scrolling — no observer needs to have fired.
      await expect(page.locator('html')).not.toHaveClass(/reveal-js/);
      const invisible = await invisibleContent(page);
      expect(
        invisible,
        `content hidden under reduced motion on ${route}:\n${invisible.map((i) => `${i.cls} h=${i.height}`).join('\n')}`,
      ).toEqual([]);
    });
  }

  for (const route of ['/', '/oddfest', '/oddference']) {
    test(`${route} — video never autoplays, poster is the rendering`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('load');
      await page.evaluate(() =>
        document.querySelector('[data-video-stage]')?.scrollIntoView({ block: 'center' }),
      );
      await page.waitForTimeout(3500);

      const stages = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-video-stage]')].map((stage) => {
          const video = stage.querySelector('video') as HTMLVideoElement | null;
          const poster = stage.querySelector<HTMLElement>('[data-video-poster]');
          return {
            state: stage.getAttribute('data-video-state'),
            paused: video?.paused ?? true,
            // networkState 0 (NETWORK_EMPTY) / 3 (NETWORK_NO_SOURCE) both mean
            // nothing was fetched — reduced motion should not download video.
            networkState: video?.networkState ?? 0,
            currentSrc: video?.currentSrc ?? '',
            posterVisible: !!poster && parseFloat(getComputedStyle(poster).opacity) > 0.5,
          };
        }),
      );

      expect(stages.length).toBeGreaterThan(0);
      for (const s of stages) {
        expect(s.state, 'stage must stay in the poster state').toBe('poster');
        expect(s.paused, 'video must not be playing').toBe(true);
        expect(s.posterVisible, 'poster must be the visible layer').toBe(true);
        expect(s.currentSrc, 'no video file should be requested at all').toBe('');
      }
    });
  }

  test('the hero mosaic does not animate or swap', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    const first = await page.evaluate(() =>
      [...document.querySelectorAll('#heroMosaic .mosaic-cell img')].map((i) =>
        i.getAttribute('src'),
      ),
    );
    // Comfortably longer than the 1.6-2.2s swap cadence plus its 4s lead-in.
    await page.waitForTimeout(7000);
    const second = await page.evaluate(() =>
      [...document.querySelectorAll('#heroMosaic .mosaic-cell img')].map((i) =>
        i.getAttribute('src'),
      ),
    );
    expect(second, 'mosaic photos must not swap under reduced motion').toEqual(first);

    const animated = await page.evaluate(
      () =>
        [...document.querySelectorAll('#heroMosaic .mosaic-cell img')].filter(
          (i) => getComputedStyle(i).animationName !== 'none',
        ).length,
    );
    expect(animated, 'Ken Burns animations must not run under reduced motion').toBe(0);
  });
});
