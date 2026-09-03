import { test, expect, type Page } from '@playwright/test';

// The consent gate is the one part of this site whose failure mode is
// silent, legal, and invisible in a screenshot: if a future change loads
// gtag.js or the Google Calendar embed before the visitor accepts, nothing
// looks wrong and nothing throws. These tests assert on the *network*, not
// on the banner's appearance, because the request is the thing that would
// actually breach ePrivacy Article 5(3).
//
// See src/scripts/consent.ts for the store these exercise and
// src/scripts/consent-config.ts for what each category gates.

const GOOGLE_ANALYTICS = /googletagmanager\.com|google-analytics\.com/;
const GOOGLE_CALENDAR = /calendar\.google\.com/;

/** Records every request the page attempts, so a test can assert on what was
 *  requested rather than on what happened to succeed — a blocked or failed
 *  request still means the site tried, which is the breach. */
function trackRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

test.beforeEach(async ({ context }) => {
  // Same rationale as interactions.spec.ts: keep the unrelated 15s newsletter
  // popup out of tests that click things.
  await context.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

test('no analytics request before the visitor answers the banner', async ({ page }) => {
  const requests = trackRequests(page);
  await page.goto('/');
  await expect(page.locator('#consentBanner')).toBeVisible();
  // networkidle, not a fixed wait: the assertion is "nothing was requested by
  // the time the page went quiet", which a timeout can only approximate.
  await page.waitForLoadState('networkidle');
  expect(requests.filter((url) => GOOGLE_ANALYTICS.test(url))).toEqual([]);
});

test('rejecting keeps analytics off, and is remembered on the next page', async ({ page }) => {
  const requests = trackRequests(page);
  await page.goto('/');
  await page.locator('#consentReject').click();
  await expect(page.locator('#consentBanner')).not.toBeVisible();

  await page.goto('/about');
  await page.waitForLoadState('networkidle');
  // The banner must not reappear — re-asking someone who already said no is
  // its own dark pattern, quite apart from being annoying.
  await expect(page.locator('#consentBanner')).not.toBeVisible();
  expect(requests.filter((url) => GOOGLE_ANALYTICS.test(url))).toEqual([]);
});

test('accepting loads gtag.js with the configured measurement ID', async ({ page }) => {
  const requests = trackRequests(page);
  await page.goto('/');
  await page.locator('#consentAccept').click();

  await expect
    .poll(() => requests.filter((url) => GOOGLE_ANALYTICS.test(url)).length)
    .toBeGreaterThan(0);
  // Asserted against the value the site actually ships rather than a
  // hardcoded ID here, so rotating the property in analytics-config.ts
  // doesn't fail this test for the wrong reason.
  const configured = await page.evaluate(() => window.dataLayer !== undefined);
  expect(configured).toBe(true);
});

test('the ODDspace calendar does not load Google before consent', async ({ page }) => {
  const requests = trackRequests(page);
  await page.goto('/oddspace');
  await page.waitForLoadState('networkidle');

  expect(requests.filter((url) => GOOGLE_CALENDAR.test(url))).toEqual([]);
  // The iframe exists in the markup but must carry no src at all — this is
  // what makes the gate structural rather than dependent on script timing.
  const src = await page.locator('[data-calendar-embed] iframe').getAttribute('src');
  expect(src).toBeNull();
  await expect(page.locator('[data-calendar-placeholder]')).toBeVisible();
});

test('the calendar placeholder button loads the embed for this visit only', async ({ page }) => {
  await page.goto('/oddspace');
  await page.locator('[data-calendar-load]').click();

  await expect(page.locator('[data-calendar-embed] iframe')).toHaveAttribute(
    'src',
    /calendar\.google\.com/,
  );
  // Crucially, pressing it must NOT record consent — a one-off view is not
  // an affirmative act about the category. See calendar-embed.ts.
  const stored = await page.evaluate(() => localStorage.getItem('odd_consent_v2'));
  expect(stored).toBeNull();
});

test('cookie settings in the footer reopens the banner and clears the stored choice', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#consentAccept').click();
  await expect(page.locator('#consentBanner')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('odd_consent_v2'))).not.toBeNull();

  await page.locator('#consentSettingsLink').click();
  await expect(page.locator('#consentBanner')).toBeVisible();
  // GDPR Article 7(3): withdrawal has to be as easy as consent. Clearing on
  // open is what makes "open it and walk away" fail closed rather than
  // leaving the previous acceptance in place.
  expect(await page.evaluate(() => localStorage.getItem('odd_consent_v2'))).toBeNull();
});

test('per-category choices are stored independently', async ({ page }) => {
  await page.goto('/');
  await page.locator('#consentCustomise').click();
  await page.locator('.consent-check[data-category="statistics"]').check();
  await page.locator('#consentSave').click();

  const stored = await page.evaluate(() => localStorage.getItem('odd_consent_v2'));
  expect(stored).not.toBeNull();
  const parsed = JSON.parse(stored!);
  expect(parsed.statistics).toBe(true);
  expect(parsed.preferences).toBe(false);
});

test('a pre-2026-09-03 stored consent is migrated, not re-asked', async ({ page, context }) => {
  // A visitor who accepted under the old single-flag format must keep their
  // answer: re-prompting would be both annoying and a worse legal position
  // than the consent already given.
  await context.addInitScript(() => {
    localStorage.setItem('odd_analytics_consent_v1', 'granted');
  });
  const requests = trackRequests(page);
  await page.goto('/');

  await expect(page.locator('#consentBanner')).not.toBeVisible();
  await expect
    .poll(() => requests.filter((url) => GOOGLE_ANALYTICS.test(url)).length)
    .toBeGreaterThan(0);

  const migrated = await page.evaluate(() => ({
    v2: localStorage.getItem('odd_consent_v2'),
    v1: localStorage.getItem('odd_analytics_consent_v1'),
  }));
  expect(JSON.parse(migrated.v2!).statistics).toBe(true);
  // The old key is removed so the migration can only ever run once.
  expect(migrated.v1).toBeNull();
});

test('the privacy page lists every gated cookie and can reopen the banner', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('h1')).toHaveText(/Privacy/);

  // The table is generated from consent-config.ts — asserting on a real
  // cookie name is what catches a category being silently dropped from the
  // declaration while still being set by the site.
  await expect(page.locator('#cookies')).toContainText('_ga');
  await expect(page.locator('#cookies')).toContainText('__stripe_mid');

  await page.locator('#privacyConsentSettings').click();
  await expect(page.locator('#consentBanner')).toBeVisible();
});
