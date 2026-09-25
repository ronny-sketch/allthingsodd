import { test, expect, type Page, type Route } from '@playwright/test';

// The ODDspace booking enquiry on /oddspace/venue (2026-09-23; reworked
// 2026-09-24, and on the same day turned into a guided dialog, v2). The
// Worker route is mocked here, so these tests assert on what the browser
// actually POSTs and on how the page reacts to each answer the Worker can
// give. Whether the Worker writes the right Notion record is covered by the
// Worker's own tests in ../odd-growth-os.

// Walking five steps takes a few seconds per test on its own, and much
// longer when the whole suite shares one preview server.
test.describe.configure({ timeout: 90_000 });

const VENUE = '/oddspace/venue/';
const SUBMIT = '**/api/booking-enquiry';
const NEXT = '#bookingEnquiryForm .bk-next';
const BACK = '#bookingEnquiryForm .bk-back';
const DIALOG = '#bk-dialog';

test.beforeEach(async ({ context }) => {
  // Same reason as interactions.spec.ts: keep the newsletter popup's real
  // timer from landing on top of a long form test.
  await context.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

async function load(page: Page, { keepConsentBanner = false, url = VENUE } = {}) {
  await page.goto(url);
  // global.css sets `scroll-behavior: smooth` on <html> with no
  // reduced-motion branch, so Playwright's own scroll-into-view glides.
  // Instant scrolling here; the site-wide rule is a separate follow-up.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  if (!keepConsentBanner) {
    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.locator('[data-consent-banner]')).not.toHaveClass(/is-visible/);
  }
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
  // A web font swapping in mid-test moves the pills by a few pixels, which
  // is enough for a click aimed at one to land on its neighbour.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function openForm(page: Page, opts: { keepConsentBanner?: boolean } = {}) {
  await load(page, opts);
  await page.click('#bk-open');
  await expect(page.locator(DIALOG)).toBeVisible();
}

const stepHead = (page: Page, step: number | 'review') => page.locator(`#bk-step-${step}`);

async function next(page: Page, expectStep?: number | 'review') {
  await page.click(NEXT);
  if (expectStep !== undefined) await expect(stepHead(page, expectStep)).toBeVisible();
}

// A local "YYYY-MM-DD" some days ahead, for the date fields.
function dateIn(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Valid answers for one step, on the step that is showing.
async function fillStep(page: Page, step: number, { days = 40 } = {}) {
  switch (step) {
    case 1:
      await page.fill('#bk-date', dateIn(days));
      await page.selectOption('#bk-from', '14:00');
      await page.selectOption('#bk-until', '22:00');
      return;
    case 2:
      await page.fill('#bk-estimate', '80');
      await page.check('#bk-space-gallery');
      await page.check('#bk-layout-cocktail');
      return;
    case 3:
      await page.fill('#bk-title', 'Autumn launch');
      await page.check('#bk-type-launch');
      await page.check('#bk-audience-private');
      await page.fill('#bk-desc', 'A product launch with a short talk and drinks.');
      return;
    case 4:
      await page.check('#bk-support-basic_infra');
      await page.check('#bk-alcohol-served');
      await page.check('#bk-music-background');
      return;
    case 5:
      await page.fill('#bk-first', 'Test');
      await page.fill('#bk-last', 'Person');
      await page.fill('#bk-email', 'test@example.com');
      await page.check('#bk-orgtype-company');
      await page.check('#bk-member-false');
      return;
  }
}

// Fills every step from `from` (already showing) to 5 and lands on the
// summary with consent given.
async function fillFrom(page: Page, from: number, { skipFill = false, days = 40 } = {}) {
  for (let s = from; s <= 5; s++) {
    if (!(skipFill && s === from)) await fillStep(page, s, { days });
    await next(page, s === 5 ? 'review' : s + 1);
  }
  await page.check('input[name="consent_privacy"]');
}

// Walks to `step` with valid answers on every step before it.
async function reach(page: Page, step: number, { days = 40 } = {}) {
  for (let s = 1; s < step; s++) {
    await fillStep(page, s, { days });
    await next(page, s + 1);
  }
}

const fillValid = (page: Page, opts: { days?: number } = {}) => fillFrom(page, 1, opts);

const ok = (route: Route, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, submission_id: 'x' }),
  });

