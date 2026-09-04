import { test, expect, type Page } from '@playwright/test';

// The ODDspace Instagram wall, on both sides of its configuration switch.
//
// The feed is off unless PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID is set at build
// time (see src/scripts/oddspace-instagram-config.ts). Both states have a
// contract worth holding:
//
//   off — no gallery markup, no request to the provider, and no Behold line
//         on /privacy. A processor that is not running must not be disclosed
//         as if it were.
//   on  — the wall renders from the JSON feed, a provider outage degrades to
//         a quiet follow link rather than an empty grid, and nothing is
//         written to the visitor's device. That last one is the reason
//         Behold was chosen over Elfsight (which sets a cookie), so it is
//         asserted on the network/storage rather than trusted from docs.
//
// Which half runs is decided by the same environment variable the build
// reads, so connecting the account turns the "on" contract into a real gate
// with no test edit.
const FEED_CONFIGURED = Boolean(process.env.PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID?.trim());

const FEED_ROUTE = 'https://feeds.behold.so/**';

function feedBody(count = 6, showBranding = false) {
  return JSON.stringify({
    username: 'oddspace.co',
    showBranding,
    posts: Array.from({ length: count }, (_, i) => ({
      id: `post-${i}`,
      permalink: `https://www.instagram.com/p/post-${i}/`,
      timestamp: '2026-09-01T10:00:00+0000',
      mediaType: i === 2 ? 'CAROUSEL_ALBUM' : 'IMAGE',
      isReel: i === 4,
      prunedCaption: `A day at ODDspace, number ${i}`,
      colorPalette: { dominant: '120,110,100' },
      sizes: {
        small: { mediaUrl: `https://behold.pictures/small-${i}.jpg`, width: 400, height: 400 },
        medium: { mediaUrl: `https://behold.pictures/medium-${i}.jpg`, width: 700, height: 700 },
        large: { mediaUrl: `https://behold.pictures/large-${i}.jpg`, width: 1000, height: 1000 },
      },
    })),
  });
}

// Behold's CDN is not reachable with these fake paths; serving a real 1x1
// keeps the "every rendered image loads" invariant honest inside this file.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

async function stubImages(page: Page) {
  await page.route('https://behold.pictures/**', (route) =>
    route.fulfill({ contentType: 'image/gif', body: PIXEL }),
  );
}

test.describe('feed not configured', () => {
  test.skip(FEED_CONFIGURED, 'a feed id is configured for this build');

  test('ships no gallery, no provider request and no provider disclosure', async ({
    page,
    request,
  }) => {
    const providerRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('behold')) providerRequests.push(r.url());
    });

    await page.goto('/oddspace');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page.locator('[data-instagram-gallery]')).toHaveCount(0);
    expect(providerRequests, 'requested the provider with no feed configured').toEqual([]);

    // The calendar chapter it belongs under must be untouched either way.
    await expect(page.locator('[data-calendar-embed]')).toHaveCount(1);

    const privacy = await (await request.get('/privacy')).text();
    expect(privacy, '/privacy lists a processor this build never contacts').not.toContain('Behold');
  });
});

