import { test, expect } from '@playwright/test';

// ODDstudio (2026-09-11) — the commercial facts this page exists to state,
// asserted on the rendered HTML.
//
// This page was built for one reason: ODDstudio is the single space inside
// ODDspace that the €150/month membership does NOT cover, and /oddspace had
// been saying "One membership. The whole space." A future copy edit that
// softens or drops that carve-out recreates the exact problem — a member
// finding out from an invoice — and no screenshot diff would flag it,
// because the page would still look fine. Hence assertions on the numbers
// and the relationship between them, not on layout.
//
// The private-number guard at the bottom is the other half: the source
// document these pages were written from is an internal house-rules doc that
// contains a personal mobile. It must not migrate onto a public page by
// someone pasting the doc in wholesale later.

const STUDIO = '/oddstudio/';
const SPACE = '/oddspace/';

test('the studio page states plainly that it is not in the membership', async ({ page }) => {
  await page.goto(STUDIO);

  const carveOut = page.locator('[data-studio-not-included]');
  await expect(carveOut).toBeVisible();

  const text = (await carveOut.textContent()) ?? '';
  // The two numbers that make the sentence mean anything.
  expect(text).toContain('€150');
  expect(text).toMatch(/not (part of|included)/i);
});

test('both rate cards are published, and members are cheaper than non-members', async ({
  page,
}) => {
  await page.goto(STUDIO);

  const memberRates = page.locator('.odst-rate-table', { hasText: 'ODDspace members' });
  const publicRates = page.locator('.odst-rate-table', { hasText: 'Without a membership' });

  await expect(memberRates).toBeVisible();
  await expect(publicRates).toBeVisible();

  // Kept apart on purpose — one merged table is how a non-member ends up
  // believing they can book at the member rate.
  await expect(memberRates).toContainText('€20');
  await expect(publicRates).toContainText('€30');

  // The member rate must never appear in the non-member table, or the
  // separation above is cosmetic.
  await expect(publicRates).not.toContainText('€20');

  // VAT + payment terms are a legal requirement on a published rate, not a
  // nicety — see the ODDstudio terms.
  await expect(page.locator('.odst-rates-note')).toContainText('VAT');
});

test('the monthly tier adds up to the two numbers it is composed of', async ({ page }) => {
  await page.goto(STUDIO);
  const pricing = page.locator('.odst-access-zone').first();
  await expect(pricing).toContainText('€250');
  // €150 ODDspace + €100 studio. If either half is edited without the total,
  // the page contradicts itself.
  await expect(pricing).toContainText('€150');
  await expect(pricing).toContainText('€100');
});

test('ODDspace carries the carve-out and routes to the studio page', async ({ page }) => {
  await page.goto(SPACE);

  const callout = page.locator('.odds-studio-callout');
  await expect(callout).toBeVisible();
  await expect(callout).toContainText('€150');
  await expect(callout).toContainText('not included');

  // The button Ronny asked for, and the card link beside it — both must
  // actually resolve, not just render.
  const calloutLink = callout.locator('a[href="/oddstudio"]');
  await expect(calloutLink).toBeVisible();

  await calloutLink.click();
  await expect(page).toHaveURL(/\/oddstudio\/?$/);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('ODDspace no longer claims the membership covers the whole space', async ({ page }) => {
  await page.goto(SPACE);
  const body = (await page.locator('body').textContent()) ?? '';
  // The exact sentence that was wrong before this pass.
  expect(body).not.toContain('One membership. The whole space.');
});

test('no private contact details from the internal house-rules doc are published', async ({
  page,
}) => {
  for (const route of [STUDIO, SPACE]) {
    await page.goto(route);
    const html = await page.content();
    // Jarkko's personal mobile, which is in the source document and must
    // stay there. Checked in both spaced and unspaced forms.
    expect(html).not.toContain('050 577 3999');
    expect(html).not.toContain('0505773999');
    // The key-box code is never in content, but assert the shape anyway so
    // a future "helpful" addition fails loudly instead of shipping.
    expect(html).not.toMatch(/key ?box code is \d+/i);
  }
});
