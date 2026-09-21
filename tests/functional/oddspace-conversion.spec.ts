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

test('the venue page publishes the whole rate card, for all three bookers', async ({ page }) => {
  await page.goto(VENUE);
  const body = (await page.locator('body').textContent()) ?? '';

  // v3 prices one number per kind of booker (2026-09-21). A visitor who is
  // any one of the three has to find their own price without writing to us —
  // that is the entire point of publishing them, so all three are guarded.
  expect(body).toContain('€300'); // creative, free or non-commercial
  expect(body).toContain('€450'); // promoter weeknight
  expect(body).toContain('€650'); // promoter weekend
  expect(body).toContain('€750'); // company half day
  expect(body).toContain('€1,200'); // company full day or evening
  expect(body).toContain('€4,000'); // produced by ODD

  // The Door Deal is the offer that makes a ticketed night possible with no
  // money — it is worthless if the €0 or the split ever quietly drops out.
  expect(body).toContain('€0');
  expect(body).toContain('€400');

  // Prices are ex-VAT. Publishing them without saying so is a different price.
  expect(body).toMatch(/plus VAT|\+ VAT/i);

  // Member rates stay on the page, but as one line under the card, never as
  // a fourth column: the room is sold to strangers first and the perk second.
  expect(body).toContain('€200');
  const groups = page.locator('.odsv-rate-group');
  await expect(groups).toHaveCount(3);
  await expect(groups.filter({ hasText: 'member' })).toHaveCount(0);

  // You do not have to be a member to book, which is the single most common
  // wrong assumption about this space.
  expect(body).toMatch(
    /do not need to be a member|don't need to be a member|No membership needed/i,
  );
});

test('/oddspace keeps starting prices simple and sends the detail to the venue page', async ({
  page,
}) => {
  await page.goto(SPACE);
  const rates = page.locator('.odds-rates-list');
  await expect(rates).toHaveCount(1);

  // Three rows, one per kind of booker, each a "from" number and nothing
  // more. Conditions, splits and add-ons belong on /oddspace/venue — if they
  // start appearing here, this page has taken over the venue page's job.
  await expect(rates.locator('.odds-rate-row')).toHaveCount(3);
  const text = (await rates.textContent()) ?? '';
  expect(text).toContain('€300');
  expect(text).toContain('€450');
  expect(text).toContain('€750');
  expect(text).not.toMatch(/€1,200|€4,000|70%|technician/i);
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
