import { test, expect } from '@playwright/test';
import { ROUTES, invisibleContent, scrollToEnd, suppressInterruptions } from './helpers';

/*
  The reveal system, with motion actually enabled.

  This is the coverage gap that let the original defect ship: `.reveal`
  content is only ever invisible while the animation is running, and every
  pre-existing project forced `prefers-reduced-motion: reduce`, under which
  motion.css keeps everything visible unconditionally. The suite could not
  have caught it.

  See src/scripts/reveal.ts for the two failure modes these assert against.
*/

test.describe('reveal system (normal motion)', () => {
  test.beforeEach(async ({ page }) => {
    await suppressInterruptions(page);
  });

  test('motion really is enabled in this project', async ({ page }) => {
    // Without this guard the whole file could silently pass by testing
    // reduced motion, where motion.css keeps every `.reveal` visible
    // unconditionally and none of the assertions below mean anything — which
    // is exactly how the original defect went unnoticed.
    await page.goto('/');
    const reduced = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(reduced, 'these projects must run with motion enabled').toBe(false);
    await expect(page.locator('html')).toHaveClass(/reveal-js/);
  });

  for (const route of ROUTES) {
    test(`${route} — nothing stays invisible after a real scroll`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(route);
      await page.waitForLoadState('load');
      await scrollToEnd(page);

      const stuck = await page.evaluate(() =>
        [...document.querySelectorAll('.reveal:not(.in)')]
          .filter((el) => el.getClientRects().length > 0)
          .map(
            (el) =>
              `${el.getAttribute('class')} (h=${Math.round(el.getBoundingClientRect().height)})`,
          ),
      );
      expect(stuck, `.reveal elements never revealed on ${route}:\n${stuck.join('\n')}`).toEqual(
        [],
      );

      const invisible = await invisibleContent(page);
      expect(
        invisible,
        `content left at opacity 0 on ${route}:\n${invisible.map((i) => `${i.cls} h=${i.height}`).join('\n')}`,
      ).toEqual([]);
    });
  }

  test('a reveal element taller than the viewport still reveals', async ({ page }) => {
    // The exact shape of failure mode 1: IntersectionObserver's ratio is
    // measured against the *target*, so a target several screens tall can
    // never reach a percentage threshold. /oddference's speaker grid and
    // /oddspace's showcase are the two real instances on this site — both
    // measured over 2600px against a phone viewport.
    for (const [route, selector] of [
      ['/oddference', '.person-grid'],
      ['/oddspace', '.space-showcase'],
    ] as const) {
      await page.goto(route);
      await page.waitForLoadState('load');

      const target = page.locator(selector).first();
      const box = await target.boundingBox();
      const viewport = page.viewportSize();
      expect(box, `${selector} should exist on ${route}`).not.toBeNull();
      expect(
        box!.height,
        `${selector} is the tall-target regression case — if it is no longer taller than the viewport this test has stopped testing anything`,
      ).toBeGreaterThan(viewport!.height);

      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await expect(target).toHaveClass(/\bin\b/);
      await expect(target).toHaveCSS('opacity', '1');
    }
  });

  test('reveal content survives the script failing to run', async ({ page }) => {
    // The progressive-enhancement half: `.reveal`'s hidden state is scoped to
    // html.reveal-js, and Layout.astro's inline head script drops that scope
    // if src/scripts/reveal.ts never reports ready. Simulated here by
    // removing the readiness flag the module sets, which is the observable
    // signature of "the module didn't run".
    await page.addInitScript(() => {
      const strip = () => {
        document.documentElement.removeAttribute('data-reveal-ready');
      };
      document.addEventListener('DOMContentLoaded', strip);
      window.addEventListener('load', strip);
    });
    await page.goto('/oddference');
    await page.waitForLoadState('load');
    // The inline backstop fires at 4s.
    await page.waitForTimeout(5000);

    await expect(page.locator('html')).not.toHaveClass(/reveal-js/);
    const invisible = await invisibleContent(page);
    expect(
      invisible,
      `content still hidden with the reveal module absent:\n${invisible.map((i) => i.cls).join('\n')}`,
    ).toEqual([]);
  });

  test('above-the-fold hero content is never gated on an observer', async ({ page }) => {
    // A hero is the page's first paint and its LCP candidate; it must be
    // visible without waiting for any scroll or observer callback.
    for (const route of ['/', '/oddfest', '/oddference', '/oddspace']) {
      await page.goto(route);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1500);
      const h1 = page.locator('h1').first();
      await expect(h1, `${route} h1 should be painted`).toBeVisible();
      const opacity = await h1.evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        let min = 1;
        while (node && node !== document.body) {
          min = Math.min(min, parseFloat(getComputedStyle(node).opacity));
          node = node.parentElement;
        }
        return min;
      });
      expect(opacity, `${route} h1 is transparent through an ancestor`).toBeGreaterThan(0.9);
    }
  });
});
