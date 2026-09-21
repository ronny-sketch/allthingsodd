import { test, expect, type Page } from '@playwright/test';

// Ticketing (/tickets, /tickets/checkout, /tickets/confirmation) — see
// ../../src/scripts/tickets/*.ts and
// ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md. None of these
// tests touch the real Growth OS Worker or Stripe: every backend call is
// intercepted with page.route() and answered with a fixed, deterministic
// response, per the "don't couple tests to live prod/Stripe state" rule —
// the storefront's real API target (src/scripts/api-base.ts's API_BASE) is a
// live production URL, so without mocking, these tests would either hit real
// production data or silently start passing/failing based on whatever the
// Growth OS Worker happens to be serving that day.
const API_BASE = 'https://odd-field-guide.ronny-507.workers.dev';
const EVENT_SLUG = 'oddference-2027';

const CATALOG_OK = {
  ok: true,
  event: { slug: EVENT_SLUG, name: 'ODDference 2027', currency: 'EUR' },
  ticketTypes: [
    {
      id: 'tt_blind_bird',
      slug: 'blind-bird',
      name: 'Blind Bird',
      description: 'Full access, early price.',
      status: 'active',
      currency: 'EUR',
      displayPriceMinor: 30000,
      maxPerOrder: 6,
      admissionsPerUnit: 1,
      benefits: ['Full-day access', 'Lunch included'],
      availableToPurchase: 42,
    },
  ],
};

