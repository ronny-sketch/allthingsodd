import { test, expect } from '../base';
import type { Page, Route } from '@playwright/test';
import { helsinkiLocalToISO } from '../../src/scripts/booking-enquiry-schema';

// The booking form's live availability (calendar-availability plan, Stage
// 2, 2026-11-11): rooms first, then a month for those rooms from
// /oddspace/availability.json. The feed is mocked from the fixture below,
// so these tests say what the form does with each kind of booking; the
// feed itself is tested in worker/availability.test.mjs, and the clash
// rule (rooms, the hour between events, holds) is the same as the
// Worker's (odd-growth-os).

test.describe.configure({ timeout: 90_000 });

const VENUE = '/oddspace/venue/';
const FEED = '**/oddspace/availability.json';
const SUBMIT = '**/api/booking-enquiry';
const NEXT = '#bookingEnquiryForm .bk-next';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

// A local "YYYY-MM-DD" some days ahead: the test's own dates, far enough
// out to be pickable and inside the feed's window.
function dateIn(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const at = (date: string, time: string) => helsinkiLocalToISO(`${date}T${time}`)!;

const D = dateIn(20);
const DAY = (n: number) => dateIn(20 + n);

// The fixture. Gallery booked 12:00–17:00 on D; a Gallery hold the next
// evening; the whole space all day on D+8; a Gallery morning on D+11 (for
// the evening before that runs past midnight); the 2nd-floor meeting rooms
// on D+13. Rooms and times only, as the real feed.
function feedBody() {
  return {
    v: 2,
    generated_at: new Date().toISOString(),
    from: `${dateIn(0).slice(0, 7)}-01`,
    to: dateIn(150),
    days: {},
    blocks: [
      { start: at(D, '12:00'), end: at(D, '17:00'), rooms: ['gallery'], hold: false },
      { start: at(DAY(1), '16:00'), end: at(DAY(1), '22:00'), rooms: ['gallery'], hold: true },
      { start: at(DAY(8), '00:00'), end: at(DAY(9), '00:00'), rooms: ['all'], hold: false },
      { start: at(DAY(11), '08:00'), end: at(DAY(11), '10:00'), rooms: ['gallery'], hold: false },
      {
        start: at(DAY(13), '10:00'),
        end: at(DAY(13), '18:00'),
        rooms: ['meeting_rooms'],
        hold: false,
      },
    ],
  };
}

async function load(
  page: Page,
  feed: (r: Route) => Promise<void> | void = (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(feedBody()) }),
) {
  await page.route(FEED, feed);
  await page.goto(VENUE);
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.click('#bk-open');
  await expect(page.locator('#bk-dialog')).toBeVisible();
}

async function rooms(page: Page, ...keys: string[]) {
  await page.fill('#bk-estimate', '60');
  for (const k of keys) await page.check(`#bk-space-${k}`);
  await page.click(NEXT);
  await expect(page.locator('#bk-step-2')).toBeVisible();
}

const cell = (page: Page, date: string) => page.locator(`.bk-cal-cell[data-date="${date}"]`);

// Turns the month until the day shows, then picks it.
async function pickDay(page: Page, date: string) {
  for (let i = 0; i < 6 && (await cell(page, date).count()) === 0; i++) {
    await page.click('[data-cal-next]');
  }
  await cell(page, date).click();
  await expect(page.locator('#bk-date')).toHaveValue(date);
}

async function hours(page: Page, from: string, until: string) {
  await page.selectOption('#bk-from', from);
  await page.selectOption('#bk-until', until);
}

// Steps 3 to 5 with valid answers, then consent: lands on the summary.
async function finish(page: Page) {
  await page.click(NEXT);
  await page.fill('#bk-title', 'Autumn launch');
  await page.check('#bk-type-launch');
  await page.check('#bk-audience-private');
  await page.fill('#bk-desc', 'A product launch with a short talk and drinks.');
  await page.click(NEXT);
  await page.check('#bk-support-basic_infra');
  await page.check('#bk-alcohol-served');
  await page.check('#bk-music-background');
  await page.click(NEXT);
  await page.fill('#bk-first', 'Test');
  await page.fill('#bk-last', 'Person');
  await page.fill('#bk-email', 'test@example.com');
  await page.check('#bk-orgtype-company');
  await page.check('#bk-member-false');
  await page.check('#bk-before-true');
  await page.click(NEXT);
  await expect(page.locator('#bk-count')).toHaveText('Ready to send');
  await page.check('input[name="consent_privacy"]');
}