async function sendAndCapture(page: Page) {
  await page.route(SUBMIT, (r) => ok(r));
  const req = page.waitForRequest(SUBMIT);
  await page.click(NEXT);
  return (await req).postDataJSON();
}

// --- Opening and closing ----------------------------------------------------

test('"Get a quote" opens the enquiry, and Esc closes it where it was', async ({ page }) => {
  await load(page);
  const dialog = page.locator(DIALOG);
  await expect(dialog).toBeHidden();
  const open = page.locator('#bk-open');
  await expect(open).toHaveText('Get a quote');
  await open.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('#bk-count')).toHaveText('Step 1 of 5');
  await expect(stepHead(page, 1)).toBeFocused();
  expect(new URL(page.url()).hash).toBe('#booking-form');
  // The page behind does not scroll.
  await expect(page.locator('html')).toHaveClass(/bk-lock/);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  await expect(open).toBeFocused();
  await expect(page.locator('html')).not.toHaveClass(/bk-lock/);
});

test('× closes it too, and the answers are still there when it reopens', async ({ page }) => {
  await openForm(page);
  await fillStep(page, 1);
  await next(page, 2);
  await page.fill('#bk-estimate', '64');
  await page.click('#bk-dialog .bk-close');
  await expect(page.locator(DIALOG)).toBeHidden();
  await page.click('#bk-open');
  await expect(page.locator('#bk-count')).toHaveText('Step 2 of 5');
  await expect(page.locator('#bk-estimate')).toHaveValue('64');
  await page.click(BACK);
  await expect(page.locator('#bk-from')).toHaveValue('14:00');
});

test("the phone's back button closes the enquiry and stays on the page", async ({ page }) => {
  await openForm(page);
  await page.goBack();
  await expect(page.locator(DIALOG)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(VENUE);
});

test("the hero's Get a quote opens the enquiry", async ({ page }) => {
  await load(page);
  const heroCta = page.locator('a[href="#booking-form"]').first();
  await expect(heroCta).toHaveText(/Get a quote/i);
  await heroCta.click();
  await expect(page.locator(DIALOG)).toBeVisible();
});

test('arriving with #booking-form opens it, and back then closes it', async ({ page }) => {
  await page.goto(VENUE);
  await page.goto(`${VENUE}#booking-form`);
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.goBack();
  await expect(page.locator(DIALOG)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(VENUE);
});

test("opened from a link, closing it puts focus on the page's own button", async ({ page }) => {
  // Nothing on the page had focus when the dialog opened, so without a
  // fallback focus would drop to <body> (design review, 24 September).
  await page.goto(`${VENUE}#booking-form`);
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(DIALOG)).toBeHidden();
  await expect(page.locator('#bk-open')).toBeFocused();
});

test('the drawn cursor moves into the dialog while it is open, and back after', async ({
  page,
}) => {
  // A modal <dialog> sits in the browser's top layer, above every z-index,
  // so the site's cursor (z-index 9999) would otherwise be hidden under it
  // (reported 24 September, desktop).
  await load(page);
  const parentOfCursor = () =>
    page.evaluate(() => {
      const c = document.querySelector('.cursor');
      return c?.parentElement?.id || c?.parentElement?.tagName || null;
    });
  expect(await parentOfCursor()).toBe('BODY');
  await page.click('#bk-open');
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect.poll(parentOfCursor).toBe('bk-dialog');
  await page.keyboard.press('Escape');
  await expect(page.locator(DIALOG)).toBeHidden();
  expect(await parentOfCursor()).toBe('BODY');
});

test('the rate card opens the enquiry with its choice carried in', async ({ page }) => {
  await load(page);
  const card = page.locator('.vrc');
  await card.getByRole('radio', { name: 'Company or organisation' }).check();
  await card.getByRole('radio', { name: /Full day or evening/ }).check();
  await card.locator('.vrc-cta a').click();
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(stepHead(page, 1)).toBeFocused();
  // Nothing reloaded: the page never left.
  expect(new URL(page.url()).pathname).toBe(VENUE);
  await expect(page.locator('#bk-orgtype-company')).toBeChecked();
  await expect(page.locator('#bk-notes')).toHaveValue(
    'From the rate card: booking the space as a company or organisation, a full day or evening.',
  );
});

test('a made-up lane in the link carries nothing in', async ({ page }) => {
  await load(page);
  await page.evaluate(() => {
    const a = document.createElement('a');
    a.href = '/oddspace/venue/?lane=%3Cimg+src%3Dx%3E&offer=free#booking-form';
    a.id = 'fake-link';
    a.textContent = 'x';
    document.body.append(a);
  });
  await page.locator('#fake-link').click();
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator('#bk-notes')).toHaveValue('');
});