async function mockCatalog(page: Page, body: unknown = CATALOG_OK, status = 200) {
  await page.route(`${API_BASE}/api/tickets/catalog*`, (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

/** Pre-seed granted consent and record every gtag event somewhere that
 *  survives a navigation.
 *
 *  Two reasons this is not just "accept the banner and read window.dataLayer":
 *  the confirmation page starts polling on load, so clicking the banner races
 *  `purchase` into a no-op; and `begin_checkout` is immediately followed by a
 *  real navigation to /tickets/checkout, which throws the dataLayer away
 *  before a test can read it. analytics.ts does `window.dataLayer ||= []`, so
 *  seeding the array here means the page reuses this one, push and all. */
const EVENT_LOG_KEY = '__odd_test_events';

async function grantConsentUpFront(page: Page) {
  await page.addInitScript((logKey) => {
    try {
      localStorage.setItem(
        'odd_consent_v2',
        JSON.stringify({
          necessary: true,
          preferences: true,
          statistics: true,
          marketing: true,
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
      if (call && call[0] === 'event') {
        try {
          const prev = JSON.parse(sessionStorage.getItem(logKey) ?? '[]');
          prev.push({ name: String(call[1] ?? ''), params: { ...((call[2] ?? {}) as object) } });
          sessionStorage.setItem(logKey, JSON.stringify(prev));
        } catch {
          /* ignore */
        }
      }
      return Array.prototype.push.apply(this, args);
    };
    window.dataLayer = queue;
  }, EVENT_LOG_KEY);

  // Block the real tag. The queued commands are what these tests read, and
  // letting gtag.js load would send test hits to the live GA4 property.
  await page.route('**googletagmanager.com/**', (route) => route.abort());
}

/** Every `gtag('event', ...)` recorded so far, across navigations. */
async function trackedEvents(
  page: Page,
): Promise<Array<{ name: string; params: Record<string, unknown> }>> {
  return page.evaluate(
    (logKey) => JSON.parse(sessionStorage.getItem(logKey) ?? '[]'),
    EVENT_LOG_KEY,
  );
}

async function clearTrackedEvents(page: Page) {
  await page.evaluate((logKey) => sessionStorage.removeItem(logKey), EVENT_LOG_KEY);
}

async function mockOrderStatus(page: Page, body: unknown, status = 200) {
  await page.route(`${API_BASE}/api/tickets/order-status*`, (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

// Same WebKit media-controls noise filter as tests/visual/pages.spec.ts.
const isWebkitMediaControlsNoise = (text: string) =>
  /Button failed to load, iconName = .*-placard/.test(text);

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isWebkitMediaControlsNoise(msg.text())) errors.push(msg.text());
  });
  return errors;
}

test.describe('/tickets — catalog', () => {
  test('active catalog renders a real ticket type and updates the cart on add', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await mockCatalog(page);
    await page.goto('/tickets');
    await page.waitForLoadState('load');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByText('Blind Bird')).toBeVisible();

    const increase = page.locator('[data-action="increase"]').first();
    await increase.click();
    await expect(page.locator('.tix-summary-total-row')).toBeVisible();

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('an ex-VAT price shows VAT added on top, matching what checkout charges', async ({
    page,
  }) => {
    // ODDference 2027 since 2026-09-14: €299 + VAT 13.5%. The Worker charges
    // 29900 + round(29900 × 13.5%) = 33937 per ticket, and the summary has
    // to show that same number, not the bare price.
    await mockCatalog(page, {
      ...CATALOG_OK,
      event: { ...CATALOG_OK.event, pricesIncludeTax: false },
      ticketTypes: [{ ...CATALOG_OK.ticketTypes[0], displayPriceMinor: 29900, taxRateBps: 1350 }],
    });
    await page.goto('/tickets');
    await page.waitForLoadState('load');

    await expect(page.locator('.tix-row-price-vat')).toHaveText('+ VAT 13.5%');
    await page.locator('[data-action="increase"]').first().click();

    // #tixSummary is display:none below 900px (the mobile sheet takes over),
    // so these read text rather than visibility.
    const summary = page.locator('#tixSummary');
    await expect(summary.locator('.tix-summary-vat')).toContainText('VAT 13.5%');
    await expect(summary.locator('.tix-summary-vat')).toContainText(/40[.,]37/);
    await expect(summary.locator('.tix-summary-total-row')).toContainText(/339[.,]37/);
    await expect(summary.locator('.tix-summary-vat-note')).toHaveCount(0);
  });

  test('backend unavailable shows an honest error state, not a silent blank page', async ({
    page,
  }) => {
    // No console-error assertion here on purpose — a deliberately aborted
    // request legitimately logs its own "Failed to load resource" browser
    // message; that's expected noise from this test's own setup, not an
    // application bug, so asserting on it would make the test fail for the
    // wrong reason. The real assertion is that the app degrades honestly.
    await page.route(`${API_BASE}/api/tickets/catalog*`, (route) => route.abort('failed'));
    await page.goto('/tickets');
    await page.waitForLoadState('load');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByText(/couldn't load tickets/i)).toBeVisible();
  });
});

test.describe('/tickets/checkout', () => {
  test('empty cart shows the empty-cart notice, not a broken buyer form', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/tickets/checkout');
    await page.waitForLoadState('load');

    await expect(page.locator('#tixcEmptyNotice')).toBeVisible();
    await expect(page.locator('#tixcLayout')).toBeHidden();

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('a real cart shows the buyer form with payment connected', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await mockCatalog(page);
    await page.addInitScript(
      (cart) => {
        localStorage.setItem('odd_tickets_cart_v1', JSON.stringify(cart));
      },
      { tt_blind_bird: 2 },
    );
    await page.goto('/tickets/checkout');
    await page.waitForLoadState('load');

    await expect(page.locator('#tixcLayout')).toBeVisible();
    // STRIPE_PUBLISHABLE_KEY carries a real pk_test_ value as of 2026-09-01
    // (see src/scripts/tickets/config.ts) — the "not connected yet" notice
    // only appears when that's null, so it stays hidden here. Nothing in
    // this test's flow (page load only, no form submit) triggers a real
    // Stripe.js network call — that only happens on buyer-form submit,
    // which this test doesn't do — so this stays hermetic per the file's
    // own "never touch real Stripe in tests" rule above.
    await expect(page.locator('#tixcNotConnected')).toBeHidden();

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('invoice-request form requires its own fields and builds a real mailto', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await mockCatalog(page);
    await page.addInitScript(
      (cart) => {
        localStorage.setItem('odd_tickets_cart_v1', JSON.stringify(cart));
      },
      { tt_blind_bird: 2 },
    );
    await page.goto('/tickets/checkout');
    await page.waitForLoadState('load');

    const form = page.locator('#tixcInvoiceForm');
    const submit = page.locator('#tixcInvoiceSubmit');
    await expect(form).toBeHidden();

    await page.locator('#tixcInvoiceToggle').click();
    await expect(form).toBeVisible();

    // Pre-filled from the real cart (2 x Blind Bird).
    await expect(page.locator('#tixc-inv-ticket')).toHaveValue('tt_blind_bird');
    await expect(page.locator('#tixc-inv-qty')).toHaveValue('2');

    // Required buyer fields aren't filled yet — the link stays disabled
    // rather than pointing at an incomplete request.
    await expect(submit).toHaveAttribute('aria-disabled', 'true');

    await page.locator('#tixc-inv-name').fill('Test Buyer');
    await page.locator('#tixc-inv-email').fill('buyer@example.com');
    await expect(submit).toHaveAttribute('aria-disabled', 'false');

    const href = await submit.getAttribute('href');
    expect(href).toMatch(/^mailto:ronny@oddfest\.co\?/);
    const decoded = decodeURIComponent(href ?? '');
    expect(decoded).toContain('Blind Bird');
    expect(decoded).toContain('Name: Test Buyer');
    expect(decoded).toContain('Email: buyer@example.com');
    expect(decoded).toContain('subject=ODDference 2027 — invoice request');

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('is noindex', async ({ page }) => {
    await page.goto('/tickets/checkout');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('/tickets/confirmation', () => {
  test('missing order token shows a safe "not found" state with exactly one heading', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/tickets/confirmation');
    await page.waitForLoadState('load');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(/couldn't find that order/i);

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('a paid order renders real tickets, QR codes, and exactly one heading', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // The confirmation page reads the catalog once, purely to turn ticket
    // type ids into readable names on GA4's purchase event. Cosmetic, and
    // wrapped in its own try/catch, but it is a real request and an
    // unmocked one reaches the live Worker and fails CORS from localhost.
    await mockCatalog(page);
    await mockOrderStatus(page, {
      ok: true,
      status: 'paid',
      eventId: EVENT_SLUG,
      totalMinor: 60000,
      currency: 'EUR',
      tickets: [
        {
          ticketCode: 'TEST-TICKET-CODE-1',
          ticketTypeId: 'tt_blind_bird',
          attendeeAssigned: false,
        },
        {
          ticketCode: 'TEST-TICKET-CODE-2',
          ticketTypeId: 'tt_blind_bird',
          attendeeAssigned: false,
        },
      ],
    });
    await page.goto('/tickets/confirmation/?order_token=test-token-123');
    await page.waitForLoadState('load');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(/tickets are yours/i);
    await expect(page.locator('.tixf-ticket')).toHaveCount(2);
    // QRCode.toDataURL resolves async — wait for the real <img> it inserts
    // rather than asserting immediately.
    await expect(page.locator('.tixf-ticket-qr img').first()).toBeVisible();

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('an expired order shows the failed state with exactly one heading', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await mockOrderStatus(page, {
      ok: true,
      status: 'expired',
      eventId: EVENT_SLUG,
      totalMinor: 30000,
      currency: 'EUR',
      tickets: [],
    });
    await page.goto('/tickets/confirmation/?order_token=test-token-expired');
    await page.waitForLoadState('load');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(/didn't go through/i);
    await expect(page.getByText(/expired before payment completed/i)).toBeVisible();

    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([]);
  });

  test('is noindex', async ({ page }) => {
    await page.goto('/tickets/confirmation');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

// GA4 ecommerce money path — added 2026-09-21 with the recommended-event
// remap (src/scripts/tickets/ecommerce.ts). These assert the three things
// that silently corrupt revenue reporting and are invisible in the UI:
// values must be major units, cart events must carry the change rather than
// the new total, and `purchase` must not fire twice for one order.
test.describe('GA4 ecommerce events', () => {
  test('cart events report the change, in major units', async ({ page }) => {
    await grantConsentUpFront(page);
    await mockCatalog(page); // Blind Bird, 30000 minor = EUR 300, tax included
    await page.goto('/tickets');
    await page.waitForLoadState('load');

    const increase = page.locator('[data-action="increase"]').first();
    await increase.click();
    await increase.click();
    await page.locator('[data-action="decrease"]').first().click();

    const events = await trackedEvents(page);
    const adds = events.filter((e) => e.name === 'add_to_cart');
    const removes = events.filter((e) => e.name === 'remove_from_cart');

    expect(adds).toHaveLength(2);
    expect(removes).toHaveLength(1);

    // Second click took the cart 1 -> 2. The event is still one unit, not two:
    // sending the absolute quantity is how a cart gets counted twice over.
    expect(adds[1].params).toMatchObject({ currency: 'EUR', value: 300 });
    expect((adds[1].params.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      item_id: 'blind-bird',
      item_name: 'Blind Bird',
      price: 300,
      quantity: 1,
    });
    expect(removes[0].params).toMatchObject({ currency: 'EUR', value: 300 });
  });

  test('begin_checkout carries the whole cart at the price checkout charges', async ({ page }) => {
    await grantConsentUpFront(page);
    await mockCatalog(page);
    // #tixSummary is display:none below 900px, where the mobile sheet takes
    // over, so the desktop checkout button is not clickable at the default
    // viewport — same constraint the VAT test documents above.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tickets');
    await page.waitForLoadState('load');

    const increase = page.locator('[data-action="increase"]').first();
    await increase.click();
    await increase.click();
    await page.locator('#tixSummary #tixCheckoutBtn').click();

    const begin = (await trackedEvents(page)).filter((e) => e.name === 'begin_checkout');
    expect(begin).toHaveLength(1);
    expect(begin[0].params).toMatchObject({ currency: 'EUR', value: 600 });
    expect((begin[0].params.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      item_id: 'blind-bird',
      quantity: 2,
    });
  });

  test('purchase reports real revenue once, and not again on reload', async ({ page }) => {
    await grantConsentUpFront(page);
    await mockCatalog(page);
    await mockOrderStatus(page, {
      ok: true,
      status: 'paid',
      eventId: EVENT_SLUG,
      orderId: 'ord_test_123',
      totalMinor: 60000,
      currency: 'EUR',
      tickets: [
        { ticketCode: 'T-1', ticketTypeId: 'tt_blind_bird', attendeeAssigned: false },
        { ticketCode: 'T-2', ticketTypeId: 'tt_blind_bird', attendeeAssigned: false },
      ],
    });

    await page.goto('/tickets/confirmation/?order_token=test-token-123');
    await expect(page.locator('h1')).toHaveText(/tickets are yours/i);

    await expect
      .poll(async () => (await trackedEvents(page)).filter((e) => e.name === 'purchase').length)
      .toBe(1);
    const purchase = (await trackedEvents(page)).find((e) => e.name === 'purchase')!;
    expect(purchase.params).toMatchObject({
      transaction_id: 'ord_test_123',
      currency: 'EUR',
      value: 600, // 60000 minor. Reporting 60000 here would be a 100x overstatement.
    });
    expect((purchase.params.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      // The catalogue SLUG, and a price. This assertion used to pin the raw
      // ticket-type uuid, which is what the event sent until 2026-09-21 —
      // and GA4 joins item-level funnels on item_id, so `purchase` was the
      // one step in the funnel no ticket could be followed into. Both sides
      // now come from itemFor(), the same helper the other four steps use.
      item_id: 'blind-bird',
      item_name: 'Blind Bird',
      price: 300,
      quantity: 2,
    });

    // GA4 does not reliably de-duplicate on transaction_id, so a reload would
    // otherwise double the reported revenue for this order. Clear the log,
    // not the guard: the guard living through the reload is the point.
    await clearTrackedEvents(page);
    await page.reload();
    await expect(page.locator('h1')).toHaveText(/tickets are yours/i);
    await page.waitForTimeout(500);
    expect((await trackedEvents(page)).filter((e) => e.name === 'purchase')).toHaveLength(0);
  });
});
