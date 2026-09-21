import type { Page } from '@playwright/test';
import { test, expect } from '../base';

// What must never reach Google, and what must stop when consent is withdrawn.
//
// The leak these tests exist for (found 2026-09-21): GA4's automatic
// page_view sends the full URL as `page_location`, and Stripe returns a buyer
// to /tickets/confirmation/?session_id=…&order_token=…. The order token is a
// bearer capability — it authorises reading an order's buyer details and
// reassigning its attendees — so anyone with read access to the GA4 property
// could lift live tokens out of the Pages report. The ticket events were all
// careful never to carry it; the page view carried it on every purchase.
//
// Asserted on the gtag command queue rather than on a network request,
// because that is where the parameter is decided, and because tests/base.ts
// deliberately aborts the loader so no real hit is ever sent.

const API_BASE = 'https://odd-field-guide.ronny-507.workers.dev';
const EVENT_SLUG = 'oddference-2027';
const LOG_KEY = '__odd_gtag_commands';

const CATALOG = {
  ok: true,
  event: { slug: EVENT_SLUG, name: 'ODDference 2027', currency: 'EUR', pricesIncludeTax: false },
  ticketTypes: [
    {
      id: 'tt_blind_bird',
      slug: 'blind-bird',
      name: 'Blind Bird',
      description: 'x',
      status: 'active',
      currency: 'EUR',
      displayPriceMinor: 29900,
      taxRateBps: 1350,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 10,
    },
  ],
};

/** Records every gtag() command — `config` included, which is the one the
 *  existing ticketing spec's helper deliberately ignores. */
async function captureGtag(page: Page, statistics: boolean) {
  await page.addInitScript(
    ({ logKey, allow }: { logKey: string; allow: boolean }) => {
      try {
        localStorage.setItem(
          'odd_consent_v2',
          JSON.stringify({
            necessary: true,
            preferences: false,
            statistics: allow,
            marketing: false,
            decidedAt: new Date().toISOString(),
            v: 2,
          }),
        );
      } catch {
        /* ignore */
      }
      const queue: unknown[] = [];
      queue.push = function (...args: unknown[]) {
        const call = args[0] as IArguments | undefined;
        if (call) {
          try {
            const prev = JSON.parse(sessionStorage.getItem(logKey) ?? '[]');
            prev.push([...(call as unknown as unknown[])]);
            sessionStorage.setItem(logKey, JSON.stringify(prev));
          } catch {
            /* ignore */
          }
        }
        return Array.prototype.push.apply(this, args);
      };
      window.dataLayer = queue;
    },
    { logKey: LOG_KEY, allow: statistics },
  );
}

async function gtagCommands(page: Page): Promise<unknown[][]> {
  return page.evaluate(
    (logKey: string) => JSON.parse(sessionStorage.getItem(logKey) ?? '[]'),
    LOG_KEY,
  ) as Promise<unknown[][]>;
}

test('the order token never reaches GA4 in page_location', async ({ page }) => {
  await captureGtag(page, true);
  // Any page will do, and a page with no scrubbing script of its own is the
  // honest test of the central sanitiser in scripts/analytics.ts: if the fix
  // only worked on /tickets/confirmation it would not be a fix.
  await page.goto('/contact/?order_token=leak-me-abc123&session_id=cs_test_leak&utm_source=news');
  await page.waitForLoadState('load');

  const config = (await gtagCommands(page)).find((c) => c[0] === 'config');
  expect(config, 'gtag config should have been queued with statistics consent').toBeTruthy();

  const params = config![2] as Record<string, unknown>;
  const pageLocation = String(params.page_location ?? '');
  expect(
    pageLocation,
    'page_location must be sent explicitly, not left to the address bar',
  ).not.toBe('');
  expect(pageLocation).not.toContain('leak-me-abc123');
  expect(pageLocation).not.toContain('order_token');
  expect(pageLocation).not.toContain('cs_test_leak');
  expect(pageLocation).not.toContain('session_id');
  // A campaign parameter is not a secret and must survive — stripping the
  // whole query string would quietly destroy every UTM report.
  expect(pageLocation).toContain('utm_source=news');

  // And nothing anywhere in the queue may carry it.
  expect(JSON.stringify(await gtagCommands(page))).not.toContain('leak-me-abc123');
});

