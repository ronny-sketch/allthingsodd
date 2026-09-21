import { test, expect } from '@playwright/test';

// The hand-drawn cursor (src/scripts/cursor.ts) — the states a screenshot
// can't see: nothing before the first pointer event, exact tracking after
// it, native cursors kept over text entry and embeds, hidden on leaving the
// window, and no image re-requests while it animates. Runs on all three
// engines via the functional-* projects.

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => sessionStorage.setItem('oddNewsletterPopupSeen', '1'));
});

test('is invisible until a mouse moves, then sits on the pointer', async ({ page }) => {
  await page.goto('/');
  const cursor = page.locator('.cursor');
  await expect(cursor).toHaveCSS('opacity', '0');
  await expect(page.locator('body')).not.toHaveClass(/cursor-ready/);

  await page.mouse.move(300, 400);
  await expect(cursor).toHaveClass(/is-on/);
  await expect(page.locator('body')).toHaveClass(/cursor-ready/);
  await expect(page.locator('main')).toHaveCSS('cursor', 'none');
  const tip = await cursor.evaluate((el) => el.getBoundingClientRect());
  expect(Math.abs(tip.left - 300)).toBeLessThan(1);
  expect(Math.abs(tip.top - 400)).toBeLessThan(1);
});

test('warms over a link and yields to the native cursor over text entry', async ({ page }) => {
  await page.goto('/contact');
  await page.mouse.move(200, 300);
  const cursor = page.locator('.cursor');
  await expect(cursor).toHaveClass(/is-on/);

  await page.locator('.nav-links > a').first().hover();
  await expect(cursor).toHaveClass(/is-hot/);

  const field = page.locator('input[type="email"], input[type="text"], textarea').first();
  await field.scrollIntoViewIfNeeded();
  await field.hover();
  await expect(cursor).not.toHaveClass(/is-on/);
  await expect(field).not.toHaveCSS('cursor', 'none');
});

test('hides over an embedded document and when the pointer leaves the window', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:200px;width:300px;height:200px;z-index:5000';
    f.srcdoc = '<body style="margin:0;height:100vh"></body>';
    document.body.append(f);
  });
  await page.mouse.move(500, 100);
  const cursor = page.locator('.cursor');
  await expect(cursor).toHaveClass(/is-on/);
  await page.mouse.move(150, 300);
  await expect(cursor).not.toHaveClass(/is-on/);
  await expect(page.locator('iframe')).not.toHaveCSS('cursor', 'none');

  await page.mouse.move(500, 100);
  await expect(cursor).toHaveClass(/is-on/);
  await page.evaluate(() =>
    window.dispatchEvent(new PointerEvent('pointerout', { relatedTarget: null })),
  );
  await expect(cursor).not.toHaveClass(/is-on/);
});

test('animates its frames without requesting an image twice', async ({ page }) => {
  await page.goto('/');
  // Ten moves, not forty: on the CI Linux WebKit runner each synthetic
  // mouse.move is a slow round trip, and forty of them blew the 30s test
  // budget on both attempts of main's first run (2026-09-19). Each move
  // here travels well past the 28px a frame flip needs.
  for (let i = 0; i < 10; i++) await page.mouse.move(100 + i * 60, 300 + (i % 2) * 40);
  await page.waitForTimeout(300);
  const stats = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.cursor-arrow img'));
    const names = new Set(imgs.map((i) => i.currentSrc));
    const requests = performance
      .getEntriesByType('resource')
      .filter((e) => names.has(e.name)).length;
    return {
      frames: imgs.length,
      requests,
      on: imgs.filter((i) => i.classList.contains('on')).length,
    };
  });
  expect(stats.frames).toBe(8);
  expect(stats.on).toBe(1);
  expect(stats.requests).toBeLessThanOrEqual(8);
});

test('under reduced motion it tracks exactly but never leans, presses or flips', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (let i = 0; i < 10; i++) await page.mouse.move(100 + i * 60, 300 + (i % 3) * 30);
  await page.mouse.down();
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.cursor')!;
    const arrow = root.querySelector<HTMLElement>('.cursor-arrow')!;
    return {
      on: root.classList.contains('is-on'),
      rect: root.getBoundingClientRect().left,
      arrowTransform: arrow.style.transform,
      frame: Array.from(arrow.querySelectorAll('img')).findIndex((i) => i.classList.contains('on')),
    };
  });
  await page.mouse.up();
  expect(state.on).toBe(true);
  expect(Math.abs(state.rect - 640)).toBeLessThan(1);
  expect(state.arrowTransform).toBe('');
  expect(state.frame).toBe(0);
});
