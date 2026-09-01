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

  test('a real cart shows the buyer form and an honest "payment not connected" state', async ({
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

    await expect(page.locator('#tixcLayout')).toBeVisible();
    // STRIPE_PUBLISHABLE_KEY ships null until Ronny provides a real test key
    // (see src/scripts/tickets/config.ts) — the honest "not connected yet"
    // state is the real, current, deterministic behavior, not a mock.
    await expect(page.locator('#tixcNotConnected')).toBeVisible();

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
    await page.goto('/tickets/confirmation?order_token=test-token-123');
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
    await page.goto('/tickets/confirmation?order_token=test-token-expired');
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