async function send(page: Page) {
  await page.route(SUBMIT, (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'delivered',
        submission_id: r.request().postDataJSON().submission_id,
      }),
    }),
  );
  const req = page.waitForRequest(SUBMIT);
  await page.click(NEXT);
  return (await req).postDataJSON();
}

const state = async (page: Page, date: string) => {
  for (let i = 0; i < 6 && (await cell(page, date).count()) === 0; i++) {
    await page.click('[data-cal-next]');
  }
  return cell(page, date).getAttribute('data-state');
};

test('the rooms come first, then a calendar for them', async ({ page }) => {
  await load(page);
  await expect(page.locator('#bk-step-1')).toContainText('People and room');
  await rooms(page, 'gallery');
  await expect(page.locator('#bk-step-2')).toContainText('When');
  await expect(page.locator('#bk-cal')).toBeVisible();
  await expect(page.locator('#bk-date-sub')).toBeHidden();
  await expect(page.locator('#bk-cal-for')).toHaveText('Showing the Gallery.');
  await expect(page.locator('#bk-cal-legend')).toContainText('Partly booked');
  expect(await state(page, D)).toBe('partly');
  await expect(cell(page, D)).toContainText('Partly');
  await expect(cell(page, D)).toHaveAttribute('aria-label', /partly booked$/);
  expect(await state(page, DAY(1))).toBe('hold');
  await expect(cell(page, DAY(1))).toContainText('On hold');
  expect(await state(page, DAY(8))).toBe('booked');
  expect(await state(page, DAY(13))).toBe('free');
  // Back to the first month: it cannot go further, and today and the past
  // cannot be picked.
  const prev = page.locator('[data-cal-prev]');
  while (await prev.isEnabled()) await prev.click();
  if ((await cell(page, dateIn(0)).count()) > 0) await expect(cell(page, dateIn(0))).toBeDisabled();
});

test('each room is its own: the Gallery does not block the Aula, the meeting rooms block nothing', async ({
  page,
}) => {
  await load(page);
  await rooms(page, 'aula');
  expect(await state(page, D)).toBe('free');
  expect(await state(page, DAY(8))).toBe('booked');
  await page.click('#bookingEnquiryForm .bk-back');
  await page.check('#bk-space-gallery');
  await page.click(NEXT);
  await expect(page.locator('#bk-cal-for')).toHaveText('Showing the Gallery and the Aula.');
  expect(await state(page, D)).toBe('partly');
  await page.click('#bookingEnquiryForm .bk-back');
  await page.uncheck('#bk-space-gallery');
  await page.uncheck('#bk-space-aula');
  await page.check('#bk-space-second_floor');
  await page.click(NEXT);
  expect(await state(page, DAY(13))).toBe('free');
});

test('"Not sure yet" shows every booking and blocks nothing', async ({ page }) => {
  await load(page);
  await rooms(page, 'advise_me');
  await expect(page.locator('#bk-cal-for')).toContainText('No room chosen yet');
  await expect(page.locator('#bk-cal-legend [data-key="partly"]')).toBeHidden();
  expect(await state(page, D)).toBe('some');
  await pickDay(page, D);
  await expect(page.locator('#bk-cal-day')).toContainText('Gallery: booked 11:00–18:00');
  await expect(page.locator('#bk-from option[disabled]:not([value=""])')).toHaveCount(0);
  await hours(page, '12:00', '16:00');
  await page.click(NEXT);
  await expect(page.locator('#bk-step-3')).toBeVisible();
});

