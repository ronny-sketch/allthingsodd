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

// Rewritten 2026-09-24. This used to assert the opposite — that the page
// published the member rates and said everything else was "quoted per event"
// — which was right for as long as three internal price lists disagreed with
// each other. Ronny set one list on 2026-09-24, so the page now publishes it.
// What the tests below guard is that publishing it did not cost the page its
// honesty: the numbers are all there, they are all marked + VAT, and the
// "every price is negotiable" line is still on the page, because it is the
// actual policy and not a disclaimer.
test('the venue page publishes the whole rate card', async ({ page }) => {
  await page.goto(VENUE);
  const body = (await page.locator('body').textContent()) ?? '';

  // Member (half/full), creative org (promoters included), company (half/full).
  for (const price of ['€100', '€200', '€300', '€750', '€1,200']) {
    expect(body, `the rate card lost ${price}`).toContain(price);
  }
  // The revenue-share threshold, which is the part a creative org or a
  // promoter actually decides on.
  expect(body).toContain('€350');
  // Promoters were folded into creative organisations on 2026-09-24: no
  // separate €400 / €450 promoter rate.
  expect(body).not.toContain('€450');
  // A published price without its VAT treatment is not a published price.
  expect(body).toMatch(/\+ VAT 25\.5%/);
  // You do not have to be a member to book, which is the single most common
  // wrong assumption about this space.
  expect(body).toMatch(
    /do not need to be a member|don't need to be a member|No membership needed/i,
  );
});

test('the rate card prices a selection and carries it into the enquiry', async ({ page }) => {
  await page.goto(VENUE);
  const card = page.locator('.vrc');
  await expect(card).toHaveCount(1);

  // Company, full day: €1,200 + the house technician is not offered on a
  // package that already includes staff, so the figure is the rate itself.
  await card.getByRole('radio', { name: 'Company or organisation' }).check();
  await card.getByRole('radio', { name: /Full day or evening/ }).check();
  await expect(card.locator('.vrc-estimate-figure')).toHaveText('€1,200');
  await expect(card.locator('.vrc-estimate-vat')).toContainText('€1,506');

  // Creative organisation, flat fee, with the technician: €300 + €200.
  await card.getByRole('radio', { name: 'Creative organisation' }).check();
  await card.getByRole('radio', { name: /Flat fee/ }).check();
  await card.getByRole('checkbox', { name: /House technician/ }).check();
  await expect(card.locator('.vrc-estimate-figure')).toHaveText('€500');

  // The revenue share has no price of its own; whatever is added to it is
  // only what is payable upfront, and the figure has to say so.
  await card.getByRole('radio', { name: /Revenue share/ }).check();
  await expect(card.locator('.vrc-estimate-figure')).toHaveText('€200 upfront');

  // And the choice travels to the form, so the first reply is about the date.
  const href = await card.locator('.vrc-cta a').getAttribute('href');
  expect(href).toContain('lane=creative');
  expect(href).toContain('offer=share');
  // Since the booking enquiry went live, the rate card's button opens it on
  // this page rather than sending people to the Work with ODD form.
  expect(href).toContain('#booking-form');
  expect(href).toMatch(/^\/oddspace\/venue\/\?/);
});

test('the enquiry form opens with the choice already written in', async ({ page }) => {
  await page.goto('/work-with-odd/?interest=oddspace&intent=event&lane=creative&offer=share');
  await expect(page.locator('#we-goal')).toHaveValue(
    /as a creative organisation, the revenue share, nothing upfront/i,
  );
});

test('a made-up lane in the link writes nothing into the form', async ({ page }) => {
  // The message lands in front of a human at ODD as though we had asked for
  // it, so it is composed from a fixed list here, never echoed from the URL.
  await page.goto(
    '/work-with-odd/?interest=oddspace&intent=event&lane=%3Cimg+src%3Dx%3E&offer=free+for+me',
  );
  await expect(page.locator('#we-goal')).toHaveValue('');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every lane and every price is still on the page', async ({ page }) => {
    await page.goto(VENUE);
    const body = (await page.locator('body').textContent()) ?? '';
    // The script is what turns the card into a picker. If it never runs, the
    // visitor gets the whole card instead of an empty box — which is the
    // point of rendering every lane server-side.
    for (const lane of ['ODDspace member', 'Creative organisation', 'Company']) {
      expect(body, `${lane} disappeared without JS`).toContain(lane);
    }
    for (const price of ['€100', '€200', '€300', '€750', '€1,200']) {
      expect(body, `${price} disappeared without JS`).toContain(price);
    }
    // The estimate line is the one thing that needs the script, and it stays
    // hidden rather than showing an empty "Roughly".
    await expect(page.locator('.vrc-estimate')).toBeHidden();
  });
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

test('ODDspace shows only the two starting event prices', async ({ page }) => {
  await page.goto(SPACE);
  // Just the "from" rates here (2026-09-24); the venue page carries the
  // full card, member rates included.
  const rates = page.locator('.odds-rates-list');
  await expect(rates).toContainText('€300');
  await expect(rates).toContainText('€750');
  await expect(rates).not.toContainText(/member/i);
});

test('ODDspace routes visitors into both journeys', async ({ page }) => {
  await page.goto(SPACE);
  // Every membership and event CTA on /oddspace should now lead to a page
  // that answers the question, not straight into an enquiry form.
  await expect(page.locator('a[href*="/oddspace/membership"]').first()).toBeVisible();
  await expect(page.locator('a[href*="/oddspace/venue"]').first()).toBeVisible();
});
