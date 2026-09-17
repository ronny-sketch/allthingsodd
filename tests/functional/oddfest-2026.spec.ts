import { test, expect } from '@playwright/test';
import { suppressInterruptions } from '../mobile/helpers';

// The ODDfest 2026 thank-you page (2026-09-17), rebuilt from a standalone
// static file into a real route. These pin what the rebuild was for: it is a
// page of this site, its links go somewhere, it no longer reaches out to
// Flickr at runtime, and "Play the credits" still works — including the
// reduced-motion branch, where the page must never scroll itself.

const PAGE = '/oddfest-2026/';

test('the thank-you page is a site page with its credits and no dead ends', async ({ page }) => {
  const flickr: string[] = [];
  page.on('request', (r) => {
    if (/flickr\.com/.test(new URL(r.url()).hostname)) flickr.push(r.url());
  });
  await page.goto(PAGE);

  await expect(page).toHaveTitle(/^ODDfest 2026/);
  await expect(page.locator('nav').first()).toBeVisible();
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('You are the heroes of ODD.');

  await expect(page.locator('#credits .ty-roles dd', { hasText: 'Ronny Eriksson' })).toHaveCount(1);
  expect(await page.locator('#credits .ty-names li').count()).toBeGreaterThan(200);
  expect(await page.locator('#photos .photo-wall img').count()).toBeGreaterThan(0);

  // The headline figure is every different name in the credits, once.
  const names = await page.locator('#credits :is(.ty-roles dd, .ty-names li)').allTextContents();
  const unique = new Set(names.map((n) => n.toLowerCase().replace(/"/g, '').trim()));
  await expect(page.locator('[data-credited-count]')).toHaveText(String(unique.size));
  // 2027 was a June 2026 plan that has since changed; this page no longer
  // talks about it.
  await expect(page.locator('main')).not.toContainText('2027');

  // The old page's buttons went to "#", and its feedback form sent nothing.
  await expect(page.locator('main a[href="#"]')).toHaveCount(0);
  await expect(page.locator('main textarea')).toHaveCount(0);
  await expect(page.locator('a[href="/contact/?topic=oddfest_2026_feedback"]')).toHaveCount(1);

  // Photographs are local now; the runtime Flickr API call is gone. (The
  // outbound link to the photobank is a link, not a request.)
  expect(flickr).toEqual([]);
});

test('"Play the credits" plays the soundtrack and rolls the page until the reader scrolls', async ({
  page,
}) => {
  await suppressInterruptions(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const audio: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.mp3')) audio.push(r.url());
  });
  await page.goto(PAGE);

  const player = page.locator('[data-credits-player]');
  await expect(player).toBeHidden();
  expect(audio, 'the soundtrack must not load before it is asked for').toEqual([]);

  await page.locator('.space-hero a[href="#credits"]').click();
  await expect(player).toBeVisible();
  await expect(page.locator('#creditsToggle')).toHaveText('Pause the credits');
  const start = await page.evaluate(() => window.scrollY);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(start + 40);
  // WebKit fetches media in range requests, so "at least one", not one.
  expect(audio.length).toBeGreaterThan(0);

  await page.mouse.wheel(0, 120);
  await expect(page.locator('#creditsToggle')).toHaveText('Play the credits');
});

test('under reduced motion the link jumps to the credits and nothing scrolls by itself', async ({
  page,
}) => {
  await suppressInterruptions(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PAGE);

  await page.locator('.space-hero a[href="#credits"]').click();
  await expect(page.locator('[data-credits-player]')).toBeVisible();
  await expect(page.locator('#credits')).toBeInViewport();

  // Measured on the section, not scrollY: the site's smooth anchor scroll has
  // to finish first, and lazy images loading above can move scrollY through
  // scroll anchoring without the page moving on screen.
  const top = () =>
    page.evaluate(() => document.getElementById('credits')!.getBoundingClientRect().top);
  let settled = NaN;
  await expect
    .poll(
      async () => {
        const now = await top();
        const still = Math.abs(now - settled) < 1;
        settled = now;
        return still;
      },
      { intervals: [400] },
    )
    .toBe(true);
  await page.waitForTimeout(1000);
  expect(Math.abs((await top()) - settled)).toBeLessThan(1);
});