test('hours inside a booking cannot be picked, and the hour between events is kept', async ({
  page,
}) => {
  await load(page);
  await rooms(page, 'gallery');
  await pickDay(page, D);
  // Booked 12:00–17:00, so 11:00 to 17:00 cannot start; 10:00 and 18:00 can.
  await expect(page.locator('#bk-cal-day')).toContainText('Gallery: booked 11:00–18:00');
  await expect(page.locator('#bk-cal-day')).toContainText('the hour we keep free');
  for (const t of ['11:00', '14:00', '17:00']) {
    await expect(page.locator(`#bk-from option[value="${t}"]`)).toBeDisabled();
    await expect(page.locator(`#bk-from option[value="${t}"]`)).toHaveText(`${t} · booked`);
  }
  await expect(page.locator('#bk-from option[value="10:00"]')).toBeEnabled();
  await expect(page.locator('#bk-from option[value="18:00"]')).toBeEnabled();
  // The booking ends at 17:00: 18:00 is the earliest start.
  await hours(page, '18:00', '22:00');
  await expect(page.locator('#bk-avail')).toHaveText('Free at your time.');
  // Ending at 11:00, an hour before it starts, is fine too.
  await hours(page, '08:00', '11:00');
  await expect(page.locator('#bk-avail')).toHaveText('Free at your time.');
  // Running to 12:00 is not, and Next says so.
  await hours(page, '08:00', '12:00');
  await expect(page.locator('#bk-avail')).toHaveText(/run into a booking/);
  await page.click(NEXT);
  await expect(page.locator('#bk-step-2')).toBeVisible();
  await expect(page.locator('#bk-when-err')).toHaveText(
    'Those hours run into a booking. Pick other hours or another day.',
  );
  await expect(page.locator('#bk-avail')).toBeHidden();
  await expect(page.locator('#bk-from')).toBeFocused();
  // Picking other hours clears it.
  await page.selectOption('#bk-until', '11:00');
  await expect(page.locator('#bk-when-err')).toBeHidden();
  await page.click(NEXT);
  await expect(page.locator('#bk-step-3')).toBeVisible();
});

test('a hold can still be asked for, and says the visitor is next in line', async ({ page }) => {
  await load(page);
  await rooms(page, 'gallery');
  await pickDay(page, DAY(1));
  await expect(page.locator('#bk-cal-day')).toContainText('on hold');
  await expect(page.locator('#bk-cal-day')).toContainText('you can still ask');
  await hours(page, '18:00', '21:00');
  await expect(page.locator('#bk-avail')).toHaveText(
    'On hold for someone else. Send it and you’re next in line.',
  );
  await finish(page);
  await expect(page.locator('#bk-review')).toContainText('On hold for someone else');
  const sent = await send(page);
  expect(sent.availability_at_submit).toBe('on_hold');
  expect(sent.get_in.slice(0, 10)).toBe(DAY(1));
});

test('a free slot is sent as free, with the payload otherwise as before', async ({ page }) => {
  await load(page);
  await rooms(page, 'gallery');
  await pickDay(page, DAY(13));
  await hours(page, '14:00', '22:00');
  await finish(page);
  await expect(page.locator('#bk-review')).toContainText('Free when you checked');
  const sent = await send(page);
  expect(sent.availability_at_submit).toBe('free');
  expect(sent.get_in).toBe(at(DAY(13), '14:00'));
  expect(sent.get_out).toBe(at(DAY(13), '22:00'));
  expect(sent.spaces).toEqual(['gallery']);
  for (const k of ['event_date', 'time_from', 'time_until']) expect(sent[k]).toBeUndefined();
});

test('an evening past midnight that runs into the next morning is refused, by date', async ({
  page,
}) => {
  await load(page);
  await rooms(page, 'gallery');
  await pickDay(page, DAY(10));
  // The Gallery is booked 08:00 the next morning; with the gap, 07:00.
  await hours(page, '20:00', '08:00');
  await expect(page.locator('#bk-avail')).toContainText('run into a booking on');
  await page.click(NEXT);
  await expect(page.locator('#bk-when-err')).toContainText('run into a booking on');
  await page.selectOption('#bk-until', '06:00');
  await expect(page.locator('#bk-avail')).toHaveText('Free at your time.');
  await page.click(NEXT);
  await expect(page.locator('#bk-step-3')).toBeVisible();
});

