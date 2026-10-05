import { test, expect, type Page } from '@playwright/test';

// Reduced motion switched while a page is open (finding F12, 2026-10-05).
// mosaic.ts, hero-tilt.ts and warping-text.ts used to read the preference
// once at load, so turning it on mid-visit left their JS animation running,
// and turning it off never started them. These check what a visitor sees,
// not the media query. Project-level `reducedMotion` does not reliably reach
// the browser here (see hero-performance.spec.ts), hence emulateMedia.

async function mosaicSwaps(page: Page, ms: number): Promise<number> {
  return page.evaluate(
    (wait) =>
      new Promise<number>((resolve) => {
        const mosaic = document.getElementById('heroMosaic')!;
        let added = 0;
        const mo = new MutationObserver((records) => {
          for (const r of records) added += r.addedNodes.length;
        });
        mo.observe(mosaic, { childList: true, subtree: true });
        setTimeout(() => {
          mo.disconnect();
          resolve(added);
        }, wait);
      }),
    ms,
  );
}

test('hero mosaic swaps stop and resume with the motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.mosaic-cell img').first()).toBeVisible();
  expect(await mosaicSwaps(page, 5000), 'swaps run with motion allowed').toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(1200); // let a fade already under way finish
  expect(await mosaicSwaps(page, 4000), 'no swaps under reduced motion').toBe(0);
  await expect(page.locator('.mosaic-cell img').first()).toBeVisible();

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await mosaicSwaps(page, 4000), 'swaps resume').toBeGreaterThan(0);
});

test('hero mosaic starts swapping when reduced motion is turned off after load', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.mosaic-cell img').first()).toBeVisible();
  expect(await mosaicSwaps(page, 4000)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await mosaicSwaps(page, 5000)).toBeGreaterThan(0);
});

test('warping text falls back to the plain heading and back again', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/about/');
  const box = page.locator('[data-warping-text]').first();
  const fallback = box.locator('[data-warping-fallback]');
  const svg = box.locator('.warping-svg');
  await expect(fallback).toHaveClass(/warping-fallback--hidden/);
  await expect(svg).toBeVisible();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(fallback).not.toHaveClass(/warping-fallback--hidden/);
  await expect(fallback).toHaveCSS('opacity', '1');
  await expect(svg).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(fallback).toHaveClass(/warping-fallback--hidden/);
  await expect(svg).toBeVisible();
});

test('warping text is built when reduced motion is turned off after load', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/about/');
  const box = page.locator('[data-warping-text]').first();
  await expect(box.locator('[data-warping-fallback]')).toHaveCSS('opacity', '1');
  await expect(box.locator('.warping-svg')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(box.locator('.warping-svg')).toBeVisible();
});

test('hero tilt flattens when reduced motion is turned on', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer branch; the touch branch is scroll-linked');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const mosaic = page.locator('#heroMosaic');
  const hero = await page.locator('.hero').boundingBox();
  await page.mouse.move(hero!.x + hero!.width * 0.9, hero!.y + hero!.height * 0.2);
  await expect.poll(() => mosaic.evaluate((el) => el.style.transform)).toContain('rotate');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => mosaic.evaluate((el) => el.style.transform)).toBe('');
  await page.mouse.move(hero!.x + hero!.width * 0.1, hero!.y + hero!.height * 0.8);
  await page.waitForTimeout(300);
  expect(await mosaic.evaluate((el) => el.style.transform)).toBe('');
});
