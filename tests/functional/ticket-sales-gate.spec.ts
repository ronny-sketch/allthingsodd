import { test, expect, type Page } from '@playwright/test';
import {
  salesEnabled,
  PUBLIC_HOSTS,
  STRIPE_PUBLISHABLE_KEY,
} from '../../src/scripts/tickets/config';

// The sale gate — see salesEnabled()'s comment in
// src/scripts/tickets/config.ts for the incident this exists to prevent.
//
// Two halves, and both are needed. The first asserts the rule itself against
// the host/key matrix, in Node, with no browser: that is the half that covers
// PRODUCTION, which no browser test in this repo can ever visit (every one of
// them runs against localhost, where a test-mode key is exactly right — which
// is precisely why the original defect shipped green). The second asserts what
// a visitor actually sees in each state.

test.describe('the rule', () => {
  const at = (hostname: string, search = '') => salesEnabled({ hostname, search });

  test('a test-mode key never offers a purchase on a public host', () => {
    // The real shipped key, not a fixture: if someone sets a live key, this
    // test stops being the one that matters and the next one takes over.
    test.skip(
      !STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_'),
      'the shipped key is no longer a test key — see the live-mode test below',
    );
    for (const host of PUBLIC_HOSTS) {
      expect(at(host), `${host} must not offer a purchase against a test-mode key`).toBe(false);
    }
  });

  test('a test-mode key still offers a purchase off the public hosts', () => {
    test.skip(!STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'shipped key is not a test key');
    // Local dev and CI. A test-mode purchase is a real purchase in test mode,
    // and that path has to stay exercisable.
    expect(at('localhost')).toBe(true);
    expect(at('127.0.0.1')).toBe(true);
  });

  test('?sales=closed closes the sale anywhere, and there is no switch that opens it', () => {
    test.skip(!STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'shipped key is not a test key');
    expect(at('localhost', '?sales=closed')).toBe(false);
    for (const host of PUBLIC_HOSTS) expect(at(host, '?sales=closed')).toBe(false);
    // The dangerous direction must not exist: no query value may turn a
    // public host with a test-mode key into an open sale.
    for (const search of ['?sales=open', '?sales=live', '?sales=1', '?sales=true']) {
      expect(at('allthingsodd.co', search), `${search} must not open a sale`).toBe(false);
    }
  });

  test('the production host is actually in the list the rule checks', () => {
    // The rule is only as good as this list. A refactor that empties it would
    // otherwise silently reopen the sale.
    expect(PUBLIC_HOSTS).toContain('allthingsodd.co');
    expect(PUBLIC_HOSTS).toContain('www.allthingsodd.co');
  });
});

// ---------------------------------------------------------------------------

