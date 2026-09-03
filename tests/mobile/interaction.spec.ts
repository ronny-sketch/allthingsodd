import { test, expect } from '@playwright/test';
import { suppressInterruptions } from './helpers';

/*
  Touch interaction, navigation and the two interruptions, on a real phone
  viewport with motion enabled. The existing functional suite covers these on
  desktop engines at desktop widths; none of it runs where the mobile menu is
  the only navigation and a finger is the only pointer.
*/

test.describe('mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await suppressInterruptions(page);
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('menu opens, navigates, and closes', async ({ page }) => {
    const toggle = page.locator('#menuToggle');
    const overlay = page.locator('#menuOverlay');

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.tap();
    await expect(overlay).toHaveClass(/is-open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // Body scroll is locked while the overlay owns the screen.
    await expect(page.locator('body')).toHaveClass(/menu-open/);

    // Every link is reachable without the overlay itself scrolling — the
    // whole menu is meant to fit one screen at phone heights.
    const overflow = await overlay.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow, 'mobile menu should fit the viewport without scrolling').toBeLessThanOrEqual(
      2,
    );

    await page.locator('#menuClose').tap();
    await expect(overlay).not.toHaveClass(/is-open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  });

  test('Escape closes the menu and returns focus to the trigger', async ({ page }) => {
    await page.locator('#menuToggle').tap();
    await expect(page.locator('#menuOverlay')).toHaveClass(/is-open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#menuOverlay')).not.toHaveClass(/is-open/);
    await expect(page.locator('#menuToggle')).toBeFocused();
  });

  test('tapping a menu link navigates and closes the menu', async ({ page }) => {
    await page.locator('#menuToggle').tap();
    await page.locator('#menuOverlay .menu-links a[href="/oddfest"]').tap();
    // Trailing-slash-tolerant: whether a host serves /oddfest or /oddfest/ is
    // the server's choice (astro preview omits it, a plain static server
    // 301s to it), and this test is about the tap navigating — not about
    // which of the two forms the URL settles on.
    await page.waitForURL(/\/oddfest\/?$/);
    await expect(page.locator('#menuOverlay')).not.toHaveClass(/is-open/);
  });
});

test.describe('touch targets and card taps', () => {
  test.beforeEach(async ({ page }) => {
    await suppressInterruptions(page);
  });

  test('a program card navigates on the first tap', async ({ page }) => {
    // No hover-to-reveal-then-tap-to-follow two-step: one tap must go.
    await page.goto('/');
    await page.waitForLoadState('load');
    const card = page.locator('.four-card').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const href = await card.getAttribute('href');
    // A program card with no href would make the rest of this test
    // meaningless rather than failing usefully, so assert it first.
    expect(href, 'program card should be a real link').toBeTruthy();
    await card.tap();
    // Same trailing-slash tolerance as the menu-link test above.
    await page.waitForURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
  });

  test('primary buttons meet the 44px touch-target minimum', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    const pills = page.locator('.pill');
    const count = await pills.count();
    expect(count).toBeGreaterThan(0);
    const small: string[] = [];
    for (let i = 0; i < count; i++) {
      const pill = pills.nth(i);
      if (!(await pill.isVisible())) continue;
      const box = await pill.boundingBox();
      if (box && box.height < 44) {
        small.push(`"${(await pill.innerText()).trim()}" is ${Math.round(box.height)}px tall`);
      }
    }
    expect(small, `buttons under the 44px touch minimum:\n${small.join('\n')}`).toEqual([]);
  });

  test('no information is hidden behind hover on a touch device', async ({ page }) => {
    // (hover: none) must be what the browser reports, so the hover-only
    // enhancements this pass gated are genuinely inert here.
    await page.goto('/');
    const hoverNone = await page.evaluate(() => window.matchMedia('(hover: none)').matches);
    expect(hoverNone, 'this project should emulate a touch device').toBe(true);
  });
});

test.describe('interruptions fit the screen', () => {
  test('newsletter popup fits the viewport and is dismissible', async ({ page }) => {
    // Not suppressed here — this is the spec that exercises it.
    await page.addInitScript(() => localStorage.setItem('odd_analytics_consent_v1', 'denied'));
    await page.goto('/');
    await page.waitForLoadState('load');
    // Its own timer is 15s; open it the same way src/scripts/newsletter-popup.ts
    // does (clear the `hidden` attribute, then add `.is-open`) rather than
    // waiting it out.
    await page.evaluate(() => {
      for (const id of ['newsletterPopup', 'newsletterPopupBackdrop']) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.hidden = false;
        el.classList.add('is-open');
      }
    });
    await page.waitForTimeout(500);

    const popup = page.locator('.nl-popup');
    const box = await popup.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.width, 'popup wider than the screen').toBeLessThanOrEqual(viewport.width);
    expect(box!.height, 'popup taller than the screen').toBeLessThanOrEqual(viewport.height);
    expect(box!.x, 'popup starts off the left edge').toBeGreaterThanOrEqual(-1);
    expect(box!.y, 'popup starts above the top edge').toBeGreaterThanOrEqual(-1);
  });

  test('consent banner does not cover the page indefinitely', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    const banner = page.locator('.consent-banner');
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.width).toBeLessThanOrEqual(viewport.width);
    // Its actions must sit above the home-indicator area, not under it.
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await page
      .locator('.consent-banner button', { hasText: /accept/i })
      .first()
      .tap();
    await expect(banner).not.toBeVisible();
  });
});
