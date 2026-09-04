import { test, expect, type Page } from '@playwright/test';

// The /oddference marketing page's ticket block must never be a second
// source of truth for price or sale state. On main @ 3a656fe it was: the
// page advertised Blind Bird at EUR 300 while GET /api/tickets/catalog — the
// price the storefront and Stripe actually use — said EUR 250. A green build,
// green lint and green screenshots all agreed, because none of them ever
// compared the two.
//
// These tests drive the sync against a mocked catalog so they assert
// behaviour, not the state of a third-party service on the day they run.

const CATALOG_ROUTE = '**/api/tickets/catalog**';

// Engines disagree about where Intl puts the euro sign for `en-FI`: Chromium
// and Firefox render "€250", WebKit renders "250 €". Both are that locale's
// business, and both pages get it from the same formatMinor(), so the
// marketing page and the storefront still agree inside any one browser —
// which is the invariant these tests exist to hold. Assert the amount, not
// the glyph order.
function expectPrice(text: string | null, amount: string) {
  expect((text ?? '').replace(/[^0-9]/g, '')).toBe(amount);
}

// The sync only runs once the ticket block is near the viewport (it is a long
// way below the fold and the request is cross-origin — see
// src/scripts/oddference-tickets.ts), so every test scrolls to it first.
async function tickets(page: Page) {
  await page.locator('#tickets').scrollIntoViewIfNeeded();
}

function catalogBody(overrides: Record<string, unknown>[] = []) {
  const base = [
    {
      id: 'tt_blind_bird',
      slug: 'blind-bird',
      name: 'Blind Bird',
      description: 'x',
      status: 'active',
      currency: 'EUR',
      displayPriceMinor: 25000,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 10,
    },
    {
      id: 'tt_early_bird',
      slug: 'early-bird',
      name: 'Early Bird',
      description: 'x',
      status: 'upcoming',
      currency: 'EUR',
      displayPriceMinor: 35000,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 0,
    },
    {
      id: 'tt_regular',
      slug: 'regular',
      name: 'Regular Ticket',
      description: 'x',
      status: 'upcoming',
      currency: 'EUR',
      displayPriceMinor: 45000,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 0,
    },
  ];
  const merged = base.map((tt, i) => ({ ...tt, ...(overrides[i] ?? {}) }));
  return JSON.stringify({
    ok: true,
    event: { slug: 'oddference-2027', name: 'ODDference 2027', currency: 'EUR' },
    ticketTypes: merged,
  });
}

test('ticket prices and states come from the catalog, not the page', async ({ page }) => {
  await page.route(CATALOG_ROUTE, (route) =>
    route.fulfill({ contentType: 'application/json', body: catalogBody() }),
  );
  await page.goto('/oddference');
  await tickets(page);

  const blindBird = page.locator('[data-ticket-slug="blind-bird"]');
  await expect(blindBird.locator('.pricing-status')).toHaveText('On sale now');
  expectPrice(await blindBird.locator('.pricing-price').textContent(), '250');
  await expect(blindBird.locator('a.pill')).toHaveText('Buy Blind Bird');
  await expect(blindBird.locator('a.pill')).toHaveClass(/pill-solid/);
  await expect(blindBird.locator('.pricing-badge')).toBeVisible();

  const early = page.locator('[data-ticket-slug="early-bird"]');
  await expect(early.locator('.pricing-status')).toHaveText('Not on sale yet');
  expectPrice(await early.locator('.pricing-price').textContent(), '350');
  await expect(early.locator('.pricing-badge')).toBeHidden();

  expectPrice(
    await page.locator('[data-ticket-slug="regular"] .pricing-price').textContent(),
    '450',
  );
});

test('the sale-phase boundary moves the conversion emphasis with it', async ({ page }) => {
  // Blind Bird has ended, Early Bird is live: the page must follow, with no
  // content edit and no redeploy.
  await page.route(CATALOG_ROUTE, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: catalogBody([
        { status: 'sale_ended', availableToPurchase: 0 },
        { status: 'active', availableToPurchase: 40 },
      ]),
    }),
  );
  await page.goto('/oddference');
  await tickets(page);

  await expect(page.locator('[data-ticket-slug="blind-bird"] .pricing-status')).toHaveText(
    'Sale closed',
  );
  await expect(page.locator('[data-ticket-slug="blind-bird"] .pricing-badge')).toBeHidden();

  const early = page.locator('[data-ticket-slug="early-bird"]');
  await expect(early.locator('.pricing-status')).toHaveText('On sale now');
  await expect(early.locator('a.pill')).toHaveText('Buy Early Bird');
  await expect(early.locator('.pricing-badge')).toBeVisible();
});

test('a sold-out active tier is never sold as available', async ({ page }) => {
  await page.route(CATALOG_ROUTE, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: catalogBody([{ status: 'active', availableToPurchase: 0 }]),
    }),
  );
  await page.goto('/oddference');
  await tickets(page);

  const blindBird = page.locator('[data-ticket-slug="blind-bird"]');
  await expect(blindBird.locator('.pricing-status')).toHaveText('Sold out');
  await expect(blindBird.locator('a.pill')).toHaveText('See tickets');
});

test('an unreachable backend leaves an honest page, not a broken one', async ({ page }) => {
  await page.route(CATALOG_ROUTE, (route) => route.abort());
  await page.goto('/oddference');
  await tickets(page);

  // The server-rendered fallback is a complete, truthful ticket section —
  // this is why the sync is an enhancement and not the only source. It is
  // content, so it is the literal string an editor wrote, not Intl output.
  await expect(page.locator('[data-ticket-slug="blind-bird"] .pricing-price')).toHaveText('€250');
  await expect(page.locator('[data-ticket-slug="blind-bird"] a.pill')).toBeVisible();
});

test('the build-time fallback still matches the live catalog', async ({ page, request }) => {
  // The one check that talks to the real backend. It cannot be a hard gate —
  // a third party being down is not this repository being broken — so it
  // annotates and skips rather than failing when the catalog is unreachable.
  // When it does run, it is the thing that would have caught the EUR 300
  // drift on the day it was introduced.
  const res = await request
    .get('https://odd-field-guide.ronny-507.workers.dev/api/tickets/catalog?event=oddference-2027')
    .catch(() => null);
  test.skip(!res || !res.ok(), 'ticket catalog unreachable from this machine');

  const catalog = (await res!.json()) as {
    ticketTypes: { slug: string; displayPriceMinor: number; currency: string }[];
  };

  await page.route(CATALOG_ROUTE, (route) => route.abort());
  await page.goto('/oddference');
  await tickets(page);

  for (const tt of catalog.ticketTypes) {
    const card = page.locator(`[data-ticket-slug="${tt.slug}"]`);
    if ((await card.count()) === 0) continue;
    const rendered = (await card.locator('.pricing-price').textContent()) ?? '';
    expect(
      rendered.replace(/[^0-9]/g, ''),
      `${tt.slug}: page copy and ticket backend disagree`,
    ).toBe(String(tt.displayPriceMinor / 100));
  }
});