test('the ODDspace page leads straight into the enquiry', async ({ page }) => {
  await page.goto('/oddspace/');
  const cta = page.locator('a[href="/oddspace/venue/#booking-form"]');
  await expect(cta).toHaveText(/Get a quote/i);
});

test.describe('the newsletter popup', () => {
  test.beforeEach(async ({ context }) => {
    // Undo the file-wide "already seen", so the popup's own timer runs.
    await context.addInitScript(() => sessionStorage.removeItem('oddNewsletterPopupSeen'));
  });

  test('stays away while the enquiry is open', async ({ page }) => {
    await page.clock.install();
    await page.goto(VENUE);
    await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
    await page.click('#bk-open');
    await page.clock.fastForward(20_000);
    await expect(page.locator('#newsletterPopup')).toBeHidden();
  });

  test('still appears on the venue page when the enquiry was never opened', async ({ page }) => {
    await page.clock.install();
    await page.goto(VENUE);
    await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
    await page.clock.fastForward(20_000);
    await expect(page.locator('#newsletterPopup')).toBeVisible();
  });
});

// --- The sticky bar -----------------------------------------------------------

test('the sticky bar shows between the hero and the final section', async ({ page }) => {
  await load(page);
  const bar = page.locator('#bk-sticky');
  await expect(bar).not.toHaveClass(/is-shown/);
  await page.locator('#spaces').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(bar).toHaveClass(/is-shown/);
  await page.locator('#bk-open').scrollIntoViewIfNeeded();
  await expect(bar).not.toHaveClass(/is-shown/);
  // And it opens the enquiry.
  await page.locator('#spaces').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(bar).toHaveClass(/is-shown/);
  await bar.locator('.bk-sticky-cta').click();
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(bar).not.toHaveClass(/is-shown/);
});

test('the sticky bar stays down while the cookie banner is up', async ({ page }) => {
  await load(page, { keepConsentBanner: true });
  await page.locator('#spaces').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(page.locator('#bk-sticky')).not.toHaveClass(/is-shown/);
  await page.getByRole('button', { name: 'Reject all' }).click();
  await page.mouse.wheel(0, 10);
  await expect(page.locator('#bk-sticky')).toHaveClass(/is-shown/);
});

// --- Steps ------------------------------------------------------------------

test('required questions are marked, and the key says what the mark means', async ({ page }) => {
  await openForm(page);
  await expect(page.locator('[data-step="1"] .booking-key')).toContainText('need an answer');
  await expect(page.locator('#bk-when .req').first()).toBeVisible();
  await next(page);
  await fillStep(page, 1);
  await next(page, 2);
  await expect(page.locator('#bk-space .req').first()).toBeVisible();
  // Layout is optional: no mark.
  await expect(page.locator('#bk-layout .req')).toHaveCount(0);
});

test('Next checks the current step only, and sends nothing', async ({ page }) => {
  await openForm(page);
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return ok(r);
  });
  await next(page);
  await expect(stepHead(page, 1)).toBeVisible();
  await expect(page.locator('#bk-when')).toHaveClass(/is-invalid/);
  await expect(page.locator('#bk-when-err')).toHaveText(
    /Add the date, a start time and an end time/,
  );
  await expect(page.locator('#bk-date')).toBeFocused();
  await expect(page.locator('#bookingEnquiryForm .form-status')).toHaveText(
    '1 answer needed to continue.',
  );
  // Nothing on a later step is marked yet.
  await expect(page.locator('#bookingEnquiryForm .field.is-invalid')).toHaveCount(1);
  // Answering clears the mark and the count straight away.
  await fillStep(page, 1);
  await expect(page.locator('#bk-when-err')).toBeHidden();
  await expect(page.locator('#bookingEnquiryForm .form-status')).toHaveText('');
  await next(page, 2);
  await expect(page.locator('#bk-count')).toHaveText('Step 2 of 5');
  await expect(page.locator('.bk-progress li.is-done')).toHaveCount(2);
  await expect(stepHead(page, 2)).toBeFocused();
  expect(posted).toBe(false);
});

