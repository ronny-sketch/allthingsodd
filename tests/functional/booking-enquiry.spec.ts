import { test, expect, type Page, type Route } from '@playwright/test';

// The ODDspace booking enquiry form on /oddspace/venue (2026-09-23, reworked
// 2026-09-24). The Worker route is mocked here, so these tests assert on what
// the browser actually POSTs and on how the page reacts to each answer the
// Worker can give. Whether the Worker writes the right Notion record is
// covered by the Worker's own tests in ../odd-growth-os.

// Filling roughly thirty questions takes a few seconds per test on its own,
// and much longer when the whole suite shares one preview server.
test.describe.configure({ timeout: 90_000 });

const VENUE = '/oddspace/venue/';
const SUBMIT = '**/api/booking-enquiry';
const SEND = '#bookingEnquiryForm button[type="submit"]';

test.beforeEach(async ({ context }) => {
  // Same reason as interactions.spec.ts: keep the newsletter popup's real
  // timer from landing on top of a long form test.
  await context.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

async function openForm(page: Page, { keepConsentBanner = false } = {}) {
  await page.goto(VENUE);
  // global.css sets `scroll-behavior: smooth` on <html> with no
  // reduced-motion branch, so Playwright's own scroll-into-view glides, and a
  // click can land on the pill next to the one aimed at. Instant scrolling
  // here; the site-wide rule is a separate follow-up.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  // The cookie banner floats over the foot of the screen and would sit on
  // top of whichever pill a test scrolls to. Answer it, as a visitor would,
  // unless the test is about the two sharing the screen.
  if (!keepConsentBanner) {
    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.locator('[data-consent-banner]')).not.toHaveClass(/is-visible/);
  }
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
  // The form starts closed behind one button.
  await page.click('#bk-open');
  await expect(page.locator('#bookingEnquiryForm')).toBeVisible();
  // A web font swapping in mid-test moves the pills by a few pixels, which
  // is enough for a click aimed at one to land on its neighbour.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

// A local "YYYY-MM-DD" some days ahead, for the date fields.
function dateIn(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function fillValid(page: Page, { days = 40 } = {}) {
  await page.fill('#bk-date', dateIn(days));
  await page.selectOption('#bk-from', '14:00');
  await page.selectOption('#bk-until', '22:00');
  await page.fill('#bk-estimate', '80');
  await page.check('#bk-space-gallery');
  await page.check('#bk-layout-cocktail');
  await page.fill('#bk-title', 'Autumn launch');
  await page.check('#bk-type-launch');
  await page.check('#bk-audience-private');
  await page.fill('#bk-desc', 'A product launch with a short talk and drinks.');
  await page.check('#bk-support-basic_infra');
  await page.check('#bk-alcohol-served');
  await page.check('#bk-music-background');
  await page.fill('#bk-first', 'Test');
  await page.fill('#bk-last', 'Person');
  await page.fill('#bk-email', 'test@example.com');
  await page.check('#bk-orgtype-company');
  await page.check('#bk-member-false');
  await page.check('input[name="consent_privacy"]');
}

const ok = (route: Route, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, submission_id: 'x' }),
  });

async function sendAndCapture(page: Page) {
  await page.route(SUBMIT, (r) => ok(r));
  const req = page.waitForRequest(SUBMIT);
  await page.click(SEND);
  return (await req).postDataJSON();
}

test('the form starts closed and one button opens it', async ({ page }) => {
  await page.goto(VENUE);
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.getByRole('button', { name: 'Reject all' }).click();
  const form = page.locator('#bookingEnquiryForm');
  await expect(form).toHaveAttribute('data-ready', 'true');
  await expect(form).toBeHidden();
  const open = page.locator('#bk-open');
  await expect(open).toBeVisible();
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await expect(open).toHaveAttribute('aria-controls', 'bookingEnquiryForm');
  await open.click();
  await expect(form).toBeVisible();
  await expect(page.locator('#bk-step-1')).toBeFocused();
  await expect(open).toBeHidden();
});

test("the hero's enquiry link opens the form", async ({ page }) => {
  await page.goto(VENUE);
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
  const heroCta = page.locator('a[href="#booking-form"]').first();
  await expect(heroCta).toBeVisible();
  await heroCta.click();
  await expect(page.locator('#bookingEnquiryForm')).toBeVisible();
});

