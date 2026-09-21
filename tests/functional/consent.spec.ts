import { test, expect, type Page } from '@playwright/test';

// The consent gate is the one part of this site whose failure mode is
// silent, legal, and invisible in a screenshot: if a future change loads
// gtag.js before the visitor accepts, nothing looks wrong and nothing
// throws. These tests assert on the *network*, not
// on the banner's appearance, because the request is the thing that would
// actually breach ePrivacy Article 5(3).
//
// See src/scripts/consent.ts for the store these exercise and
// src/scripts/consent-config.ts for what each category gates.

const GOOGLE_ANALYTICS = /googletagmanager\.com|google-analytics\.com/;

/** Records every request the page attempts, so a test can assert on what was
 *  requested rather than on what happened to succeed — a blocked or failed
 *  request still means the site tried, which is the breach. */
function trackRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

// Never let a test hit Google for real. Every assertion in this file is
// about whether the *request was attempted*, and page.on('request') fires
// for an aborted request just the same — so blocking costs these tests
// nothing and stops them writing into the live GA4 property.
//
// This is not hypothetical. Before it was added, the suite's own newsletter
// submission fired real newsletter_signup events on every run across every
// browser project: property 555204778 recorded 18 of them on 2026-09-21,
// its first day, against 7 in the previous 30 days of genuine traffic.
test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
});

/** Waits long enough for a gated request to have happened if it were going
 *  to. Deliberately not `waitForLoadState('networkidle')`: webkit never
 *  reaches idle on /about or /oddspace (confirmed — it times out at 30s on
 *  every run, while chromium and firefox settle), and every assertion these
 *  tests make about "nothing was requested" is a negative, which no load
 *  state can prove anyway. A bounded settle after `load` is both honest
 *  about that and stable across all three engines. */
async function settle(page: Page) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
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
  await settle(page);
  expect(requests.filter((url) => GOOGLE_ANALYTICS.test(url))).toEqual([]);
});

test('rejecting keeps analytics off, and is remembered on the next page', async ({ page }) => {
  const requests = trackRequests(page);
  await page.goto('/');
  await page.locator('#consentReject').click();
  await expect(page.locator('#consentBanner')).not.toBeVisible();

  await page.goto('/about');
  await settle(page);
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
  // The commands queued for gtag.js must be `arguments` objects, not arrays.
  // This is the exact defect that made GA4 collect nothing from 2026-08-28
  // to 2026-09-03: gtag.js skips Array entries in dataLayer without error,
  // so the ID was right, the script loaded, consent worked, and zero hits
  // were sent. Asserting on the shape rather than on a live /g/collect
  // request keeps this test offline-safe while still catching the bug.
  const queue = await page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) => ({
      isArray: Array.isArray(entry),
      command: String((entry as IArguments)[0] ?? ''),
    })),
  );
  expect(queue.length).toBeGreaterThan(0);
  expect(queue.map((e) => e.command)).toContain('config');
  expect(queue.filter((e) => e.isArray)).toEqual([]);
});

test('a newsletter signup cannot rewrite the session traffic source', async ({ page }) => {
  // GA4 reads source/medium/campaign on any event as traffic-source
  // attribution, so a form that labels itself with `source` retags the whole
  // session and every later event in it inherits the label. The newsletter
  // form did exactly that, and on 2026-09-20 22 of the 24 ticket-funnel
  // events in the property were attributed to a source called
  // "footer_newsletter" rather than to wherever those visitors came from.
  await page.route('**/api/newsletter', (route) =>
    route.fulfill({ json: { ok: true, message: 'Thanks!' } }),
  );
  await page.goto('/');
  await page.locator('#consentAccept').click();
  await expect.poll(() => page.evaluate(() => typeof window.gtag)).toBe('function');

  const form = page.locator('#newsletterForm');
  await form.locator('input[name="email"]').fill('nobody@example.com');
  await form.locator('button[type="submit"]').click();

  const params = await expect
    .poll(async () =>
      page.evaluate(() =>
        (window.dataLayer ?? [])
          .filter((e) => String((e as IArguments)[1] ?? '') === 'newsletter_signup')
          .map((e) => ({ ...((e as IArguments)[2] as object) })),
      ),
    )
    .toHaveLength(1)
    .then(() =>
      page.evaluate(() =>
        (window.dataLayer ?? [])
          .filter((e) => String((e as IArguments)[1] ?? '') === 'newsletter_signup')
          .map((e) => ({ ...((e as IArguments)[2] as object) })),
      ),
    );

  expect(params[0]).not.toHaveProperty('source');
  expect(params[0]).toHaveProperty('signup_source', 'footer_newsletter');
});

// Replaces the two Google Calendar tests this file carried until 2026-09-11,
// when /oddspace's consent-gated embed was replaced by a hand-kept list of
// events. The embed was the `preferences` category's only entry, so what is
// worth asserting now is the state the removal left behind: /oddspace must
// make no third-party embed request at all, and the banner must not keep
// asking about a category that no longer gates anything (consent-config.ts's
// togglableCategories() drops an empty category — this is the test that the
// mechanism actually fired, rather than leaving a dead toggle in a legal
// notice).
test('ODDspace embeds no third-party content, and the banner asks about none', async ({ page }) => {
  const requests = trackRequests(page);
  await page.goto('/oddspace');
  await settle(page);

  expect(
    requests.filter((url) => /calendar\.google\.com|\.google\.com\/calendar/.test(url)),
  ).toEqual([]);
  await expect(page.locator('[data-calendar-embed]')).toHaveCount(0);
  // Broader than the calendar on purpose: this page now embeds nothing at
  // all, and an iframe appearing here is exactly how a gated third party
  // would come back without anyone re-reading the declaration.
  await expect(page.locator('iframe')).toHaveCount(0);

  await page.goto('/');
  await expect(page.locator('#consentBanner')).toBeVisible();
  await page.locator('#consentCustomise').click();
  await expect(page.locator('#consentDetail')).toBeVisible();
  await expect(page.locator('#consent-preferences')).toHaveCount(0);
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
