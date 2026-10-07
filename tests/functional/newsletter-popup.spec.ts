import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// Timed newsletter popup — see NewsletterPopup.astro, newsletter-popup.ts,
// and the 2026-08-30 homepage revision brief, section 13. Each test gets a
// fresh browser context (Playwright's default), so localStorage starts
// empty every time — no manual cleanup needed between tests.
//
// Since 2026-10-05 the popup also stays away while the cookie banner is up
// (finding F14), so the tests about the popup itself start with a consent
// decision already stored, as for a returning visitor. The tests at the end
// of the file are about when it must not appear.

async function seedConsent(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem(
      'odd_consent_v2',
      JSON.stringify({
        necessary: true,
        preferences: false,
        statistics: false,
        marketing: false,
        decidedAt: new Date().toISOString(),
        v: 2,
      }),
    );
  });
}

test.beforeEach(async ({ context }, testInfo) => {
  if (!testInfo.title.startsWith('stays away')) await seedConsent(context);
});

test('newsletter popup appears ~15s after page load and can be closed via the close button', async ({
  page,
}) => {
  test.setTimeout(35_000);
  await page.goto('/');
  const popup = page.locator('#newsletterPopup');
  await expect(popup).toBeHidden();

  await expect(popup).toBeVisible({ timeout: 20_000 });
  await expect(popup).toHaveAttribute('role', 'dialog');
  await expect(popup).toHaveAttribute('aria-modal', 'true');

  await page.locator('#newsletterPopupClose').click();
  await expect(popup).toBeHidden();
});

test('newsletter popup closes on Escape and returns focus', async ({ page }) => {
  test.setTimeout(35_000);
  await page.goto('/');
  const popup = page.locator('#newsletterPopup');
  await expect(popup).toBeVisible({ timeout: 20_000 });

  // Escape should be handled while focus is inside the popup (the close
  // button receives focus on open — see newsletter-popup.ts's `open()`).
  await expect(page.locator('#newsletterPopupClose')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
});

test('newsletter popup does not reappear on a later navigation in the same session', async ({
  page,
}) => {
  test.setTimeout(50_000);
  await page.goto('/');
  const popup = page.locator('#newsletterPopup');
  await expect(popup).toBeVisible({ timeout: 20_000 });
  await page.locator('#newsletterPopupClose').click();
  await expect(popup).toBeHidden();

  // Navigate elsewhere and wait past the delay again — the stored flag
  // should keep it from showing a second time.
  await page.goto('/oddfest');
  await page.waitForTimeout(17_000);
  await expect(page.locator('#newsletterPopup')).toBeHidden();
});

// The 2026-10-07 bug: the flag lived in sessionStorage, so a new tab or a
// later visit showed the popup again to people who had already closed it.
// A second page in the same context is a new tab: its own sessionStorage,
// the same localStorage.
test('newsletter popup does not reappear in a new tab or a later visit', async ({
  page,
  context,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(20_000);
  await expect(page.locator('#newsletterPopup')).toBeVisible();
  await page.locator('#newsletterPopupClose').click();

  const later = await context.newPage();
  // page.clock is the context's clock, already installed for this tab too.
  await later.goto('/about/');
  await pastTheDelay(later);
});

test('newsletter popup never appears after a signup in the footer', async ({ page, context }) => {
  await page.route('**/api/newsletter', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: "You're on the list." }),
    }),
  );
  await page.clock.install();
  await page.goto('/');
  const footerForm = page.locator('#newsletterForm');
  await footerForm.locator('input[name="email"]').fill('test@example.com');
  await footerForm.locator('button[type="submit"]').click();
  await expect(page.locator('.foot-nl .nl-status')).toHaveText("You're on the list.");

  // Not on this page, whose timer was already running…
  await pastTheDelay(page);

  // …and not on the next visit either.
  const later = await context.newPage();
  // page.clock is the context's clock, already installed for this tab too.
  await later.goto('/about/');
  await pastTheDelay(later);
});

