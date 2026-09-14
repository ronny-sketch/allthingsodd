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

function catalogBody(overrides: Record<string, unknown>[] = [], pricesIncludeTax = false) {
  const base = [
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
    {
      id: 'tt_early_bird',
      slug: 'early-bird',
      name: 'Early Bird',
      description: 'x',
      status: 'upcoming',
      currency: 'EUR',
      displayPriceMinor: 39900,
      taxRateBps: 1350,
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
      displayPriceMinor: 49900,
      taxRateBps: 1350,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 0,
    },
  ];
  const merged = base.map((tt, i) => ({ ...tt, ...(overrides[i] ?? {}) }));
  return JSON.stringify({
    ok: true,
    event: { slug: 'oddference-2027', name: 'ODDference 2027', currency: 'EUR', pricesIncludeTax },
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
  expectPrice(await blindBird.locator('.pricing-price').textContent(), '299');
  await expect(blindBird.locator('.pricing-price-note')).toHaveText('+ VAT 13.5%');
  await expect(blindBird.locator('a.pill')).toHaveText('Buy Blind Bird');
  await expect(blindBird.locator('a.pill')).toHaveClass(/pill-solid/);
  await expect(blindBird.locator('.pricing-badge')).toBeVisible();

  const early = page.locator('[data-ticket-slug="early-bird"]');
  await expect(early.locator('.pricing-status')).toHaveText('Not on sale yet');
  expectPrice(await early.locator('.pricing-price').textContent(), '399');
  await expect(early.locator('.pricing-badge')).toBeHidden();

  expectPrice(
    await page.locator('[data-ticket-slug="regular"] .pricing-price').textContent(),
    '499',
  );
});

test('the VAT note follows whether the catalog price includes VAT', async ({ page }) => {
  // A VAT-included catalog must not keep the content's "+ VAT" fallback —
  // that would tell the reader to add tax to a price that already has it.
  await page.route(CATALOG_ROUTE, (route) =>
    route.fulfill({ contentType: 'application/json', body: catalogBody([], true) }),
  );
  await page.goto('/oddference');
  await tickets(page);

  const blindBird = page.locator('[data-ticket-slug="blind-bird"]');
  await expect(blindBird.locator('.pricing-status')).toHaveText('On sale now');
  await expect(blindBird.locator('.pricing-price-note')).toBeHidden();
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

// The 2026-09-11 ticket-block pass. Two separate promises to a reader:
//   * the badge states a real deadline, not a sales opinion;
//   * a tier you cannot buy yet is legibly priced and visibly inert.
// Both are easy to regress silently — the badge text is content, and the
// locked state is toggled from a script — so they get assertions rather
// than a screenshot.
test('the badge on the live tier states the sale deadline', async ({ page }) => {
  await page.route(CATALOG_ROUTE, (route) =>
    route.fulfill({ contentType: 'application/json', body: catalogBody() }),
  );
  await page.goto('/oddference');
  await tickets(page);

  const badge = page.locator('[data-ticket-slug="blind-bird"] .pricing-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('Available until 1 Nov 2026');
  // The catalog has no field for this text, so the sync must leave it alone
  // rather than overwrite it with anything of its own.
  await expect(badge).not.toHaveText(/recommended/i);
});

test('an upcoming tier shows its real price and cannot be bought', async ({ page }) => {
  await page.route(CATALOG_ROUTE, (route) =>
    route.fulfill({ contentType: 'application/json', body: catalogBody() }),
  );
  await page.goto('/oddference');
  await tickets(page);

  for (const [slug, amount] of [
    ['early-bird', '399'],
    ['regular', '499'],
  ] as const) {
    const card = page.locator(`[data-ticket-slug="${slug}"]`);
    await expect(card).toHaveClass(/is-locked/);
    // The price is the whole reason these cards are on the page: a reader
    // has to be able to see what waiting costs them.
    await expect(card.locator('.pricing-price')).toBeVisible();
    expectPrice(await card.locator('.pricing-price').textContent(), amount);
    // Dimmed, but not to the point of being decorative. Polled rather than
    // read once: the card has just been scrolled into view, so the shared
    // `.reveal` transition is still running and a single read catches it
    // part-way up (measured at 0.04 on the first attempt at this). The
    // resting value is what the assertion is about.
    await expect
      .poll(async () => card.evaluate((el) => parseFloat(getComputedStyle(el).opacity)), {
        message: `${slug} should settle at its dimmed resting opacity`,
      })
      .toBeCloseTo(0.55, 2);
    // No usable route to checkout — hidden, out of the tab order, and
    // announced as disabled. Still in the DOM so the sync can restore it.
    const cta = card.locator('a.pill');
    await expect(cta).toHaveCount(1);
    await expect(cta).toBeHidden();
    await expect(cta).toHaveAttribute('aria-disabled', 'true');
    await expect(cta).toHaveAttribute('tabindex', '-1');
  }
});

test('the catalog opening a tier makes its button real again', async ({ page }) => {
  // The inverse of the test above, and the reason the anchor is hidden
  // rather than removed: nothing here may need a content edit or a redeploy
  // to start selling.
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

  const early = page.locator('[data-ticket-slug="early-bird"]');
  await expect(early).not.toHaveClass(/is-locked/);
  const cta = early.locator('a.pill');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText('Buy Early Bird');
  await expect(cta).not.toHaveAttribute('aria-disabled', 'true');
  await expect(cta).toHaveAttribute('href', '/tickets');

  // A closed tier is *not* the same as an upcoming one — it must stay at
  // full contrast, because "you missed it" is the thing the reader needs.
  const blindBird = page.locator('[data-ticket-slug="blind-bird"]');
  await expect(blindBird).not.toHaveClass(/is-locked/);
  await expect(blindBird.locator('a.pill')).toBeVisible();
});

test('an unreachable backend leaves an honest page, not a broken one', async ({ page }) => {
  await page.route(CATALOG_ROUTE, (route) => route.abort());
  await page.goto('/oddference');
  await tickets(page);

  // The server-rendered fallback is a complete, truthful ticket section —
  // this is why the sync is an enhancement and not the only source. It is
  // content, so it is the literal string an editor wrote, not Intl output.
  await expect(page.locator('[data-ticket-slug="blind-bird"] .pricing-price')).toHaveText('€299');
  await expect(page.locator('[data-ticket-slug="blind-bird"] .pricing-price-note')).toHaveText(
    '+ VAT 13.5%',
  );
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
    event: { pricesIncludeTax?: boolean };
    ticketTypes: { slug: string; displayPriceMinor: number; taxRateBps?: number }[];
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
    if (catalog.event.pricesIncludeTax === false && tt.taxRateBps) {
      await expect(
        card.locator('.pricing-price-note'),
        `${tt.slug}: page copy and ticket backend disagree about VAT`,
      ).toHaveText(`+ VAT ${tt.taxRateBps / 100}%`);
    }
  }
});