test.describe('feed configured', () => {
  test.skip(!FEED_CONFIGURED, 'no feed id configured for this build');

  test('renders the wall from the feed, and discloses the processor', async ({ page, request }) => {
    await stubImages(page);
    await page.route(FEED_ROUTE, (route) =>
      route.fulfill({ contentType: 'application/json', body: feedBody() }),
    );

    await page.goto('/oddspace');
    const gallery = page.locator('[data-instagram-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute('data-state', 'loaded');
    await expect(gallery.locator('.ig-tile')).toHaveCount(6);

    const firstTile = gallery.locator('.ig-tile').first();
    await expect(firstTile).toHaveAttribute('href', 'https://www.instagram.com/p/post-0/');
    // The link carries the accessible name; the image inside is decorative,
    // so a screen reader does not read the caption twice.
    await expect(firstTile).toHaveAttribute('aria-label', /A day at ODDspace/);
    await expect(firstTile.locator('img')).toHaveAttribute('alt', '');
    await expect(firstTile.locator('img')).toHaveAttribute('loading', 'lazy');

    // Reels show poster media. No <video> is ever created in the page.
    await expect(gallery.locator('video')).toHaveCount(0);

    const privacy = await (await request.get('/privacy')).text();
    expect(privacy, '/privacy must name the processor once it is live').toContain('Behold');
  });

  test('costs the visitor no cookies and no stored data', async ({ page, context }) => {
    await stubImages(page);
    await page.route(FEED_ROUTE, (route) =>
      route.fulfill({ contentType: 'application/json', body: feedBody() }),
    );

    await page.goto('/oddspace');
    await page.locator('[data-instagram-gallery]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-instagram-gallery]')).toHaveAttribute('data-state', 'loaded');

    const cookies = await context.cookies();
    expect(
      cookies.filter((c) => !c.name.startsWith('__stripe')),
      'the gallery set a cookie — it must be declared and consent-gated if so',
    ).toEqual([]);

    const stored = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(stored.local.filter((k) => /behold|instagram|ig_/i.test(k))).toEqual([]);
    expect(stored.session.filter((k) => /behold|instagram|ig_/i.test(k))).toEqual([]);
  });

  test('waits until it is near the viewport before requesting anything', async ({ page }) => {
    await stubImages(page);
    let feedRequests = 0;
    await page.route(FEED_ROUTE, (route) => {
      feedRequests += 1;
      return route.fulfill({ contentType: 'application/json', body: feedBody() });
    });

    await page.goto('/oddspace');
    await page.waitForLoadState('load');
    expect(feedRequests, 'the below-the-fold feed loaded on first paint').toBe(0);

    await page.locator('[data-instagram-gallery]').scrollIntoViewIfNeeded();
    await expect.poll(() => feedRequests).toBe(1);
  });

  test('a provider outage degrades to a quiet follow link', async ({ page }) => {
    await page.route(FEED_ROUTE, (route) => route.abort());
    const consoleErrors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

    await page.goto('/oddspace');
    const gallery = page.locator('[data-instagram-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute('data-state', 'unavailable');
    await expect(gallery.locator('.ig-grid')).toBeHidden();
    await expect(gallery.locator('.ig-unavailable')).toBeVisible();
    await expect(gallery.locator('.ig-follow')).toBeVisible();

    // The rest of the chapter keeps working.
    await expect(page.locator('[data-calendar-embed]')).toBeVisible();
    // Each engine narrates a dead cross-origin request in its own words
    // (Chromium: "Failed to load resource", Firefox: "Cross-Origin Request
    // Blocked ... CORS request did not succeed"). None of that is
    // suppressible from a page, and none of it is what this asserts. What
    // must not appear is an error *from this site's code* — an uncaught
    // rejection or a console.error — because that is the thing a visitor's
    // console, and the visual suite's per-route console check, would
    // rightly hold against us.
    const ourErrors = consoleErrors.filter(
      (t) =>
        !/Failed to load resource|Cross-Origin Request Blocked|CORS request did not succeed|NetworkError|net::ERR/i.test(
          t,
        ),
    );
    expect(ourErrors, 'a third-party outage must not log an error of our own').toEqual([]);
  });

  test('a short feed leaves no empty tiles behind', async ({ page }) => {
    await stubImages(page);
    await page.route(FEED_ROUTE, (route) =>
      route.fulfill({ contentType: 'application/json', body: feedBody(3) }),
    );

    await page.goto('/oddspace');
    const gallery = page.locator('[data-instagram-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute('data-state', 'loaded');
    await expect(gallery.locator('.ig-tile')).toHaveCount(3);
  });

  test("honours the provider's own branding flag", async ({ page }) => {
    await stubImages(page);
    await page.route(FEED_ROUTE, (route) =>
      route.fulfill({ contentType: 'application/json', body: feedBody(6, true) }),
    );

    await page.goto('/oddspace');
    const gallery = page.locator('[data-instagram-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator('.ig-credit')).toBeVisible();
  });

  test('does not shift the page when the photographs arrive', async ({ page }) => {
    await stubImages(page);
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route(FEED_ROUTE, async (route) => {
      await held;
      await route.fulfill({ contentType: 'application/json', body: feedBody() });
    });

    await page.goto('/oddspace');
    const gallery = page.locator('[data-instagram-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const before = await gallery.boundingBox();
    release();
    await expect(gallery).toHaveAttribute('data-state', 'loaded');
    await page.waitForTimeout(300);
    const after = await gallery.boundingBox();

    // The tiles are rendered at their final size before any image exists, so
    // filling them must not change the section's height.
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(2);
  });
});
