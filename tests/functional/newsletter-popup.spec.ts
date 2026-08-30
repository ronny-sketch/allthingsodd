import { test, expect } from '@playwright/test';

// Timed newsletter popup — see NewsletterPopup.astro, newsletter-popup.ts,
// and the 2026-08-30 homepage revision brief, section 13. Each test gets a
// fresh browser context (Playwright's default), so sessionStorage starts
// empty every time — no manual cleanup needed between tests.

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

  // Navigate elsewhere and wait past the delay again — sessionStorage
  // (shared across same-tab navigations, unlike a fresh browser context)
  // should keep it from showing a second time.
  await page.goto('/oddfest');
  await page.waitForTimeout(17_000);
  await expect(page.locator('#newsletterPopup')).toBeHidden();
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
