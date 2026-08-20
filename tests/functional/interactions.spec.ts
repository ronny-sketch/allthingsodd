import { test, expect } from '@playwright/test';

// Real interaction/navigation QA — distinct from tests/visual/pages.spec.ts,
// which only screenshots and checks for console errors. This file clicks
// things and asserts on what actually happens, across all three engines
// (chromium/firefox/webkit — see playwright.config.ts).

test('homepage loads with the right title and hero', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/ODD/);
  await expect(page.locator('h1.opening-line')).toBeVisible();
});

test('logo link returns to home from a subpage', async ({ page }) => {
  await page.goto('/oddfest');
  await page.locator('nav .mark').click();
  await expect(page).toHaveURL('/');
});

test('every internal nav link navigates to a real, matching page', async ({ page }) => {
  await page.goto('/');
  // Real DOM text is mixed-case ("About") — it only *renders* uppercase via
  // the Forta display font's glyph design, not CSS text-transform or content.
  const internalRoutes: [string, string][] = [
    ['About', '/about'],
    ['ODDfest', '/oddfest'],
    ['ODDference', '/oddference'],
    ['ODDagency', '/oddagency'],
  ];
  for (const [label, path] of internalRoutes) {
    await page.goto('/');
    await page.locator('.nav-links a', { hasText: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
    // The page we landed on should have exactly one real h1, not a broken/blank route.
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('ODDspace link is external, in a new tab, with rel=noreferrer', async ({ page }) => {
  await page.goto('/');
  const oddspace = page.locator('.nav-links a', { hasText: 'ODDspace' });
  await expect(oddspace).toHaveAttribute('href', 'https://www.oddspace.co');
  await expect(oddspace).toHaveAttribute('target', '_blank');
  await expect(oddspace).toHaveAttribute('rel', 'noreferrer');
});

test('mobile menu opens on click, closes on the close button', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#menuToggle');
  const overlay = page.locator('#menuOverlay');
  await expect(overlay).not.toHaveClass(/is-open/);

  await toggle.click();
  await expect(overlay).toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await page.locator('#menuClose').click();
  await expect(overlay).not.toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('mobile menu closes on Escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('#menuToggle').click();
  await expect(page.locator('#menuOverlay')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#menuOverlay')).not.toHaveClass(/is-open/);
});

test('mobile menu closes after clicking a link inside it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#menuToggle').click();
  await page.locator('.menu-links a', { hasText: 'ODDfest' }).click();
  await expect(page).toHaveURL(/\/oddfest\/?$/);
  await expect(page.locator('#menuOverlay')).not.toHaveClass(/is-open/);
});

test('404 route returns real 404 status and its link goes home', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response?.status()).toBe(404);
  await page.locator('a', { hasText: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1.opening-line')).toBeVisible();
});

test('footer social links are external with rel=noreferrer', async ({ page }) => {
  await page.goto('/');
  const socialLinks = page.locator('.footer-social a');
  const count = await socialLinks.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const link = socialLinks.nth(i);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^https:\/\//);
  }
});

test('subpage side rail renders at desktop width', async ({ page }) => {
  // The <820px hidden state is already covered by the mobile/tablet visual
  // regression baselines — this just confirms the desktop-visible case on
  // real browser engines, since these functional projects all run desktop
  // viewports (see playwright.config.ts).
  await page.goto('/oddfest');
  await expect(page.locator('.oddf-rail.left')).toBeVisible();
});
