import { test, expect, type Page, type Route } from '@playwright/test';

// The ODDspace booking enquiry form on /oddspace/venue (2026-09-23). The
// Worker route is mocked here, so these tests assert on what the browser
// actually POSTs and on how the page reacts to each answer the Worker can
// give. Whether the Worker writes the right Notion record is covered by the
// Worker's own tests in ../odd-growth-os.

// Filling roughly thirty fields takes a few seconds per test on its own, and
// much longer when the whole suite shares one preview server.
test.describe.configure({ timeout: 90_000 });

const VENUE = '/oddspace/venue/';
const SUBMIT = '**/api/booking-enquiry';

test.beforeEach(async ({ context }) => {
  // Same reason as interactions.spec.ts: keep the newsletter popup's real
  // timer from landing on top of a long form test.
  await context.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

async function openForm(page: Page) {
  await page.goto(VENUE);
  await expect(page.locator('#bookingEnquiryForm')).toHaveAttribute('data-ready', 'true');
}

// A local "YYYY-MM-DDTHH:mm" some days ahead, for the datetime-local fields.
function localIn(days: number, hour: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`;
}

async function fillValid(page: Page, { days = 40 } = {}) {
  await page.fill('#bk-first', 'Test');
  await page.fill('#bk-last', 'Person');
  await page.fill('#bk-email', 'test@example.com');
  await page.selectOption('#bk-orgtype', 'company');
  await page.check('input[name="is_member"][value="false"]');
  await page.fill('#bk-title', 'Autumn launch');
  await page.fill('#bk-desc', 'A product launch with a short talk and drinks.');
  await page.selectOption('#bk-type', 'launch');
  await page.check('input[name="event_visibility"][value="private"]');
  await page.check('input[name="event_access"][value="invite_only"]');
  await page.fill('#bk-getin', localIn(days, 14));
  await page.fill('#bk-getout', localIn(days, 22));
  await page.check('input[name="headcount_band"][value="51_100"]');
  await page.selectOption('#bk-space', 'gallery');
  await page.selectOption('#bk-layout', 'cocktail');
  await page.selectOption('#bk-support', 'basic_infra');
  await page.selectOption('#bk-catering', 'own_caterer');
  await page.fill('#bk-caterer', 'Test Catering Oy');
  await page.check('input[name="alcohol"][value="served"]');
  await page.check('input[name="music"][value="background"]');
  await page.check('input[name="music_past_2200"][value="no"]');
  await page.check('input[name="pyro_flame"][value="no"]');
  await page.check('input[name="cleaning"][value="via_odd"]');
  await page.selectOption('#bk-budget', '1000_2500');
  await page.check('input[name="consent_privacy"]');
}

const ok = (route: Route, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, submission_id: 'x' }),
  });

test('the venue page carries the form and its CTAs point at it', async ({ page }) => {
  await openForm(page);
  await expect(page.locator('#booking-form')).toHaveCount(1);
  // The hero CTA now lands on the form, not on the generic Work with ODD form.
  const heroCta = page.locator('a[href="#booking-form"]').first();
  await expect(heroCta).toBeVisible();
});

test('an empty submit sends nothing and lists what is missing', async ({ page }) => {
  await openForm(page);
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return ok(r);
  });
  await page.click('#bookingEnquiryForm button[type="submit"]');
  const summary = page.locator('#bk-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(page.locator('#bk-first-err')).toHaveText(/first name/i);
  await expect(page.locator('#bk-email-err')).toBeVisible();
  await expect(page.locator('#bk-consent-err')).toBeVisible();
  await expect(page.locator('#bk-first')).toHaveAttribute('aria-invalid', 'true');
  expect(posted).toBe(false);
});

test('conditional fields appear only when they apply', async ({ page }) => {
  await openForm(page);
  const tier = page.locator('#bk-tier');
  await expect(tier).toBeHidden();
  await page.check('input[name="is_member"][value="true"]');
  await expect(tier).toBeVisible();
  await page.check('input[name="is_member"][value="false"]');
  await expect(tier).toBeHidden();

  await expect(page.locator('#bk-late')).toBeHidden();
  await page.check('input[name="music"][value="dj"]');
  await expect(page.locator('#bk-late')).toBeVisible();
  await page.check('input[name="music"][value="none"]');
  await expect(page.locator('#bk-late')).toBeHidden();

  await expect(page.locator('#bk-mics')).toBeHidden();
  await page.check('input[name="tech"][value="mics"]');
  await expect(page.locator('#bk-mics')).toBeVisible();

  await expect(page.locator('#bk-layout-custom')).toBeHidden();
  await page.selectOption('#bk-layout', 'custom');
  await expect(page.locator('#bk-layout-custom')).toBeVisible();
});

test('get-out before get-in is refused', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.fill('#bk-getout', localIn(40, 10));
  await page.click('#bookingEnquiryForm button[type="submit"]');
  await expect(page.locator('#bk-getout-err')).toHaveText(/after get-in/i);
});

test('a date inside 5 working days shows the lead-time warning but still sends', async ({
  page,
}) => {
  await openForm(page);
  await fillValid(page, { days: 2 });
  await expect(page.locator('#bk-notice')).toBeVisible();
  await expect(page.locator('#bk-notice')).toContainText(/5 working days/);
  await page.route(SUBMIT, (r) => ok(r));
  await page.click('#bookingEnquiryForm button[type="submit"]');
  await expect(page.locator('#bk-done')).toBeVisible();
});

test('a valid enquiry posts the spec payload and shows the thank-you state', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => ok(r));
  const req = page.waitForRequest(SUBMIT);
  await page.click('#bookingEnquiryForm button[type="submit"]');
  const sent = (await req).postDataJSON();

  expect(sent.submission_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent.locale).toBe('en');
  expect(sent.source).toContain('/oddspace/venue');
  expect(sent.hp_field).toBe('');
  expect(sent.contact_email).toBe('test@example.com');
  expect(sent.is_member).toBe(false);
  expect(sent.membership_tier).toBeUndefined();
  expect(sent.consent_privacy).toBe(true);
  expect(sent.event_type).toBe('launch');
  // Helsinki wall-clock time with an explicit offset, whatever zone the
  // browser runs in.
  expect(sent.get_in).toMatch(/T14:00:00\+0[23]:00$/);
  expect(sent.get_out).toMatch(/T22:00:00\+0[23]:00$/);
  expect(sent.headcount_band).toBe('51_100');
  expect(sent.caterer_name).toBe('Test Catering Oy');
  expect(sent.music_past_2200).toBe('no');
  // Hidden conditional fields are not sent at all.
  expect(sent.mic_count).toBeUndefined();
  expect(sent.pyro_flame_detail).toBeUndefined();
  expect(sent.tech).toEqual([]);

  await expect(page.locator('#bk-done')).toBeVisible();
  await expect(page.locator('#bk-done')).toContainText('test@example.com');
  await expect(page.locator('#bookingEnquiryForm')).toBeHidden();
});

test('a 202 (queued) is treated as success', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => ok(r, 202));
  await page.click('#bookingEnquiryForm button[type="submit"]');
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
  await page.click('#bookingEnquiryForm button[type="submit"]');
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    /did not go through/,
  );
  await expect(page.locator('#bk-title')).toHaveValue('Autumn launch');
  await expect(page.locator('#bookingEnquiryForm button[type="submit"]')).toBeEnabled();

  await page.click('#bookingEnquiryForm button[type="submit"]');
  await expect(page.locator('#bk-done')).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});

test('a network failure is reported without breaking the page', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) => r.abort('failed'));
  await page.click('#bookingEnquiryForm button[type="submit"]');
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(/hello@oddfest.co/);
  await expect(page.locator('#bookingEnquiryForm')).toBeVisible();
});

test('a 429 says to wait', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) =>
    r.fulfill({ status: 429, contentType: 'application/json', body: '{"ok":false}' }),
  );
  await page.click('#bookingEnquiryForm button[type="submit"]');
  await expect(page.locator('#bookingEnquiryForm .form-status')).toContainText(
    /Wait a few minutes/,
  );
});

test("field errors from the Worker's 400 land on the right fields", async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.route(SUBMIT, (r) =>
    r.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        errors: { contact_email: 'That email address does not look right.' },
      }),
    }),
  );
  await page.click('#bookingEnquiryForm button[type="submit"]');
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
  const btn = page.locator('#bookingEnquiryForm button[type="submit"]');
  await btn.dblclick();
  await expect(page.locator('#bk-done')).toBeVisible();
  expect(calls).toBe(1);
});