test('arriving with #booking-form opens the form', async ({ page }) => {
  await page.goto(`${VENUE}#booking-form`);
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#bookingEnquiryForm')).toBeVisible();
});

test.describe('the newsletter popup', () => {
  test.beforeEach(async ({ context }) => {
    // Undo the file-wide "already seen", so the popup's own timer runs.
    await context.addInitScript(() => sessionStorage.removeItem('oddNewsletterPopupSeen'));
  });

  test('stays away once the form is open', async ({ page }) => {
    await page.clock.install();
    await page.goto(VENUE);
    await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
    await page.click('#bk-open');
    await page.clock.fastForward(20_000);
    await expect(page.locator('#newsletterPopup')).toBeHidden();
  });

  test('still appears on the venue page when the form was never opened', async ({ page }) => {
    await page.clock.install();
    await page.goto(VENUE);
    await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
    await page.clock.fastForward(20_000);
    await expect(page.locator('#newsletterPopup')).toBeVisible();
  });
});

test('required questions are marked, and the key says what the mark means', async ({ page }) => {
  await openForm(page);
  await expect(page.locator('.booking-key')).toContainText('are required');
  for (const id of ['#bk-when', '#bk-space', '#bk-type', '#bk-audience', '#bk-consent']) {
    await expect(page.locator(`${id} .req`).first()).toBeVisible();
  }
  // Optional questions carry no mark.
  await expect(page.locator('label[for="bk-phone"] .req')).toHaveCount(0);
  await expect(page.locator('#bk-tech .req')).toHaveCount(0);
});

test('an empty submit sends nothing, marks every question and opens the panel', async ({
  page,
}) => {
  await openForm(page);
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return ok(r);
  });
  await page.click(SEND);

  const panel = page.locator('#bk-summary');
  await expect(panel).toBeVisible();
  await expect(panel.locator('#bk-summary-title')).toHaveText(/\d+ answers needed/);
  // Focus goes to the first question, the date.
  await expect(page.locator('#bk-date')).toBeFocused();

  await expect(page.locator('#bk-when')).toHaveClass(/is-invalid/);
  await expect(page.locator('#bk-when-err')).toHaveText(
    /Add the date, a start time and an end time/,
  );
  await expect(page.locator('#bk-first-err')).toHaveText(/first name/i);
  await expect(page.locator('#bk-email-err')).toBeVisible();
  await expect(page.locator('#bk-consent-err')).toBeVisible();
  await expect(page.locator('#bk-first')).toHaveAttribute('aria-invalid', 'true');
  // No message is the context-free "Pick one." any more.
  await expect(page.locator('.field-error:visible', { hasText: /^Pick one\.$/ })).toHaveCount(0);
  expect(posted).toBe(false);
});

test('the panel counts down as questions are answered and links to each one', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.fill('#bk-title', '');
  await page.fill('#bk-email', '');
  await page.click(SEND);

  const title = page.locator('#bk-summary-title');
  await expect(title).toHaveText('2 answers needed');
  await expect(page.locator('#bk-title')).toBeFocused();

  // A link in the panel goes to its question.
  await page.locator('#bk-summary a', { hasText: 'Email' }).click();
  await expect(page.locator('#bk-email')).toBeFocused();

  // Answering clears the mark straight away, without another submit.
  await page.fill('#bk-email', 'test@example.com');
  await expect(page.locator('#bk-email-err')).toBeHidden();
  await expect(title).toHaveText('1 answer needed');

  // "Show me" moves to what is left.
  await page.click('[data-panel-next]');
  await expect(page.locator('#bk-title')).toBeFocused();
  await page.fill('#bk-title', 'Autumn launch');
  await expect(page.locator('#bk-summary')).toBeHidden();
});

test('the panel sits above the cookie banner while the banner is up', async ({ page }) => {
  await openForm(page, { keepConsentBanner: true });
  await page.click(SEND);
  // Polled, because both surfaces slide in.
  await expect
    .poll(async () => {
      const panel = await page.locator('#bk-summary').boundingBox();
      const banner = await page.locator('[data-consent-banner]').boundingBox();
      return panel && banner ? banner.y - (panel.y + panel.height) : -1;
    })
    .toBeGreaterThanOrEqual(0);
  // Once the banner is answered, the panel drops back to the foot.
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect
    .poll(async () => {
      const b = await page.locator('#bk-summary').boundingBox();
      return b ? Math.round(page.viewportSize()!.height - (b.y + b.height)) : -1;
    })
    .toBeLessThanOrEqual(24);
});