test('Back never checks anything', async ({ page }) => {
  await openForm(page);
  await expect(page.locator(BACK)).toBeHidden();
  await reach(page, 3);
  await page.fill('#bk-title', '');
  await page.click(BACK);
  await expect(stepHead(page, 2)).toBeVisible();
  await expect(page.locator('#bookingEnquiryForm .field.is-invalid')).toHaveCount(0);
});

test('Enter in a text field moves on, like Next', async ({ page }) => {
  await openForm(page);
  await reach(page, 3);
  await fillStep(page, 3);
  await page.locator('#bk-title').press('Enter');
  await expect(stepHead(page, 4)).toBeVisible();
});

test('a wrong email address is flagged on leaving the field', async ({ page }) => {
  await openForm(page);
  await reach(page, 5);
  await page.fill('#bk-email', 'not-an-address');
  await page.locator('#bk-email').blur();
  await expect(page.locator('#bk-email-err')).toHaveText(/does not look right/);
  await page.fill('#bk-email', 'test@example.com');
  await expect(page.locator('#bk-email-err')).toBeHidden();
});

test('conditional questions appear only when they apply', async ({ page }) => {
  await openForm(page);
  // Step 1
  await expect(page.locator('#bk-alt1')).toBeHidden();
  await page.check('input[name="has_alt_dates"]');
  await expect(page.locator('#bk-alt1')).toBeVisible();
  await expect(page.locator('#bk-alt2')).toBeVisible();
  await expect(page.locator('#bk-enddate')).toBeHidden();
  await page.check('input[name="multi_day"]');
  await expect(page.locator('#bk-enddate')).toBeVisible();
  await page.uncheck('input[name="multi_day"]');
  await fillStep(page, 1);
  await next(page, 2);
  // Step 2
  await expect(page.locator('input[name="layout_custom"]')).toBeHidden();
  await page.check('#bk-layout-custom');
  await expect(page.locator('input[name="layout_custom"]')).toBeVisible();
  await fillStep(page, 2);
  await next(page, 3);
  await fillStep(page, 3);
  await next(page, 4);
  // Step 4
  await expect(page.locator('#bk-mics')).toBeHidden();
  await page.check('#bk-tech-mics');
  await expect(page.locator('#bk-mics')).toBeVisible();
  await expect(page.locator('#bk-pyro-detail')).toBeHidden();
  await page.check('input[name="has_pyro"]');
  await expect(page.locator('#bk-pyro-detail')).toBeVisible();
  await page.uncheck('#bk-tech-mics');
  await page.uncheck('input[name="has_pyro"]');
  await fillStep(page, 4);
  await next(page, 5);
  // Step 5
  const tier = page.locator('#bk-tier');
  await expect(tier).toBeHidden();
  await page.check('#bk-member-true');
  await expect(tier).toBeVisible();
  await page.check('#bk-member-false');
  await expect(tier).toBeHidden();
});

