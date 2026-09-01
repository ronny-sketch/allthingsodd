import { test, expect } from '@playwright/test';

// Real interaction/navigation QA — distinct from tests/visual/pages.spec.ts,
// which only screenshots and checks for console errors. This file clicks
// things and asserts on what actually happens, across all three engines
// (chromium/firefox/webkit — see playwright.config.ts).

// Several tests here do multiple real page loads in sequence, which can run
// long enough in practice to cross the newsletter popup's real ~15s delay
// (src/scripts/newsletter-popup.ts) — an accessible modal popping up mid-test
// then correctly traps focus/blocks the background, which reads as a stuck
// click here even though the popup itself is working as designed. Pre-seed
// its "already seen this session" flag so this file's unrelated nav/interaction
// coverage doesn't depend on wall-clock timing; the popup's own behavior is
// covered by tests/functional/newsletter-popup.spec.ts.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

test('homepage loads with the right title and hero', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/ODD/);
  await expect(page.locator('h1.hero-headline')).toBeVisible();
});

test('logo link returns to home from a subpage', async ({ page }) => {
  await page.goto('/oddfest');
  await page.locator('nav .mark').click();
  await expect(page).toHaveURL('/');
});

test('every flat internal nav link navigates to a real, matching page', async ({ page }) => {
  await page.goto('/');
  const internalRoutes: [string, string][] = [
    ['ODDfest', '/oddfest'],
    ['ODDference', '/oddference'],
    ['ODDspace', '/oddspace'],
  ];
  for (const [label, path] of internalRoutes) {
    await page.goto('/');
    await page.locator('.nav-links > a', { hasText: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
    // The page we landed on should have exactly one real h1, not a broken/blank route.
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('"Info" nav dropdown reveals About/Media/Contact and each navigates correctly', async ({
  page,
}) => {
  await page.goto('/');
  const dropdown = page.locator('.nav-dropdown');
  const menu = dropdown.locator('.nav-dropdown-menu');
  await expect(menu).not.toBeVisible();

  // Real DOM text is mixed-case ("About") — it only *renders* uppercase via
  // the Forta display font's glyph design, not CSS text-transform or content.
  const children: [string, string][] = [
    ['About', '/about'],
    ['Media', '/media'],
    ['Contact', '/contact'],
  ];
  for (const [label, path] of children) {
    await page.goto('/');
    await page.locator('.nav-info-trigger').hover();
    await expect(menu).toBeVisible();
    await menu.locator('a', { hasText: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('"Info" nav dropdown is also reachable by keyboard (focus-within)', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.nav-dropdown-menu');
  await page.locator('.nav-info-trigger').focus();
  await expect(menu).toBeVisible();
});

test('"Info" trigger is a real button with no navigation destination of its own', async ({
  page,
}) => {
  // Requirement 7 — this used to be <a href="/about"> that happened to
  // also show a hover menu, so clicking "Info" navigated straight to About
  // instead of opening the panel. See Nav.astro's own comment.
  await page.goto('/');
  const trigger = page.locator('.nav-info-trigger');
  await expect(trigger).toHaveJSProperty('tagName', 'BUTTON');
  await expect(trigger).not.toHaveAttribute('href');
  await trigger.click();
  await expect(page).toHaveURL('/');
});

test('"Info" dropdown click-toggles, tracks aria-expanded, and closes on Escape/click-outside', async ({
  page,
}) => {
  await page.goto('/');
  const dropdown = page.locator('.nav-dropdown');
  const trigger = page.locator('.nav-info-trigger');
  const menu = page.locator('.nav-dropdown-menu');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(dropdown).toHaveClass(/is-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();

  // Click again toggles it back closed.
  await trigger.click();
  await expect(dropdown).not.toHaveClass(/is-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  // Escape closes it from the open state.
  await trigger.click();
  await expect(dropdown).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(dropdown).not.toHaveClass(/is-open/);

  // Clicking outside the dropdown closes it too.
  await trigger.click();
  await expect(dropdown).toHaveClass(/is-open/);
  await page.locator('main').click({ position: { x: 10, y: 10 } });
  await expect(dropdown).not.toHaveClass(/is-open/);
});

test('ODDspace is a real subpage, not an external link', async ({ page }) => {
  // ODDspace used to point at oddspace.co in a new tab — now a real page on
  // this site (see content.config.ts's oddspace template), same as
  // ODDfest/ODDference, so it gets the same same-tab, no-rel-noreferrer
  // treatment as any other internal nav link.
  await page.goto('/');
  const oddspace = page.locator('.nav-links a', { hasText: 'ODDspace' });
  await expect(oddspace).toHaveAttribute('href', '/oddspace');
  await expect(oddspace).not.toHaveAttribute('target', '_blank');
  await expect(oddspace).not.toHaveAttribute('rel', 'noreferrer');
});

test('mobile menu opens on click, closes on the close button', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#menuToggle');
  const overlay = page.locator('#menuOverlay');
  await expect(overlay).not.toHaveClass(/is-open/);

  // Correct from the very first paint, not just after the first toggle —
  // a screen reader shouldn't see an untagged control before any click.
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-controls', 'menuOverlay');
  await expect(overlay).toHaveAttribute('role', 'dialog');
  await expect(overlay).toHaveAttribute('aria-modal', 'true');

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

test('mobile menu manages focus: moves in on open, traps Tab, returns to the trigger on close', async ({
  page,
}) => {
  await page.goto('/');
  const toggle = page.locator('#menuToggle');
  const closeBtn = page.locator('#menuClose');
  await toggle.focus();
  await toggle.click();
  await expect(closeBtn).toBeFocused();

  // Background content becomes inert while the overlay is open — Tab can't
  // reach it, a screen reader can't read it. Nav is body's own first child.
  await expect(page.locator('body > nav')).toHaveAttribute('inert', '');

  await page.locator('#menuClose').click();
  await expect(toggle).toBeFocused();
  await expect(page.locator('body > nav')).not.toHaveAttribute('inert', '');
});

test('requirement 30: the fullscreen menu fits a normal laptop viewport with no scrolling', async ({
  page,
}) => {
  // 1440x800 is a common laptop browser-window size, not an extreme edge
  // case — this is exactly the height range that used to overflow (7 links
  // at the old flat 2.1-4.6rem/6.5vw sizing ran ~600-630px tall on their
  // own, before topbar/bottom chrome, on a viewport not much taller than
  // that). overflow-y:auto stays as the safety fallback for genuinely
  // extreme heights, not asserted here — see MobileMenu.astro's comment.
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  await page.locator('#menuToggle').click();
  const overlay = page.locator('#menuOverlay');
  await expect(overlay).toHaveClass(/is-open/);

  const { scrollHeight, clientHeight } = await overlay.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(
    scrollHeight,
    `menu content is ${scrollHeight}px tall, viewport-constrained overlay is ${clientHeight}px`,
  ).toBeLessThanOrEqual(clientHeight);
});

test('404 route returns real 404 status and its link goes home', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response?.status()).toBe(404);
  await page.locator('a', { hasText: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1.hero-headline')).toBeVisible();
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

test('FAQ accordion opens and closes on click (native details/summary)', async ({ page }) => {
  await page.goto('/oddfest');
  const firstItem = page.locator('.faq-item').first();
  await expect(firstItem).not.toHaveAttribute('open', '');
  await firstItem.locator('summary').click();
  await expect(firstItem).toHaveAttribute('open', '');
  await firstItem.locator('summary').click();
  await expect(firstItem).not.toHaveAttribute('open', '');
});

test('Work with ODD and Membership pages load with a real h1 and working nav', async ({ page }) => {
  for (const path of ['/work-with-odd', '/membership']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('ODDagency, Media and Contact are reachable even though they left primary nav', async ({
  page,
}) => {
  // The top nav is four items (ODDfest/ODDference/ODDspace/Info — see
  // docs/architecture.md#v2) — these three pages are still real, live
  // routes, just reached via the Info dropdown or in-content CTAs instead of
  // a top-level nav link. Confirms they still resolve correctly.
  for (const path of ['/oddagency', '/media', '/contact']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('requirement 11: ODDfest "How it works" is one real 01|02|03|04 row at desktop width', async ({
  page,
}) => {
  // 1280px, not 1024px — the container inside SubpageFrame's rails is
  // narrower than the raw viewport, and 1024px measures out to a real
  // squeeze below FeatureGrid's own 240px column-width floor (a graceful
  // 2x2 fallback there is correct, not a bug — see FeatureGrid.astro's
  // is-four-column comment for the measured numbers behind the 1200px
  // breakpoint). 1280px is comfortably above it.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/oddfest');
  const cards = page.locator('.oddf-grid.is-four-column > div');
  await expect(cards).toHaveCount(4);

  const tops = await cards.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().top)),
  );
  expect(new Set(tops).size, `card top offsets: ${tops.join(', ')}`).toBe(1);

  const widths = await cards.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().width)),
  );
  for (const w of widths) {
    expect(w, `column width ${w}px fell below the established 240px floor`).toBeGreaterThanOrEqual(
      240,
    );
  }
});

test.describe('ODDspace intent (?interest=oddspace&intent=...)', () => {
  for (const intent of ['membership', 'event']) {
    test(`${intent} deep link shows individual-friendly fields and sends intent to the Worker`, async ({
      page,
    }) => {
      let capturedBody: string | null = null;
      await page.route('**/api/business-enquiry', (route) => {
        capturedBody = route.request().postData();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, message: 'ok' }),
        });
      });

      await page.goto(`/work-with-odd?interest=oddspace&intent=${intent}#enquiry-form`);
      await expect(page.locator('#we-email-label')).toHaveText('Email');
      await expect(page.locator('#we-org')).not.toHaveAttribute('required', '');

      await page.locator('#we-name').fill('Test Person');
      await page.locator('#we-email').fill('test@example.com');
      await page.locator('#we-goal').fill('Testing intent payload');
      await page.locator('#workEnquiryForm button[type="submit"]').click();
      await expect
        .poll(() => capturedBody, { message: 'business-enquiry request never fired' })
        .not.toBeNull();

      const body = JSON.parse(capturedBody!);
      expect(body.interest).toBe('oddspace');
      expect(body.intent).toBe(intent);
    });
  }
});