test('a wrong email address is flagged on leaving the field', async ({ page }) => {
  await openForm(page);
  await page.fill('#bk-email', 'not-an-address');
  await page.locator('#bk-email').blur();
  await expect(page.locator('#bk-email-err')).toHaveText(/does not look right/);
  await page.fill('#bk-email', 'test@example.com');
  await expect(page.locator('#bk-email-err')).toBeHidden();
});

test('conditional questions appear only when they apply', async ({ page }) => {
  await openForm(page);
  const tier = page.locator('#bk-tier');
  await expect(tier).toBeHidden();
  await page.check('#bk-member-true');
  await expect(tier).toBeVisible();
  await page.check('#bk-member-false');
  await expect(tier).toBeHidden();

  await expect(page.locator('#bk-mics')).toBeHidden();
  await page.check('#bk-tech-mics');
  await expect(page.locator('#bk-mics')).toBeVisible();

  await expect(page.locator('input[name="layout_custom"]')).toBeHidden();
  await page.check('#bk-layout-custom');
  await expect(page.locator('input[name="layout_custom"]')).toBeVisible();

  // Other dates sit behind a tick box.
  await expect(page.locator('#bk-alt1')).toBeHidden();
  await page.check('input[name="has_alt_dates"]');
  await expect(page.locator('#bk-alt1')).toBeVisible();
  await expect(page.locator('#bk-alt2')).toBeVisible();

  await expect(page.locator('#bk-pyro-detail')).toBeHidden();
  await page.check('input[name="has_pyro"]');
  await expect(page.locator('#bk-pyro-detail')).toBeVisible();

  await expect(page.locator('#bk-enddate')).toBeHidden();
  await page.check('input[name="multi_day"]');
  await expect(page.locator('#bk-enddate')).toBeVisible();
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
  // Layout is optional: no mark, and an enquiry without it still goes.
  await expect(page.locator('#bk-layout .req')).toHaveCount(0);
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

test('an enquiry without a layout, other dates or smoke still sends', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.uncheck('#bk-layout-cocktail').catch(() => undefined);
  await page.evaluate(() => {
    document.querySelectorAll<HTMLInputElement>('input[name="layout"]').forEach((r) => {
      r.checked = false;
    });
  });
  const sent = await sendAndCapture(page);
  expect(sent.layout).toBeUndefined();
  expect(sent.alt_date_1).toBeUndefined();
  expect(sent.pyro_flame).toBe('no');
  expect(sent.media).toEqual([]);
});

test('ticking smoke or flame asks what is planned and sends yes', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.check('input[name="has_pyro"]');
  await page.click(SEND);
  await expect(page.locator('#bk-pyro-detail-err')).toBeVisible();
  await page.fill('#bk-pyro-detail', 'Candles on the tables.');
  const sent = await sendAndCapture(page);
  expect(sent.pyro_flame).toBe('yes');
  expect(sent.pyro_flame_detail).toBe('Candles on the tables.');
});

test('the Auditorium has fixed seating, so no layout is asked and theatre is sent', async ({
  page,
}) => {
  await openForm(page);
  await fillValid(page);
  // A layout chosen for another room first must not leak through.
  await page.check('#bk-layout-cabaret');
  await page.check('#bk-space-auditorium');
  await expect(page.locator('#bk-layout')).toBeHidden();
  await expect(page.locator('.bk-fixed')).toBeVisible();
  await page.fill('#bk-estimate', '40');
  const sent = await sendAndCapture(page);
  expect(sent.space).toBe('auditorium');
  expect(sent.layout).toBe('theatre');
});

test('the same holds for the Auditorium with the Aula, and returns for other rooms', async ({
  page,
}) => {
  await openForm(page);
  await page.check('#bk-space-auditorium_aula');
  await expect(page.locator('#bk-layout')).toBeHidden();
  await page.check('#bk-space-second_floor');
  await expect(page.locator('#bk-layout')).toBeVisible();
  await expect(page.locator('.bk-fixed')).toBeHidden();
});

