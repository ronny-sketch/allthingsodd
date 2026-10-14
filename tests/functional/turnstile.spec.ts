import { test, expect } from '../base';
import type { Page } from '@playwright/test';

// src/scripts/turnstile.ts against a stand-in for Cloudflare's api.js. The
// token the widget hands over must reach the Worker as X-Turnstile-Token,
// and each submit must ask for a new one: tokens are single-use, so a second
// message sent with the first token would be refused.

const SUBMIT = '**/api/contact';

async function sendMessage(page: Page) {
  const sent = page.waitForRequest(SUBMIT);
  await page.fill('#cf-name', 'Test Person');
  await page.fill('#cf-email', 'test@example.com');
  await page.fill('#cf-message', 'Hello');
  await page.click('#contactForm button[type="submit"]');
  const request = await sent;
  await expect(page.locator('#contactForm button[type="submit"]')).toBeEnabled();
  return request.headers()['x-turnstile-token'];
}

test.beforeEach(async ({ page }) => {
  await page.route(SUBMIT, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Thanks — test.' }),
    }),
  );
});

test('every submit carries a fresh Turnstile token', async ({ page }) => {
  await page.addInitScript(() => {
    let issued = 0;
    const callbacks = new Map<string, (token: string) => void>();
    (window as unknown as { turnstile: unknown }).turnstile = {
      render(_el: HTMLElement, options: { callback: (token: string) => void }) {
        const id = `widget-${callbacks.size}`;
        callbacks.set(id, options.callback);
        return id;
      },
      reset() {},
      execute(id: string) {
        setTimeout(() => callbacks.get(id)?.(`token-${++issued}`), 0);
      },
    };
  });
  await page.goto('/contact/');
  await expect(page.locator('#contactForm')).toHaveAttribute('data-ready', 'true');

  expect(await sendMessage(page)).toBe('token-1');
  expect(await sendMessage(page)).toBe('token-2');
});

test('the form still sends when Turnstile cannot load', async ({ page }) => {
  // tests/base.ts refuses challenges.cloudflare.com, as an ad blocker might.
  // The message goes without a token and the Worker answers for itself.
  await page.goto('/contact/');
  await expect(page.locator('#contactForm')).toHaveAttribute('data-ready', 'true');

  expect(await sendMessage(page)).toBeUndefined();
  await expect(page.locator('#contactForm .form-status')).toContainText('Thanks');
});