test('the rooms come with photographs, and their details open inside the card', async ({
  page,
}) => {
  await openForm(page);
  await reach(page, 2);
  const gallery = page.locator('.bk-card:has(#bk-space-gallery)');
  await expect(gallery.locator('img')).toHaveCount(1);
  await expect(gallery.locator('img')).toHaveAttribute('alt', /Gallery/);
  // A combination shows each of its rooms.
  await expect(page.locator('.bk-card:has(#bk-space-full_triangle) img')).toHaveCount(3);
  // "Not sure yet" has no photo.
  await expect(page.locator('.bk-card:has(#bk-space-advise_me) img')).toHaveCount(0);
  // Single rooms come first, then the combinations under their own label.
  const order = await page
    .locator('.bk-cards-rooms > *')
    .evaluateAll((els) =>
      els.map((el) =>
        el.classList.contains('bk-cards-label')
          ? 'label'
          : (el.querySelector('input') as HTMLInputElement | null)?.value,
      ),
    );
  expect(order).toEqual([
    'gallery',
    'aula',
    'auditorium',
    'second_floor',
    'label',
    'gallery_aula',
    'auditorium_aula',
    'full_triangle',
    'advise_me',
  ]);
  // The + is a real 44px button with the room's name.
  const summary = gallery.locator('summary');
  await expect(summary).toHaveAttribute('aria-label', 'More about Gallery');
  const box = await summary.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  // Reading more does not pick the room.
  const more = gallery.locator('details');
  await summary.click();
  await expect(more).toHaveAttribute('open', '');
  await expect(more).toContainText('emergency exit');
  await expect(page.locator('#bk-space-gallery')).not.toBeChecked();
});

test('help is offered in four plain levels and "not sure", each described', async ({ page }) => {
  await openForm(page);
  await reach(page, 4);
  const options = page.locator('#bk-support input[name="support_level"]');
  await expect(options).toHaveCount(5);
  expect(await options.evaluateAll((os) => os.map((o) => (o as HTMLInputElement).value))).toEqual([
    'raw',
    'basic_infra',
    'standard',
    'turnkey',
    'advise_me',
  ]);
  await expect(page.locator('#bk-support')).toContainText('Just the room');
  await expect(page.locator('#bk-support')).toContainText('You run the day.');
  await expect(page.locator('#bk-support-premium')).toHaveCount(0);
});

test('the kit list includes the PA, so ODD knows to set it up', async ({ page }) => {
  await openForm(page);
  await expect(page.locator('#bk-tech-pa')).toHaveCount(1);
  await expect(page.locator('#bk-tech')).toContainText('come with every booking');
  // A multi-select pill is marked by its fill alone, with no box inside.
  const before = await page
    .locator('label[for="bk-tech-pa"] .chip-face')
    .evaluate((el) => getComputedStyle(el, '::before').content);
  expect(before === 'none' || before === 'normal').toBe(true);
});

test('questions that do not change the quote are not asked', async ({ page }) => {
  await openForm(page);
  for (const name of [
    'catering',
    'caterer_name',
    'cleaning',
    'budget_band',
    'music_past_2200',
    'media',
    'accessibility_notes',
    'referral_source',
  ]) {
    await expect(page.locator(`#bookingEnquiryForm [name="${name}"]`), name).toHaveCount(0);
  }
});

test('the date is picked from the calendar and cannot be typed', async ({ page }) => {
  await openForm(page);
  const date = page.locator('#bk-date');
  await date.focus();
  await page.keyboard.type('12122026');
  await expect(date).toHaveValue('');
});

test('times come in quarter hours only', async ({ page }) => {
  await openForm(page);
  const values = await page
    .locator('#bk-from option:not([disabled])')
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  expect(values).toHaveLength(96);
  expect(values[0]).toBe('00:00');
  expect(values[values.length - 1]).toBe('23:45');
  expect(values.every((v) => /^\d{2}:(00|15|30|45)$/.test(v))).toBe(true);
  expect(await page.locator('#bk-from').evaluate((el) => el.tagName)).toBe('SELECT');
});

test('an end time before the start means the next day', async ({ page }) => {
  await openForm(page);
  await fillStep(page, 1);
  await page.selectOption('#bk-from', '20:00');
  await page.selectOption('#bk-until', '02:00');
  await expect(page.locator('#bk-when-summary')).toHaveText(/6 hours .* next day at 02:00/);
  // Quarter hours read as hours and minutes, never as a decimal.
  await page.selectOption('#bk-from', '09:15');
  await page.selectOption('#bk-until', '22:00');
  await expect(page.locator('#bk-when-summary')).toHaveText(
    '12 hours 45 minutes in total, until 22:00.',
  );
  await page.selectOption('#bk-from', '20:00');
  await page.selectOption('#bk-until', '02:00');
  await fillFrom(page, 1, { skipFill: true });
  await expect(page.locator('#bk-review')).toContainText('20:00 to 02:00 the next day, 6 hours');
  const sent = await sendAndCapture(page);
  const start = new Date(sent.get_in).getTime();
  const end = new Date(sent.get_out).getTime();
  expect(end - start).toBe(6 * 3_600_000);
});