test('a multi-day event across a booked day is refused, naming the day', async ({ page }) => {
  await load(page);
  await rooms(page, 'aula');
  await pickDay(page, DAY(6));
  await hours(page, '10:00', '18:00');
  await page.check('input[name="multi_day"]');
  await page.fill('#bk-enddate', DAY(9));
  await page.click(NEXT);
  const named = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${DAY(8)}T12:00:00`));
  await expect(page.locator('#bk-when-err')).toHaveText(
    `Those hours run into a booking on ${named}. Pick other hours or another day.`,
  );
});

test('no date yet: Next points at the calendar', async ({ page }) => {
  await load(page);
  await rooms(page, 'gallery');
  await page.click(NEXT);
  await expect(page.locator('#bk-when-err')).toHaveText(/Add the date/);
  await expect(page.locator('.bk-cal-cell:focus')).toHaveCount(1);
});

test('the calendar works from the keyboard', async ({ page }) => {
  await load(page);
  await rooms(page, 'gallery');
  const first = page.locator('.bk-cal-cell[tabindex="0"]');
  await expect(first).toHaveCount(1);
  await first.focus();
  const from = (await first.getAttribute('data-date'))!;
  await page.keyboard.press('ArrowRight');
  const nextDay = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date);
  expect(nextDay! > from).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#bk-date')).toHaveValue(nextDay!);
  await expect(cell(page, nextDay!)).toHaveAttribute('aria-pressed', 'true');
  await expect(cell(page, nextDay!)).toBeFocused();
});

test('without the feed, the plain date field comes back and the enquiry still sends', async ({
  page,
}) => {
  await load(page, (r) => r.fulfill({ status: 502, body: '{"error":"calendar unavailable"}' }));
  await rooms(page, 'gallery');
  await expect(page.locator('#bk-cal')).toBeHidden();
  await expect(page.locator('#bk-cal-fallback')).toHaveText(
    'We couldn’t load live availability. Pick your date and we’ll check it.',
  );
  await page.fill('#bk-date', D);
  await hours(page, '12:00', '16:00');
  await expect(page.locator('#bk-avail')).toBeHidden();
  await finish(page);
  const sent = await send(page);
  expect(sent.availability_at_submit).toBe('not_checked');
});

test('an old-shape feed is not trusted as free', async ({ page }) => {
  await load(page, (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ from: '2026-11-01', to: '2027-05-31', days: {} }),
    }),
  );
  await rooms(page, 'gallery');
  await expect(page.locator('#bk-cal')).toBeHidden();
  await expect(page.locator('#bk-cal-fallback')).toBeVisible();
});

test('with the venue page flag off, the form shows the plain fields', async ({ page }) => {
  // The switch that needs no code: booking.liveAvailability false in
  // src/content/pages/oddspace-venue.json renders the form with this.
  await page.route(`**${VENUE}`, async (r) => {
    const res = await r.fetch();
    const html = (await res.text()).replace(
      'data-live-availability="true"',
      'data-live-availability="false"',
    );
    await r.fulfill({ response: res, body: html });
  });
  // The feed answers (the page's own "Is your date free?" grid reads it);
  // the form leaves it alone.
  await load(page);
  await rooms(page, 'gallery');
  await expect(page.locator('#bk-cal')).toBeHidden();
  await expect(page.locator('#bk-cal-fallback')).toBeHidden();
  await expect(page.locator('#bk-date')).toBeVisible();
  await page.fill('#bk-date', D);
  await hours(page, '12:00', '16:00');
  await expect(page.locator('#bk-from option[value="14:00"]')).toBeEnabled();
  await page.click(NEXT);
  await expect(page.locator('#bk-step-3')).toBeVisible();
});

test('on a phone the calendar fits without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await load(page);
  await rooms(page, 'gallery');
  await expect(page.locator('#bk-cal')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const body = document.getElementById('bk-body')!;
    return {
      page: document.documentElement.scrollWidth - window.innerWidth,
      dialog: body.scrollWidth - body.clientWidth,
      cell: document.querySelector('.bk-cal-cell')!.getBoundingClientRect().height,
    };
  });
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.dialog).toBeLessThanOrEqual(0);
  expect(overflow.cell).toBeGreaterThanOrEqual(44);
});
