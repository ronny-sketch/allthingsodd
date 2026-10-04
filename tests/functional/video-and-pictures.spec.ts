import { test, expect, type Page } from '@playwright/test';

/*
  Home's "ODDfest 2026 in video and pictures" (VideoAndPictures.astro) and the
  film player behind it (film-player.ts), 2026-10-04.

  The rule worth a network assertion: a card only ever loads its short muted
  preview. A full film (30+ MB, with sound) is fetched when someone asks for
  it, and stops downloading when they close it.
*/

const SECTION = '.video-and-pictures';
const FILM = /-aftermovie\.mp4/;

async function load(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
    localStorage.setItem('odd_analytics_consent_v1', 'denied');
  });
  await page.goto('/');
  await page.locator(SECTION).scrollIntoViewIfNeeded();
}

test('the section has the title, the two films and the photo bank', async ({ page }) => {
  await load(page);
  const section = page.locator(SECTION);
  await expect(section.getByRole('heading', { level: 2 })).toHaveText(
    'ODDfest 2026 in video and pictures',
  );
  await expect(
    section.getByRole('link', { name: 'Watch ODDfest 2026 aftermovie' }),
  ).toHaveAttribute('href', '/video/oddfest-2026-aftermovie.mp4');
  await expect(
    section.getByRole('link', { name: 'Watch ODDference 2026 aftermovie' }),
  ).toHaveAttribute('href', '/video/oddference-2026-aftermovie.mp4');

  const bank = section.getByRole('link', { name: /Explore the photo bank/ });
  await expect(bank).toHaveAttribute('href', 'https://www.flickr.com/photos/204686183@N06/');
  await expect(bank).toHaveAttribute('target', '_blank');
  await expect(bank).toHaveAttribute('rel', 'noreferrer');
  await expect(section.locator('.vp-credit')).toHaveText('Photo: Elina Satova');
});

test('three equal columns on a desktop, one column on a phone', async ({ page }) => {
  await load(page);
  const boxes = async () =>
    page
      .locator(`${SECTION} .vp-card`)
      .evaluateAll((cards) =>
        cards.map((c) => c.getBoundingClientRect()).map((r) => [r.x, r.width]),
      );
  const wide = await boxes();
  expect(wide).toHaveLength(3);
  expect(new Set(wide.map(([x]) => Math.round(x))).size, 'side by side').toBe(3);
  for (const [, w] of wide) expect(Math.abs(w - wide[0][1])).toBeLessThan(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await boxes();
  expect(new Set(narrow.map(([x]) => Math.round(x))).size, 'stacked').toBe(1);
});

test('no film is requested until one is asked for, and closing stops it', async ({ page }) => {
  const films: string[] = [];
  page.on('request', (r) => {
    if (FILM.test(r.url())) films.push(r.url());
  });
  await load(page);
  await page.waitForTimeout(2500);
  expect(films, 'a card preview must never load the full film').toEqual([]);

  const link = page.getByRole('link', { name: 'Watch ODDfest 2026 aftermovie' });
  await link.click();
  const dialog = page.locator('#film-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog).toHaveAttribute('aria-label', 'Watch ODDfest 2026 aftermovie');
  const film = dialog.locator('video');
  await expect(film).toHaveAttribute('src', /\/video\/oddfest-2026-aftermovie\.mp4$/);
  await expect(film).toHaveAttribute('controls', '');
  expect(await film.evaluate((v: HTMLVideoElement) => v.muted), 'the film has sound').toBe(false);
  await expect.poll(() => films.length, 'asked for, so now it loads').toBeGreaterThan(0);

  // Every preview holds still while a film is open.
  const previewsPaused = () =>
    page
      .locator(`${SECTION} video[data-autoplay-video]`)
      .evaluateAll((vs) => vs.every((v) => (v as HTMLVideoElement).paused));
  expect(await previewsPaused()).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.getAttribute('src'))).toBeNull();
  await expect(link).toBeFocused();
});

test('the close button and the backdrop close the film too', async ({ page }) => {
  await load(page);
  const dialog = page.locator('#film-dialog');

  await page.getByRole('link', { name: 'Watch ODDference 2026 aftermovie' }).click();
  await expect(dialog).toHaveAttribute('open', '');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');

  await page.getByRole('link', { name: 'Watch ODDference 2026 aftermovie' }).click();
  await expect(dialog).toHaveAttribute('open', '');
  await page.mouse.click(5, 5);
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('the picture is part of the link', async ({ page }) => {
  await load(page);
  // The top left of the ODDfest card's picture, not its label. A raw mouse
  // click: the link's overlay covering the picture is the thing under test,
  // and locator.click() would refuse because of it.
  const box = await page.locator(`${SECTION} .vp-card`).first().locator('.vp-media').boundingBox();
  await page.mouse.click(box!.x + 40, box!.y + 40);
  await expect(page.locator('#film-dialog')).toHaveAttribute('open', '');
});

test('the drawn cursor moves into the film dialog and back', async ({ page }) => {
  await load(page);
  const parentOfCursor = () =>
    page.evaluate(() => {
      const c = document.querySelector('.cursor');
      return c?.parentElement?.id || c?.parentElement?.tagName || null;
    });
  await page.getByRole('link', { name: 'Watch ODDfest 2026 aftermovie' }).click();
  await expect.poll(parentOfCursor).toBe('film-dialog');
  await page.keyboard.press('Escape');
  await expect.poll(parentOfCursor).toBe('BODY');
});