test('the confirmation page takes the token out of the address bar', async ({ page }) => {
  await captureGtag(page, true);
  await page.route(`${API_BASE}/api/tickets/catalog*`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }),
  );
  await page.route(`${API_BASE}/api/tickets/order-status*`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'paid',
        eventId: EVENT_SLUG,
        orderId: 'ord_test_privacy',
        totalMinor: 33937,
        currency: 'EUR',
        tickets: [
          { ticketCode: 'T-PRIV-1', ticketTypeId: 'tt_blind_bird', attendeeAssigned: false },
        ],
      }),
    }),
  );

  await page.goto('/tickets/confirmation/?order_token=scrub-me-xyz789&session_id=cs_test_scrub');
  await expect(page.locator('h1')).toHaveText(/tickets are yours/i);

  // Gone from the URL, so it is out of browser history and out of the Referer
  // header of anything linked from this page.
  const url = new URL(page.url());
  expect(url.searchParams.get('order_token')).toBeNull();
  expect(url.searchParams.get('session_id')).toBeNull();
  expect(page.url()).not.toContain('scrub-me-xyz789');

  // But the order still resolved, and still resolves on a reload — the token
  // was persisted before being scrubbed. Losing the buyer's order to protect
  // their token would be a worse bug than the one being fixed.
  await page.reload();
  await expect(page.locator('h1')).toHaveText(/tickets are yours/i);
  await expect(page.locator('.tixf-ticket')).toHaveCount(1);
});

test('purchase reports the same item_id the rest of the funnel does', async ({ page }) => {
  // GA4 joins item-level funnels on item_id. view_item_list/add_to_cart/
  // begin_checkout all send the catalogue SLUG; purchase used to send the
  // raw ticket-type uuid, so no ticket could be followed from a list view to
  // a sale, and the item-level revenue columns were empty for want of a price.
  await captureGtag(page, true);
  await page.route(`${API_BASE}/api/tickets/catalog*`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }),
  );
  await page.route(`${API_BASE}/api/tickets/order-status*`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'paid',
        eventId: EVENT_SLUG,
        orderId: 'ord_test_items',
        totalMinor: 67874,
        currency: 'EUR',
        tickets: [
          { ticketCode: 'T-1', ticketTypeId: 'tt_blind_bird', attendeeAssigned: false },
          { ticketCode: 'T-2', ticketTypeId: 'tt_blind_bird', attendeeAssigned: false },
        ],
      }),
    }),
  );

  await page.goto('/tickets/confirmation/?order_token=items-token');
  await expect(page.locator('h1')).toHaveText(/tickets are yours/i);

  await expect
    .poll(async () => (await gtagCommands(page)).filter((c) => c[1] === 'purchase').length)
    .toBe(1);
  const purchase = (await gtagCommands(page)).find((c) => c[1] === 'purchase')!;
  const items = (purchase[2] as { items: Array<Record<string, unknown>> }).items;
  expect(items[0]).toMatchObject({
    item_id: 'blind-bird', // the slug, not tt_blind_bird
    item_name: 'Blind Bird',
    item_category: EVENT_SLUG,
    price: 299,
    quantity: 2,
  });
});

test('refusing statistics stores nothing for analytics, even on a paid order', async ({ page }) => {
  // firstReportOf() writes odd_tickets_purchase_reported_v1 to stop GA4
  // counting an order twice. It ran before any consent check, so a visitor
  // who declined statistics still had an analytics value written to their
  // device on every purchase — which is the thing ePrivacy 5(3) is about.
  await captureGtag(page, false);
  await page.route(`${API_BASE}/api/tickets/catalog*`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }),
  );
  await page.route(`${API_BASE}/api/tickets/order-status*`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'paid',
        eventId: EVENT_SLUG,
        orderId: 'ord_test_noconsent',
        totalMinor: 33937,
        currency: 'EUR',
        tickets: [{ ticketCode: 'T-NC-1', ticketTypeId: 'tt_blind_bird', attendeeAssigned: false }],
      }),
    }),
  );

  await page.goto('/tickets/confirmation/?order_token=no-consent-token');
  // The buyer still gets their tickets. Declining measurement is not
  // declining the thing they paid for.
  await expect(page.locator('h1')).toHaveText(/tickets are yours/i);
  await expect(page.locator('.tixf-ticket')).toHaveCount(1);

  expect(
    await page.evaluate(() => sessionStorage.getItem('odd_tickets_purchase_reported_v1')),
  ).toBeNull();
  expect((await gtagCommands(page)).filter((c) => c[1] === 'purchase')).toHaveLength(0);
});

test('withdrawing consent stops events within the same page view', async ({ page }) => {
  // gtag.js cannot be unloaded once fetched, so window.gtag stays a function
  // for the life of the page. Without a per-event check, a visitor who
  // accepted and then withdrew via the footer kept sending events until they
  // navigated.
  await captureGtag(page, true);
  await page.route(`${API_BASE}/api/tickets/catalog*`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }),
  );
  await page.goto('/tickets/');
  await page.waitForLoadState('load');

  await page.locator('[data-action="increase"]').first().click();
  await expect
    .poll(async () => (await gtagCommands(page)).filter((c) => c[1] === 'add_to_cart').length)
    .toBe(1);

  // Withdraw the way the footer's "Cookie settings" button does: clear the
  // stored decision.
  await page.evaluate(() => localStorage.removeItem('odd_consent_v2'));
  await page.locator('[data-action="increase"]').first().click();
  await page.waitForTimeout(300);

  expect(
    (await gtagCommands(page)).filter((c) => c[1] === 'add_to_cart'),
    'no further events after the stored decision was cleared',
  ).toHaveLength(1);
});
