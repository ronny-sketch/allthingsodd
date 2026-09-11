import { test, expect } from '@playwright/test';

// The two ODDspace conversion journeys (2026-09-11): /oddspace/membership and
// /oddspace/venue. Both were asked for so that someone can decide, or plan an
// event, without having to write to us first — and both are only allowed to
// do that with facts this site can actually stand behind.
//
// What these tests guard is therefore two things at once: that the pages
// still carry the commercial facts a visitor came for, and that they still
// refuse to publish the venue specifications nobody has verified. The second
// half matters more. The internal rental guide carries capacities marked
// "TBD — confirm before publishing externally" and, as of 2026-09-11, three
// mutually contradictory price lists; the obvious "improvement" to the venue
// page is to paste those in, and it would turn an honest sales page into a
// set of claims ODD cannot keep on the day of somebody's event.

const MEMBERSHIP = '/oddspace/membership/';
const VENUE = '/oddspace/venue/';
const SPACE = '/oddspace/';

test('the membership page carries the price and the studio carve-out', async ({ page }) => {
  await page.goto(MEMBERSHIP);
  const body = (await page.locator('body').textContent()) ?? '';

  // The flat rate, and the two numbers the studio add-on is made of.
  expect(body).toContain('€150');
  expect(body).toContain('€100');
  expect(body).toContain('€250');
  expect(body).toContain('24/7');

  // The carve-out itself — the thing a member otherwise learns from an
  // invoice. Same defect /oddstudio exists to prevent.
  expect(body).toMatch(/not included/i);
  expect(body).toContain('ODDstudio');
});

test('the membership page says what membership does NOT get you', async ({ page }) => {
  await page.goto(MEMBERSHIP);
  const exclusions = page.locator('.odsm-list-block--out');
  await expect(exclusions).toHaveCount(1);
  const text = (await exclusions.textContent()) ?? '';
  // A shared space is not a private office, and saying so here is cheaper
  // than saying it to a disappointed member in week two.
  expect(text).toMatch(/private office|fixed, reserved desk/i);
});

test('the venue page publishes member rates and quotes the rest', async ({ page }) => {
  await page.goto(VENUE);
  const body = (await page.locator('body').textContent()) ?? '';

  // The two published member rates, exactly as /oddspace states them.
  expect(body).toContain('€200');
  expect(body).toContain('€100');
  // And no rate card for everyone else — non-member pricing is quoted.
  expect(body).toMatch(/quoted per event|quote/i);
  // You do not have to be a member to book, which is the single most common
  // wrong assumption about this space.
  expect(body).toMatch(
    /do not need to be a member|don't need to be a member|No membership needed/i,
  );
});

test('the venue page does not invent capacities, dimensions or AV specifications', async ({
  page,
}) => {
  await page.goto(VENUE);
  const body = (await page.locator('body').textContent()) ?? '';

  // None of the internal draft's unconfirmed numbers may appear as a
  // published capacity. These are the exact figures in the rental guide that
  // it marks as TBD.
  for (const invented of ['150 standing', '200 standing', '80 seated', '120 seated', '~500 sqm']) {
    expect(body).not.toContain(invented);
  }
  // The page has to say instead that it answers these per enquiry.
  const askUs = page.locator('.odsv-ask-inner');
  await expect(askUs).toHaveCount(1);
  const askText = (await askUs.textContent()) ?? '';
  expect(askText).toMatch(/capacit/i);
  expect(askText).toMatch(/AV|sound/i);
  expect(askText).toMatch(/accessib/i);
});

test('both pages keep the unverified-accessibility answer rather than reassuring', async ({
  page,
}) => {
  for (const route of [MEMBERSHIP, VENUE]) {
    await page.goto(route);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body, `${route} dropped the honest accessibility answer`).toMatch(
      /do not have verified accessibility information/i,
    );
  }
});

test('ODDspace routes visitors into both journeys', async ({ page }) => {
  await page.goto(SPACE);
  // Every membership and event CTA on /oddspace should now lead to a page
  // that answers the question, not straight into an enquiry form.
  await expect(page.locator('a[href*="/oddspace/membership"]').first()).toBeVisible();
  await expect(page.locator('a[href*="/oddspace/venue"]').first()).toBeVisible();
});