test('a multi-day event needs a last day after the first', async ({ page }) => {
  await openForm(page);
  await fillStep(page, 1);
  await page.check('input[name="multi_day"]');
  await next(page);
  await expect(page.locator('#bk-when-err')).toHaveText(/last day/i);
  await page.fill('#bk-enddate', dateIn(42));
  await expect(page.locator('#bk-when-err')).toBeHidden();
  await next(page, 2);
});

test('a date inside 5 working days shows the lead-time warning but still sends', async ({
  page,
}) => {
  await openForm(page);
  await fillStep(page, 1, { days: 2 });
  await expect(page.locator('#bk-notice')).toContainText(/5 working days/);
  await fillFrom(page, 1, { skipFill: true, days: 2 });
  // The summary repeats it, next to Send.
  await expect(page.locator('#bk-review-notes')).toContainText(/5 working days/);
  await page.route(SUBMIT, (r) => ok(r));
  await page.click(NEXT);
  await expect(page.locator('#bk-done')).toBeVisible();
});

// --- Rooms and layouts ----------------------------------------------------------

test('an enquiry without a layout, other dates or smoke still sends', async ({ page }) => {
  await openForm(page);
  await reach(page, 2);
  await page.fill('#bk-estimate', '80');
  await page.check('#bk-space-gallery');
  await next(page, 3);
  await fillFrom(page, 3);
  await expect(page.locator('#bk-review')).toContainText('Not decided yet');
  const sent = await sendAndCapture(page);
  expect(sent.layout).toBeUndefined();
  expect(sent.alt_date_1).toBeUndefined();
  expect(sent.pyro_flame).toBe('no');
  expect(sent.media).toEqual([]);
});

test('ticking smoke or flame asks what is planned and sends yes', async ({ page }) => {
  await openForm(page);
  await reach(page, 4);
  await fillStep(page, 4);
  await page.check('input[name="has_pyro"]');
  await next(page);
  await expect(page.locator('#bk-pyro-detail-err')).toBeVisible();
  await page.fill('#bk-pyro-detail', 'Candles on the tables.');
  await fillFrom(page, 4, { skipFill: true });
  const sent = await sendAndCapture(page);
  expect(sent.pyro_flame).toBe('yes');
  expect(sent.pyro_flame_detail).toBe('Candles on the tables.');
});

test('the Auditorium has fixed seating, so no layout is asked and theatre is sent', async ({
  page,
}) => {
  await openForm(page);
  await reach(page, 2);
  await fillStep(page, 2);
  // A layout chosen for another room first must not leak through.
  await page.check('#bk-layout-cabaret');
  await page.check('#bk-space-auditorium');
  await expect(page.locator('#bk-layout')).toBeHidden();
  await expect(page.locator('.bk-fixed')).toBeVisible();
  await page.fill('#bk-estimate', '40');
  await next(page, 3);
  await fillFrom(page, 3);
  await expect(page.locator('#bk-review')).toContainText('Fixed tiered seating');
  const sent = await sendAndCapture(page);
  expect(sent.space).toBe('auditorium');
  expect(sent.layout).toBe('theatre');
});

test('the same holds for the Auditorium with the Aula, and returns for other rooms', async ({
  page,
}) => {
  await openForm(page);
  await reach(page, 2);
  await page.check('#bk-space-auditorium_aula');
  await expect(page.locator('#bk-layout')).toBeHidden();
  await page.check('#bk-space-second_floor');
  await expect(page.locator('#bk-layout')).toBeVisible();
  await expect(page.locator('.bk-fixed')).toBeHidden();
});

test('a headcount over the room shows a warning but does not block', async ({ page }) => {
  await openForm(page);
  await reach(page, 2);
  await fillStep(page, 2);
  await page.check('#bk-space-auditorium');
  await page.fill('#bk-estimate', '120');
  await expect(page.locator('#bk-capacity')).toContainText('seats 50');
  await expect(page.locator('#bk-steward')).toBeVisible();
  await next(page, 3);
  await fillFrom(page, 3);
  await expect(page.locator('#bk-review-notes')).toContainText('seats 50');
  const sent = await sendAndCapture(page);
  expect(sent.headcount_estimate).toBe(120);
  expect(sent.headcount_band).toBe('101_199');
});

