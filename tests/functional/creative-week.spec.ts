import { test, expect, type Page, type Route } from '@playwright/test';

// The ODDfest 2027 Creative Week submission on /oddfest/ (2026-10-04). The
// Worker route is mocked here, so these tests assert on what the browser
// actually POSTs and on how the page reacts to every answer the Worker can
// give, including answers it should not trust. Whether the Worker writes
// the right Notion record is covered by its own tests in ../odd-growth-os
// (worker/src/creative-week/creative-week.test.ts).

test.describe.configure({ timeout: 90_000 });

const PAGE = '/oddfest/';
const SUBMIT = '**/api/creative-week-submission';
const NEXT = '#creativeWeekForm .cw-next';
const BACK = '#creativeWeekForm .cw-back';
const DIALOG = '#cw-dialog';
const ASK = 'a[href="/oddfest/#creative-week-form"]';

test.beforeEach(async ({ context }) => {
  // Keep the newsletter popup's real timer from landing on a long form test.
  await context.addInitScript(() => {
    localStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

async function load(page: Page, { keepConsentBanner = false, url = PAGE } = {}) {
  await page.goto(url);
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  if (!keepConsentBanner) {
    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.locator('[data-consent-banner]')).not.toHaveClass(/is-visible/);
  }
  await expect(page.locator('#creativeWeekForm')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function openForm(page: Page) {
  await load(page);
  await page.locator(`.oddfest-hero-cta ${ASK}`).click();
  await expect(page.locator(DIALOG)).toBeVisible();
}

const stepHead = (page: Page, step: number | 'review') => page.locator(`#cw-step-${step}`);

async function next(page: Page, expectStep?: number | 'review') {
  await page.click(NEXT);
  if (expectStep !== undefined) await expect(stepHead(page, expectStep)).toBeVisible();
}

// Valid answers for one step, on the step that is showing. Only what is
// required, so optional questions are left empty.
async function fillStep(page: Page, step: number) {
  switch (step) {
    case 1:
      await page.fill('#cw-title', 'TEST night walk');
      await page.fill('#cw-desc', 'A guided walk through Vallila.\nWith three short performances.');
      await page.check('#cw-kind-mix');
      await page.check('#cw-format-tour');
      await page.check('#cw-field-performing_arts');
      return;
    case 2:
      await page.check('#cw-ready-early_idea');
      await page.fill('#cw-needed', 'A route permit');
      return;
    case 3:
      await page.check('#cw-venue-not_relevant');
      await page.check('#cw-timing-flexible');
      return;
    case 4:
      await page.check('#cw-audience-general_public');
      await page.check('#cw-access-undecided');
      await page.fill('#cw-capacity', '40 per walk');
      return;
    case 5:
      await page.check('#cw-help-visibility');
      await page.fill('#cw-help-details', 'Mostly visibility.');
      await page.check('#cw-money-not_sure');
      return;
    case 6:
      await page.fill('#cw-name', 'TEST Person');
      await page.fill('#cw-email', 'test@example.com');
      await page.fill('#cw-phone', '+358 40 123 4567');
      await page.fill('#cw-org', 'TEST collective');
      await page.fill('#cw-web', '@testcollective');
      await page.check('#cw-applicant-collective');
      return;
  }
}

async function tickAll(page: Page) {
  await page.check('input[name="ack_selection"]');
  await page.check('input[name="ack_responsibility"]');
  await page.check('input[name="consent_privacy"]');
}

// Walks every step with valid answers and lands on the summary, ticked.
async function fillValid(page: Page) {
  for (let s = 1; s <= 6; s++) {
    await fillStep(page, s);
    await next(page, s === 6 ? 'review' : s + 1);
  }
  await tickAll(page);
}

const fulfil = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// The Worker's real answers, echoing the id the browser sent.
const answer = (status: number, state: string) => (route: Route) =>
  fulfil(route, status, {
    ok: true,
    status: state,
    submission_id: route.request().postDataJSON().submission_id,
  });

// --- Opening and closing ----------------------------------------------------

test('every "Submit an event idea" on the page opens the dialog', async ({ page }) => {
  await load(page);
  const asks = page.locator(ASK);
  await expect(asks).toHaveCount(3);
  for (const where of ['.oddfest-hero-cta', '#join', '.oddf-bring']) {
    await page.locator(`${where} ${ASK}`).click();
    await expect(page.locator(DIALOG)).toBeVisible();
    await expect(page).toHaveURL(/#creative-week-form$/);
    await page.keyboard.press('Escape');
    await expect(page.locator(DIALOG)).toBeHidden();
    await expect(page).not.toHaveURL(/#creative-week-form/);
  }
  // The question and partner routes are untouched.
  await expect(page.locator('#join a[href="/contact/?topic=oddfest_2027_question"]')).toBeVisible();
  await expect(
    page.locator('a[href="/work-with-odd/?interest=strategic_partnership#enquiry-form"]'),
  ).toHaveCount(1);
});

test('× closes it, and the answers are still there when it reopens', async ({ page }) => {
  await openForm(page);
  await page.fill('#cw-title', 'Kept');
  await page.click(`${DIALOG} .cw-close`);
  await expect(page.locator(DIALOG)).toBeHidden();
  await page.locator(`#join ${ASK}`).click();
  await expect(page.locator('#cw-title')).toHaveValue('Kept');
});

test("the phone's back button closes it and stays on the page", async ({ page }) => {
  await openForm(page);
  await page.goBack();
  await expect(page.locator(DIALOG)).toBeHidden();
  await expect(page).toHaveURL(/\/oddfest\/$/);
});

test('arriving with #creative-week-form opens it, and back then closes it', async ({ page }) => {
  await page.goto(PAGE);
  await page.goto(`${PAGE}#creative-week-form`);
  await expect(page.locator('#creativeWeekForm')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.goBack();
  await expect(page.locator(DIALOG)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(PAGE);
});

test('opened on arrival, closing it puts focus on the first ask', async ({ page }) => {
  await page.goto(`${PAGE}#creative-week-form`);
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(DIALOG)).toBeHidden();
  await expect(page.locator(`.oddfest-hero-cta ${ASK}`)).toBeFocused();
});

test('closing returns focus to the ask that opened it', async ({ page }) => {
  await load(page);
  const join = page.locator(`#join ${ASK}`);
  await join.click();
  await page.keyboard.press('Escape');
  await expect(join).toBeFocused();
});

test('the drawn cursor moves into the dialog while it is open, and back after', async ({
  page,
}) => {
  // The dialog is painted in the top layer, above the cursor's z-index.
  await load(page);
  const parentOfCursor = () =>
    page.evaluate(() => {
      const c = document.querySelector('.cursor');
      return c?.parentElement?.id || c?.parentElement?.tagName || null;
    });
  expect(await parentOfCursor()).toBe('BODY');
  await page.locator(`#join ${ASK}`).click();
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect.poll(parentOfCursor).toBe('cw-dialog');
  await page.keyboard.press('Escape');
  await expect(page.locator(DIALOG)).toBeHidden();
  // The cursor goes back in the dialog's `close` event, which the browser
  // fires as its own task after the dialog is already hidden.
  await expect.poll(parentOfCursor).toBe('BODY');
});

test('no timed popup opens it, and the newsletter popup stays away while it is open', async ({
  page,
}) => {
  await load(page);
  await page.waitForTimeout(1500);
  await expect(page.locator(DIALOG)).toBeHidden();
  await expect(page.locator(DIALOG)).toHaveAttribute('data-suppress-newsletter-popup', '');
});

test('the sticky bar shows only while no other way in is on screen', async ({ page }) => {
  await load(page);
  const sticky = page.locator('#cw-sticky');
  await expect(sticky).not.toHaveClass(/is-shown/);
  // Past the hero, between asks.
  await page.locator('.oddf-layer').scrollIntoViewIfNeeded();
  await expect(sticky).toHaveClass(/is-shown/);
  // How to join has its own button.
  await page.locator(`#join ${ASK}`).scrollIntoViewIfNeeded();
  await expect(sticky).not.toHaveClass(/is-shown/);
  // Back between asks, then the bar opens the dialog.
  await page.locator('.oddf-layer').scrollIntoViewIfNeeded();
  await expect(sticky).toHaveClass(/is-shown/);
  await page.click('.cw-sticky-cta');
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(sticky).not.toHaveClass(/is-shown/);
});

test('the sticky bar stays down while the cookie banner is up', async ({ page }) => {
  await load(page, { keepConsentBanner: true });
  await page.locator('.oddf-layer').scrollIntoViewIfNeeded();
  await expect(page.locator('#cw-sticky')).not.toHaveClass(/is-shown/);
});

// --- Steps and checks ---------------------------------------------------------

test('Next checks the current step only, and sends nothing', async ({ page }) => {
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return r.abort();
  });
  await openForm(page);
  await next(page);
  await expect(stepHead(page, 1)).toBeVisible();
  for (const id of [
    '#cw-title-err',
    '#cw-desc-err',
    '#cw-kind-err',
    '#cw-format-err',
    '#cw-field-err',
  ]) {
    await expect(page.locator(id)).toBeVisible();
  }
  await expect(page.locator('#cw-why-err')).toBeHidden();
  await expect(page.locator('#creativeWeekForm .form-status')).toHaveText(
    '5 answers needed to continue.',
  );
  await expect(page.locator('#cw-title')).toBeFocused();
  // A mark clears the moment its question is answered.
  await page.fill('#cw-title', 'TEST');
  await expect(page.locator('#cw-title-err')).toBeHidden();
  expect(posted).toBe(false);
});

test('Back never checks anything', async ({ page }) => {
  await openForm(page);
  await fillStep(page, 1);
  await next(page, 2);
  await page.click(BACK);
  await expect(stepHead(page, 1)).toBeVisible();
  await expect(page.locator('#creativeWeekForm .field.is-invalid')).toHaveCount(0);
});

test('a wrong email address is flagged on leaving the field', async ({ page }) => {
  await openForm(page);
  for (let s = 1; s <= 5; s++) {
    await fillStep(page, s);
    await next(page, s + 1);
  }
  await page.fill('#cw-email', 'not-an-email');
  await page.press('#cw-email', 'Tab');
  await expect(page.locator('#cw-email-err')).toHaveText('That email address does not look right.');
});

test('every Other asks for its words, and only while Other is picked', async ({ page }) => {
  await openForm(page);
  await expect(page.locator('#cw-format-other-text')).toBeHidden();
  await page.check('input[name="formats"][value="other"]');
  await expect(page.locator('#cw-format-other-text')).toBeVisible();
  await fillStep(page, 1);
  await next(page);
  await expect(page.locator('#cw-format-other-err')).toHaveText('Tell us what you mean by other.');
  await page.uncheck('input[name="formats"][value="other"]');
  await expect(page.locator('#cw-format-other-text')).toBeHidden();
  await next(page, 2);
});

test('the venue is asked only when one is in mind, and space needs only when it is open', async ({
  page,
}) => {
  await openForm(page);
  await fillStep(page, 1);
  await next(page, 2);
  await fillStep(page, 2);
  await next(page, 3);
  await expect(page.locator('#cw-venue-name')).toBeHidden();
  await expect(page.locator('#cw-space')).toBeHidden();
  await page.check('#cw-venue-in_discussion');
  await expect(page.locator('#cw-venue-name')).toBeVisible();
  await expect(page.locator('#cw-space')).toBeHidden();
  await page.check('#cw-venue-outdoor_open');
  await expect(page.locator('#cw-venue-name')).toBeHidden();
  await expect(page.locator('#cw-space')).toBeVisible();
  await page.check('#cw-timing-flexible');
  await next(page);
  await expect(page.locator('#cw-space-err')).toHaveText('Tell us what kind of space you need.');
  await page.fill('#cw-space', 'A courtyard for 50.');
  await next(page, 4);
});

test('the summary shows every answer, and Edit returns to it', async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  const review = page.locator('#cw-review');
  for (const text of [
    'TEST night walk',
    'A mix of both',
    'Tour / walk',
    'Performing arts',
    'It is an early idea — we are exploring how to make it happen',
    'A route permit',
    'A physical venue is not relevant for the event',
    'Flexible / not decided yet',
    'General public',
    'Not decided yet',
    '40 per walk',
    'Visibility through the shared ODDfest programme and campaign',
    'Mostly visibility.',
    'Not sure yet',
    'TEST Person',
    'test@example.com',
    '+358 40 123 4567',
    'TEST collective',
    '@testcollective',
    'Collective / community',
  ]) {
    await expect(review).toContainText(text);
  }
  await page.getByRole('button', { name: 'Edit Where and when' }).click();
  await expect(stepHead(page, 3)).toBeVisible();
  await expect(page.locator(NEXT)).toHaveText('Back to summary');
  await page.check('#cw-timing-whole_week');
  await next(page, 'review');
  await expect(review).toContainText('Runs throughout the week');
});

test('Send without the acknowledgements and consent stays on the summary and marks them', async ({
  page,
}) => {
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return r.abort();
  });
  await openForm(page);
  for (let s = 1; s <= 6; s++) {
    await fillStep(page, s);
    await next(page, s === 6 ? 'review' : s + 1);
  }
  await page.click(NEXT);
  await expect(stepHead(page, 'review')).toBeVisible();
  await expect(page.locator('#cw-ack-selection-err')).toBeVisible();
  await expect(page.locator('#cw-ack-responsibility-err')).toBeVisible();
  await expect(page.locator('#cw-consent-err')).toHaveText(
    'We can only store your idea if you agree to this.',
  );
  expect(posted).toBe(false);
});

// --- Sending --------------------------------------------------------------------

test('a valid idea posts every answer under the Worker contract and shows the thank-you', async ({
  page,
}) => {
  await page.route(SUBMIT, answer(200, 'delivered'));
  await openForm(page);
  await page.check('input[name="formats"][value="other"]');
  await page.fill('#cw-format-other-text', 'Listening walk');
  await fillStep(page, 1);
  await page.fill('#cw-why', 'To meet another scene.');
  await next(page, 2);
  await fillStep(page, 2);
  await page.fill('#cw-involved', 'Two dancers');
  await next(page, 3);
  await page.check('#cw-venue-agreed');
  await page.fill('#cw-venue-name', 'Vallila, along Mäkelänkatu');
  await page.check('#cw-timing-several_days');
  await page.fill('#cw-timing-notes', 'Evenings only');
  await next(page, 4);
  await fillStep(page, 4);
  await next(page, 5);
  await fillStep(page, 5);
  await next(page, 6);
  await fillStep(page, 6);
  await page.fill('#cw-links', 'https://example.com/one');
  await page.fill('#cw-notes', 'Nothing else.');
  await page.check('#cw-referral-instagram');
  await next(page, 'review');
  await tickAll(page);

  const req = page.waitForRequest(SUBMIT);
  await page.click(NEXT);
  const body = (await req).postDataJSON();
  expect(body.submission_id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  const { submission_id: _id, ...rest } = body;
  expect(rest).toEqual({
    source: '/oddfest/',
    hp_field: '',
    full_name: 'TEST Person',
    email: 'test@example.com',
    phone: '+358 40 123 4567',
    org_name: 'TEST collective',
    website: '@testcollective',
    applicant_type: 'collective',
    title: 'TEST night walk',
    description: 'A guided walk through Vallila.\nWith three short performances.',
    event_kind: 'mix',
    formats: ['tour', 'other'],
    formats_other: 'Listening walk',
    fields: ['performing_arts'],
    motivation: 'To meet another scene.',
    readiness: 'early_idea',
    involved: 'Two dancers',
    still_needed: 'A route permit',
    venue_status: 'agreed',
    venue: 'Vallila, along Mäkelänkatu',
    timing_flexibility: 'several_days',
    timing_notes: 'Evenings only',
    audiences: ['general_public'],
    access: 'undecided',
    capacity: '40 per walk',
    help: ['visibility'],
    help_details: 'Mostly visibility.',
    financing: 'not_sure',
    links: 'https://example.com/one',
    notes: 'Nothing else.',
    referral: 'instagram',
    ack_selection: true,
    ack_responsibility: true,
    consent_privacy: true,
  });

  const done = page.locator('#cw-done');
  await expect(done).toBeVisible();
  await expect(done.locator('[data-done="delivered"]')).toBeVisible();
  await expect(done.locator('[data-done="queued"]')).toBeHidden();
  await expect(done).toContainText('test@example.com');
  await expect(done.locator('[data-done-ref]')).toHaveText(
    body.submission_id.slice(0, 8).toUpperCase(),
  );
  await expect(done).toBeFocused();
  await page.click('.cw-done-close');
  await expect(page.locator('#cw-sent')).toBeVisible();
  await expect(page.locator('#cw-sticky')).not.toHaveClass(/is-shown/);
});

for (const state of ['queued', 'emailed'] as const) {
  test(`"${state}" gets its own words`, async ({ page }) => {
    await page.route(SUBMIT, answer(202, state));
    await openForm(page);
    await fillValid(page);
    await page.click(NEXT);
    const done = page.locator('#cw-done');
    await expect(done.locator(`[data-done="${state}"]`)).toBeVisible();
    for (const other of ['delivered', 'queued', 'emailed'].filter((x) => x !== state)) {
      await expect(done.locator(`[data-done="${other}"]`)).toBeHidden();
    }
    // An emailed idea is never described as saved or queued.
    if (state === 'emailed')
      await expect(done.locator('[data-done="emailed"]')).not.toContainText(/queue|saved/i);
  });
}

test('a 2xx the Worker did not mean as success is not shown as one', async ({ page }) => {
  const replies: [number, unknown][] = [
    [200, { ok: true, submission_id: 'x' }],
    [200, { ok: true, status: 'delivered' }],
    [202, { ok: true, status: 'delivered', submission_id: null }],
    [200, { ok: false, status: 'delivered' }],
    [204, null],
  ];
  let i = 0;
  await page.route(SUBMIT, (r) => {
    const [status, body] = replies[i++]!;
    return status === 204 ? r.fulfill({ status }) : fulfil(r, status, body);
  });
  await openForm(page);
  await fillValid(page);
  for (let k = 0; k < replies.length; k++) {
    await page.click(NEXT);
    await expect(page.locator('#creativeWeekForm .form-status')).toContainText(
      'Your idea did not go through',
    );
    await expect(page.locator('#cw-done')).toBeHidden();
  }
});

test('a failure keeps the answers and retries with the same submission id', async ({ page }) => {
  const ids: string[] = [];
  let first = true;
  await page.route(SUBMIT, (r) => {
    ids.push(r.request().postDataJSON().submission_id);
    if (first) {
      first = false;
      return fulfil(r, 503, { ok: false, status: 'failed', message: 'x' });
    }
    return answer(200, 'delivered')(r);
  });
  await openForm(page);
  await fillValid(page);
  await page.click(NEXT);
  await expect(page.locator('#creativeWeekForm .form-status')).toContainText(
    'Your answers are still here',
  );
  await expect(page.locator(NEXT)).toBeEnabled();
  await page.click(NEXT);
  await expect(page.locator('#cw-done [data-done="delivered"]')).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});

test('a network failure is reported without breaking the page', async ({ page }) => {
  await page.route(SUBMIT, (r) => r.abort('failed'));
  await openForm(page);
  await fillValid(page);
  await page.click(NEXT);
  await expect(page.locator('#creativeWeekForm .form-status')).toContainText(
    'Your idea did not go through',
  );
  await expect(page.locator('#cw-title')).toHaveValue('TEST night walk');
});

test('a 429 says to wait', async ({ page }) => {
  await page.route(SUBMIT, (r) => fulfil(r, 429, { ok: false, message: 'Too many' }));
  await openForm(page);
  await fillValid(page);
  await page.click(NEXT);
  await expect(page.locator('#creativeWeekForm .form-status')).toContainText('Wait a few minutes');
});

test("the Worker's 400 takes the visitor to the question it refused", async ({ page }) => {
  await page.route(SUBMIT, (r) =>
    fulfil(r, 400, {
      ok: false,
      status: 'invalid',
      message: 'Some answers need another look.',
      errors: { capacity: 'A rough estimate is enough.' },
    }),
  );
  await openForm(page);
  await fillValid(page);
  await page.click(NEXT);
  await expect(stepHead(page, 4)).toBeVisible();
  await expect(page.locator('#cw-capacity-err')).toHaveText('A rough estimate is enough.');
});

test('a double click sends exactly one request', async ({ page }) => {
  let count = 0;
  await page.route(SUBMIT, async (r) => {
    count++;
    await new Promise((res) => setTimeout(res, 400));
    return answer(200, 'delivered')(r);
  });
  await openForm(page);
  await fillValid(page);
  await page.dblclick(NEXT);
  await expect(page.locator('#cw-done')).toBeVisible();
  expect(count).toBe(1);
});

test('choices work from the keyboard', async ({ page }) => {
  await openForm(page);
  await page.focus('#cw-kind-professional_exchange');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#cw-kind-art_experience')).toBeChecked();
  await page.focus('#cw-format-tour');
  await page.keyboard.press('Space');
  await expect(page.locator('#cw-format-tour')).toBeChecked();
});