const API_BASE = 'https://odd-field-guide.ronny-507.workers.dev';
const CATALOG = {
  ok: true,
  event: {
    slug: 'oddference-2027',
    name: 'ODDference 2027',
    currency: 'EUR',
    pricesIncludeTax: false,
  },
  ticketTypes: [
    {
      id: 'tt_blind_bird',
      slug: 'blind-bird',
      name: 'Blind Bird',
      description: 'Full access, early price.',
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

async function mockCatalog(page: Page) {
  await page.route(`${API_BASE}/api/tickets/catalog*`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }),
  );
}

test.describe('/tickets with the sale closed', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/tickets/?sales=closed');
    await page.waitForLoadState('load');
  });

  test('says so, and offers a route that actually works today', async ({ page }) => {
    const closed = page.locator('#tixClosed');
    await expect(closed).toBeVisible();
    await expect(closed).toContainText(/card payment isn't open yet/i);
    // An invoice is the one way to buy a ticket right now, so it has to be
    // here — a closed sale with no alternative is just a dead page.
    await expect(closed.locator('a[href^="mailto:hello@oddfest.co"]')).toBeVisible();
    // And a pre-purchase question must have somewhere to go.
    await expect(closed.locator('a[href="/contact/?topic=partnering"]')).toBeVisible();
  });

  test('offers no way at all to start a purchase', async ({ page }) => {
    await expect(page.locator('.tix-stepper')).toHaveCount(0);
    await expect(page.locator('#tixCheckoutBtn')).toHaveCount(0);
    await expect(page.locator('#tixSummary')).toBeHidden();
    await expect(page.locator('#tixMobileBar')).toBeHidden();
    // The word "buy" must not appear on a page that cannot sell. Scoped to
    // the page's own section — the shared nav/footer is not its business.
    expect(await page.locator('.tix-page').innerText()).not.toMatch(/\bbuy\b/i);
  });

  test('still publishes the real price, because that is the useful part', async ({ page }) => {
    const row = page.locator('.tix-row').first();
    await expect(row).toContainText('Blind Bird');
    // .tix-row-price wraps the "+ VAT 13.5%" span, so this is a containment
    // check and the VAT suffix is asserted separately below.
    await expect(row.locator('.tix-row-price')).toContainText('299');
    await expect(row.locator('.tix-row-price-vat')).toHaveText('+ VAT 13.5%');
    // "Not yet on sale" — not "sold out", not "sale ended". The tier is fine;
    // the checkout is what is not ready.
    await expect(row.locator('.tix-status-badge')).toHaveText('Not yet on sale');
  });

  test('a stale cart cannot smuggle anyone into checkout', async ({ page, context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('odd_tickets_cart_v1', JSON.stringify({ tt_blind_bird: 2 }));
      } catch {
        /* ignore */
      }
    });
    await page.goto('/tickets/checkout/?sales=closed');
    await page.waitForLoadState('load');
    await expect(page.locator('#tixcClosed')).toBeVisible();
    await expect(page.locator('#tixcLayout')).toBeHidden();
    await expect(page.locator('#tixcBuyerForm')).toBeHidden();
  });
});

test.describe('/tickets with the sale open', () => {
  // The notice is in the served HTML now, so the case that can break is the
  // one where it must go away. If storefront.ts ever stops hiding it, an open
  // sale tells every visitor it is not open — the failure the inversion
  // trades for, and the reason it is asserted rather than assumed.
  test('hides the not-yet-on-sale notice', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/tickets/');
    await page.waitForLoadState('load');

    // Localhost with a pk_test_ key is an open sale — see 'the rule' above.
    await expect(page.locator('#tixClosed')).toBeHidden();
    await expect(page.locator('.tix-stepper').first()).toBeVisible();
  });
});

test.describe('/oddference with the sale closed', () => {
  test('never promises a purchase the checkout cannot complete', async ({ page }) => {
    await page.route('**/api/tickets/catalog**', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }),
    );
    await page.goto('/oddference/?sales=closed');
    await page.locator('#tickets').scrollIntoViewIfNeeded();

    const card = page.locator('[data-ticket-slug="blind-bird"]');
    await expect(card.locator('.pricing-status')).toHaveText('Not yet on sale');
    await expect(card.locator('a.pill')).toHaveText('See ticket details');
    await expect(card.locator('a.pill')).not.toHaveText(/buy/i);
    // The badge states a sale deadline ("Available until 1 Nov 2026"). On a
    // sale that has not opened, that reads as "you can buy until then".
    await expect(card.locator('.pricing-badge')).toBeHidden();
    // The price is still the whole point of the card.
    expect((await card.locator('.pricing-price').textContent())?.replace(/[^0-9]/g, '')).toBe(
      '299',
    );
  });

  test('the no-JS fallback fails closed', async ({ browser }) => {
    // What a crawler and a reader with no JavaScript see: the server-rendered
    // content, with no catalogue sync to correct it. It must under-promise.
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/oddference/');
    const card = page.locator('[data-ticket-slug="blind-bird"]');
    await expect(card.locator('.pricing-status')).toHaveText('Not yet on sale');
    await expect(card.locator('a.pill')).toHaveText('See ticket details');
    await ctx.close();
  });

  test('/tickets tells a no-JS reader where the prices are', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/tickets/');
    // The store is client-rendered, so without JS it would otherwise sit on
    // "Loading tickets…" for ever.
    await expect(page.locator('.tix-noscript')).toContainText(/needs JavaScript/i);
    await expect(page.locator('.tix-noscript a[href="/oddference/#tickets"]')).toHaveCount(1);
    await ctx.close();
  });
});