test('the space descriptions still match the event info pack', async ({ page }) => {
  // SPACE_INFO in booking-enquiry-schema.ts copies these figures from the
  // pack. If the pack changes and the form does not, this fails.
  await page.goto('/oddspace/event-info-pack/');
  const pack = page.locator('main');
  for (const figure of ['150 people, 320 m²', '30 people', '50 seated', '230 people', '150.2 m²']) {
    await expect(pack).toContainText(figure);
  }
  await expect(pack).toContainText(/fixed tiered seating/i);
  await expect(pack).toContainText(/emergency exit only/i);
  await expect(pack).toContainText(/Sturenkatu/);
});

// --- Check and send -------------------------------------------------------------

test('the summary shows every answer, and Edit returns to it', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await expect(page.locator('#bk-count')).toHaveText('Ready to send');
  await expect(page.locator(NEXT)).toHaveText('Send enquiry');
  const review = page.locator('#bk-review');
  for (const text of [
    '14:00 to 22:00, 8 hours',
    '80',
    'Gallery',
    'Autumn launch',
    'Room + technician',
    'test@example.com',
  ]) {
    await expect(review).toContainText(text);
  }
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    'within one working day',
  );

  await page.getByRole('button', { name: 'Edit People and room' }).click();
  await expect(stepHead(page, 2)).toBeVisible();
  await expect(page.locator(NEXT)).toHaveText('Back to summary');
  await page.fill('#bk-estimate', '95');
  await next(page, 'review');
  await expect(review).toContainText('95');
  await expect(page.locator(NEXT)).toHaveText('Send enquiry');
});

test('Send without consent stays on the summary and marks it', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.uncheck('input[name="consent_privacy"]');
  await page.click(NEXT);
  await expect(stepHead(page, 'review')).toBeVisible();
  await expect(page.locator('#bk-consent-err')).toBeVisible();
  // The footer names what is missing, in the words of the Send button.
  await expect(page.locator('#bookingEnquiryForm .form-status')).toHaveText(
    'Tick the privacy box to send.',
  );
  await page.check('input[name="consent_privacy"]');
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    'within one working day',
  );
});

test('a valid enquiry posts the spec payload and shows the thank-you', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  const sent = await sendAndCapture(page);

  expect(sent.submission_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent.locale).toBe('en');
  expect(sent.source).toContain('/oddspace/venue');
  expect(sent.hp_field).toBe('');
  expect(sent.contact_email).toBe('test@example.com');
  expect(sent.is_member).toBe(false);
  expect(sent.membership_tier).toBeUndefined();
  expect(sent.consent_privacy).toBe(true);
  expect(sent.event_type).toBe('launch');
  // "Invited guests only" fills both of the spec's fields.
  expect(sent.event_visibility).toBe('private');
  expect(sent.event_access).toBe('invite_only');
  // Helsinki wall-clock time with an explicit offset, whatever zone the
  // browser runs in.
  expect(sent.get_in).toMatch(/T14:00:00\+0[23]:00$/);
  expect(sent.get_out).toMatch(/T22:00:00\+0[23]:00$/);
  expect(sent.get_in.slice(0, 10)).toBe(sent.get_out.slice(0, 10));
  expect(sent.headcount_estimate).toBe(80);
  expect(sent.headcount_band).toBe('51_100');
  expect(sent.space).toBe('gallery');
  expect(sent.layout).toBe('cocktail');
  expect(sent.support_level).toBe('basic_infra');
  expect(sent.alcohol).toBe('served');
  expect(sent.music).toBe('background');
  expect(sent.pyro_flame).toBe('no');
  // Settled after booking, so never sent.
  for (const k of ['catering', 'cleaning', 'budget_band', 'music_past_2200']) {
    expect(sent[k], k).toBeUndefined();
  }
  // Hidden conditional fields are not sent at all.
  expect(sent.mic_count).toBeUndefined();
  expect(sent.pyro_flame_detail).toBeUndefined();
  expect(sent.series_count).toBeUndefined();
  expect(sent.tech).toEqual([]);
  // UI-only questions never reach the Worker.
  for (const k of [
    'event_date',
    'time_from',
    'time_until',
    'audience',
    'multi_day',
    'has_alt_dates',
    'has_pyro',
  ]) {
    expect(sent[k]).toBeUndefined();
  }

  const done = page.locator('#bk-done');
  await expect(done).toBeVisible();
  await expect(done).toContainText('test@example.com');
  await expect(done).toBeFocused();
  await expect(page.locator('#bk-count')).toHaveText('Sent');
  await expect(page.locator('#bookingEnquiryForm')).toBeHidden();

  // Closing it leaves the page saying so, in place of the button.
  await done.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator(DIALOG)).toBeHidden();
  await expect(page.locator('#bk-sent')).toBeVisible();
  await expect(page.locator('#bk-open')).toBeHidden();
  await expect(page.locator('#bk-sticky')).not.toHaveClass(/is-shown/);
});

