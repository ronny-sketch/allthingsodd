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
  // One statement in two inks since 2026-09-19: the premise quiet, the point
  // loud, both inside the one h1.
  await expect(page.locator('h1')).toHaveText(
    'You are the heroes of ODD. An ODD thousand thank yous.',
  );

  await expect(page.locator('#credits .ty-names li', { hasText: 'Ronny Eriksson' })).toHaveCount(1);
  expect(await page.locator('#credits .ty-names li').count()).toBeGreaterThan(200);

  // Every list reads alphabetically, whichever order the content is stored in.
  for (const list of await page.locator('#credits .ty-names').all()) {
    const names = (await list.locator('li').allTextContents()).map((n) => n.trim());
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, 'fi', { sensitivity: 'base', numeric: true }),
    );
    expect(names, 'a credit list is out of alphabetical order').toEqual(sorted);
  }
  expect(await page.locator('#photos .photo-wall img').count()).toBeGreaterThan(0);

  // The headline figure is every different name in the credits, once.
  const names = await page.locator('#credits .ty-names li').allTextContents();
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

  // 2026-09-19: every credited name rises on its own line (the reveal hook
  // sits on the <li>, so the mobile reveal sweep covers each name); the
  // afterparty invitation links to the building, and the sign-off to the
  // new site. The date is content, not a fixture, so it is not pinned here.
  expect(await page.locator('#credits .ty-names > li.reveal').count()).toBeGreaterThan(200);
  await expect(page.locator('#afterparty a.pill')).toHaveAttribute('href', '/oddspace');
  await expect(page.locator('#invite-card .ty-invite-facts li')).toHaveCount(3);
  // The card is the films' closing frame, so the eyebrow, the ask and the
  // page's last word have to be inside it together — see
  // scripts/render-oddfest-2026-film.mjs.
  await expect(page.locator('#invite-card .eyebrow')).toHaveText('ODD is back');
  await expect(page.locator('#invite-card .ty-invite-title')).toHaveText("You're invited.");
  await expect(page.locator('#invite-card .ty-invite-closer')).toHaveText('Stay ODD.');
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

test('the roll is the length of the soundtrack and ends with it', async ({ page, browserName }) => {
  // Chromium only: this asserts on the audio element's own clock, and a
  // headless engine that never advances currentTime would instead exercise
  // the wall-clock fallback — correct behaviour, but an 85-second test.
  test.skip(browserName !== 'chromium', 'needs a browser that advances media time headlessly');
  await suppressInterruptions(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Play fast, so the whole roll fits in a test.
  await page.addInitScript(() => {
    const Native = window.Audio;
    window.Audio = function (src?: string) {
      const audio = new Native(src);
      audio.playbackRate = 12;
      (window as unknown as { __creditsAudio: HTMLAudioElement }).__creditsAudio = audio;
      return audio;
    } as unknown as typeof window.Audio;
  });
  await page.goto(PAGE);

  await page.locator('.space-hero a[href="#credits"]').click();

  // Both finish together: the page is at the bottom, the track is done, and
  // the control has reset itself.
  await expect(page.locator('#creditsToggle')).toHaveText('Play the credits', { timeout: 30_000 });
  const end = await page.evaluate(() => {
    const audio = (window as unknown as { __creditsAudio?: HTMLAudioElement }).__creditsAudio;
    return {
      atBottom: window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 4,
      played: audio ? audio.currentTime / audio.duration : 0,
    };
  });
  expect(end.atBottom, 'the roll stopped short of the end of the page').toBe(true);
  expect(end.played, 'the roll finished well before the track did').toBeGreaterThan(0.9);
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