test('a headcount over the room shows a warning but does not block', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.check('#bk-space-auditorium');
  await page.fill('#bk-estimate', '120');
  await expect(page.locator('#bk-capacity')).toContainText('seats 50');
  await expect(page.locator('#bk-steward')).toBeVisible();
  const sent = await sendAndCapture(page);
  expect(sent.headcount_estimate).toBe(120);
  expect(sent.headcount_band).toBe('101_199');
});

test('the space descriptions still match the event info pack', async ({ page }) => {
  // SPACE_INFO in booking-enquiry-schema.ts copies these figures from the
  // pack. If the pack changes and the form does not, this fails.
  await page.goto('/oddspace/event-info-pack/');
  const pack = page.locator('main');
  for (const figure of ['150 people, 320 m²', '30 people', '50 seated', '230 people']) {
    await expect(pack).toContainText(figure);
  }
  await expect(pack).toContainText(/fixed tiered seating/i);
});

test('an end time before the start means the next day', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
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
  const sent = await sendAndCapture(page);
  const start = new Date(sent.get_in).getTime();
  const end = new Date(sent.get_out).getTime();
  expect(end - start).toBe(6 * 3_600_000);
});

test('a multi-day event needs a last day after the first', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.check('input[name="multi_day"]');
  await page.click(SEND);
  await expect(page.locator('#bk-when-err')).toHaveText(/last day/i);
  await page.fill('#bk-enddate', dateIn(42));
  await expect(page.locator('#bk-when-err')).toBeHidden();
});

test('a date inside 5 working days shows the lead-time warning but still sends', async ({
  page,
}) => {
  await openForm(page);
  await fillValid(page, { days: 2 });
  await expect(page.locator('#bk-notice')).toBeVisible();
  await expect(page.locator('#bk-notice')).toContainText(/5 working days/);
  await page.route(SUBMIT, (r) => ok(r));
  await page.click(SEND);
  await expect(page.locator('#bk-done')).toBeVisible();
});

test('a valid enquiry posts the spec payload and shows the thank-you state', async ({ page }) => {
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

  await expect(page.locator('#bk-done')).toBeVisible();
  await expect(page.locator('#bk-done')).toContainText('test@example.com');
  await expect(page.locator('#bookingEnquiryForm')).toBeHidden();
});

test('a 202 (queued) is treated as success', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => ok(r, 202));
  await page.click(SEND);
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
  await page.click(SEND);
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    /did not go through/,
  );
  await expect(page.locator('#bk-title')).toHaveValue('Autumn launch');
  await expect(page.locator(SEND)).toBeEnabled();

  await page.click(SEND);
  await expect(page.locator('#bk-done')).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});

test('a network failure is reported without breaking the page', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => r.abort('failed'));
  await page.click(SEND);
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(/hello@oddfest.co/);
  await expect(page.locator('#bookingEnquiryForm')).toBeVisible();
});

test('a 429 says to wait', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) =>
    r.fulfill({ status: 429, contentType: 'application/json', body: '{"ok":false}' }),
  );
  await page.click(SEND);
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    /Wait a few minutes/,
  );
});

test("field errors from the Worker's 400 land on the right questions", async ({ page }) => {
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
  await page.click(SEND);
  await expect(page.locator('#bk-email-err')).toHaveText(/does not look right/);
  // Payload fields the form asks as a different question land on that one.
  await expect(page.locator('#bk-when')).toHaveClass(/is-invalid/);
  await expect(page.locator('#bk-audience')).toHaveClass(/is-invalid/);
  await expect(page.locator('#bk-summary-title')).toHaveText('3 answers needed');
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
  await page.locator(SEND).dblclick();
  await expect(page.locator('#bk-done')).toBeVisible();
  expect(calls).toBe(1);
});

test('choices work from the keyboard', async ({ page }) => {
  await openForm(page);
  await page.focus('#bk-type-launch');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#bk-type-exhibition')).toBeChecked();
  await page.focus('#bk-tech-projector');
  await page.keyboard.press('Space');
  await expect(page.locator('#bk-tech-projector')).toBeChecked();
  await page.focus('#bk-space-gallery');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#bk-space-aula')).toBeChecked();
});