test('a 202 (queued) is treated as success', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => ok(r, 202));
  await page.click(NEXT);
  await expect(page.locator('#bk-done')).toBeVisible();
});

test('a server error keeps the answers and reuses the same submission id on retry', async ({
  page,
}) => {
  await openForm(page);
  await fillValid(page);
  const ids: string[] = [];
  let calls = 0;
  await page.route(SUBMIT, (route) => {
    ids.push(route.request().postDataJSON().submission_id);
    calls++;
    return calls === 1
      ? route.fulfill({ status: 502, contentType: 'application/json', body: '{"ok":false}' })
      : ok(route);
  });
  await page.click(NEXT);
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    /did not go through/,
  );
  await expect(page.locator('#bk-title')).toHaveValue('Autumn launch');
  await expect(page.locator(NEXT)).toBeEnabled();

  await page.click(NEXT);
  await expect(page.locator('#bk-done')).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});

test('a network failure is reported without breaking the page', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => r.abort('failed'));
  await page.click(NEXT);
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(/hello@oddfest.co/);
  await expect(page.locator('#bookingEnquiryForm')).toBeVisible();
});

test('a 429 says to wait', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) =>
    r.fulfill({ status: 429, contentType: 'application/json', body: '{"ok":false}' }),
  );
  await page.click(NEXT);
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    /Wait a few minutes/,
  );
});

test("the Worker's 400 takes the visitor to the step it belongs to", async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) =>
    r.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        errors: {
          contact_email: 'That email address does not look right.',
          get_out: 'Get-out has to be after get-in.',
          event_access: 'How do guests get in?',
        },
      }),
    }),
  );
  await page.click(NEXT);
  // The first one is on step 1, so that is where it goes.
  await expect(stepHead(page, 1)).toBeVisible();
  // Payload fields the form asks as a different question land on that one.
  await expect(page.locator('#bk-when')).toHaveClass(/is-invalid/);
  await expect(page.locator('#bk-date')).toBeFocused();
  await expect(page.locator('#bk-audience')).toHaveClass(/is-invalid/);
  await expect(page.locator('#bk-email-err')).toHaveText(/does not look right/);
});

test('a double click sends exactly one request', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  let calls = 0;
  await page.route(SUBMIT, async (route) => {
    calls++;
    await new Promise((r) => setTimeout(r, 400));
    return ok(route);
  });
  await page.locator(NEXT).dblclick();
  await expect(page.locator('#bk-done')).toBeVisible();
  expect(calls).toBe(1);
});

test('choices work from the keyboard', async ({ page }) => {
  await openForm(page);
  await reach(page, 2);
  await page.focus('#bk-space-gallery');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#bk-space-aula')).toBeChecked();
  await fillStep(page, 2);
  await next(page, 3);
  await page.focus('#bk-type-launch');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#bk-type-exhibition')).toBeChecked();
  await fillStep(page, 3);
  await next(page, 4);
  await page.focus('#bk-tech-projector');
  await page.keyboard.press('Space');
  await expect(page.locator('#bk-tech-projector')).toBeChecked();
});