test('footer newsletter form still works and is the only persistent newsletter UI', async ({
  page,
}) => {
  await page.goto('/');

  // Not in the header.
  await expect(page.locator('nav .nav-buttons').getByText('Newsletter')).toHaveCount(0);

  // Present, once, in the footer, wired to the shared submission script.
  const footerForm = page.locator('#newsletterForm');
  await expect(footerForm).toBeVisible();
  await expect(footerForm).toHaveAttribute('data-newsletter-form', '');
  await expect(footerForm).toHaveAttribute('data-source', 'footer_newsletter');

  await page.route('**/api/newsletter', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: "You're on the list." }),
    });
  });

  await footerForm.locator('input[name="email"]').fill('test@example.com');
  await footerForm.locator('button[type="submit"]').click();
  await expect(page.locator('.foot-nl .nl-status')).toHaveText("You're on the list.");
});

test('mobile menu shows About/Media/Contact as direct items, no newsletter form', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#menuToggle').click();
  const overlay = page.locator('#menuOverlay');
  await expect(overlay).toHaveClass(/is-open/);

  for (const label of ['About', 'Media', 'Contact']) {
    await expect(overlay.locator('.menu-links a', { hasText: label })).toBeVisible();
  }
  // No grouped "Info" heading and no newsletter form in the mobile menu —
  // that UI now lives only in the footer (persistent) and the timed popup.
  await expect(overlay.getByText('Info', { exact: true })).toHaveCount(0);
  await expect(overlay.locator('form')).toHaveCount(0);
});

// --- When it must not appear (F14, 2026-10-05) ----------------------------
// The popup is a modal with its own focus trap. Each of these is a moment
// where something else already has the visitor's attention, or the focus.

async function pastTheDelay(page: Page) {
  await page.clock.fastForward(20_000);
  // The attribute, not toBeHidden(): open() drops `hidden` at once but only
  // turns visible two frames later, so toBeHidden() also passes on a popup
  // that is already opening.
  await expect(page.locator('#newsletterPopup')).toHaveAttribute('hidden', '');
}

test('stays away while the cookie banner is waiting for an answer', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const banner = page.locator('[data-consent-banner]');
  await expect(banner).toHaveClass(/is-visible/);
  await pastTheDelay(page);
  // The banner is still the thing in charge, and still works.
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect(banner).not.toHaveClass(/is-visible/);
  // Nothing was marked as seen: the next page can still show it.
  await page.goto('/about/');
  await page.clock.fastForward(20_000);
  await expect(page.locator('#newsletterPopup')).toBeVisible();
});

test('stays away while someone is typing in a field', async ({ page, context }) => {
  await seedConsent(context);
  await page.clock.install();
  await page.goto('/');
  await page.locator('#newsletterForm input[name="email"]').focus();
  await pastTheDelay(page);
});

test('stays away while a film is playing', async ({ page, context }) => {
  await seedConsent(context);
  await page.route('**/*.mp4', (route) => route.abort());
  await page.clock.install();
  await page.goto('/oddfest/');
  await page.locator('a.af-film').click();
  await expect(page.locator('#film-dialog')).toHaveJSProperty('open', true);
  await pastTheDelay(page);
});

test('stays away while the mobile menu is open', async ({ page, context }) => {
  await seedConsent(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto('/');
  await page.locator('#menuToggle').click();
  await expect(page.locator('#menuOverlay')).toHaveClass(/is-open/);
  await pastTheDelay(page);
});

for (const path of ['/tickets/', '/tickets/checkout/', '/tickets/confirmation/']) {
  test(`stays away during ticket buying: ${path}`, async ({ page, context }) => {
    await seedConsent(context);
    await page.route('**/api/tickets/**', (route) => route.abort());
    await page.clock.install();
    await page.goto(path);
    await pastTheDelay(page);
  });
}
