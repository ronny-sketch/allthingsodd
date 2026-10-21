import { test, expect } from '../base';
import type { Page, Route } from '@playwright/test';

// The ODDspace membership enquiry on /oddspace/membership (redesigned
// 2026-10-21, .design/membership-form): a three-step dialog whose second
// and third steps depend on the visit chosen. The Worker route is mocked,
// so these tests assert on what the browser POSTs and on how the page
// answers each reply. Whether the Worker writes Notion, posts to Slack and
// books the visit is covered by its own tests in ../odd-growth-os
// (worker/src/membership/membership.test.ts).

test.describe.configure({ timeout: 60_000 });

const PAGE = '/oddspace/membership/';
const SUBMIT = '**/api/membership-enquiry';
const NEXT = '#membershipForm .msf-next';

// The times offered depend on the hour (18 h lead for a viewing), so the
// clock is fixed: Wednesday 08:00 in Helsinki, which makes Thursday the first
// day and offers all fourteen of its times. Timers still run.
const NOW = new Date('2026-10-21T08:00:00+03:00');

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

async function load(page: Page, hash = '') {
  await page.clock.setFixedTime(NOW);
  await page.goto(`${PAGE}${hash}`);
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect(page.locator('#membershipForm')).toHaveAttribute('data-ready', 'true');
}

const dialog = (page: Page) => page.locator('#msf-dialog');
const count = (page: Page) => page.locator('#msf-count');
const slots = (page: Page) => page.locator('#msf-slots .msf-slot');
const days = (page: Page) => page.locator('#msf-days .msf-slot');

async function open(page: Page) {
  await page.locator('#msf-open').click();
  await expect(dialog(page)).toBeVisible();
}

/** Step 1 by tapping a card, which moves on by itself. */
async function chooseVisit(page: Page, visit: string) {
  await page.locator(`label[for="msf-visit-${visit}"]`).click();
  await expect(count(page)).toHaveText('Step 2 of 3');
}

async function fillAbout(page: Page) {
  await page.fill('#msf-name', 'TEST Anna Virtanen');
  await page.fill('#msf-email', 'anna@example.com');
  await page.fill('#msf-works', 'Ceramics and set design');
  await page.fill('#msf-link', 'instagram.com/anna.makes');
  await page.check('#msf-consent');
}

/** A look round with one time picked, at step 3 and filled in. */
async function viewingReady(page: Page) {
  await open(page);
  await chooseVisit(page, 'viewing');
  await slots(page).nth(1).click();
  await page.click(NEXT);
  await expect(count(page)).toHaveText('Step 3 of 3');
  await fillAbout(page);
}

const fulfil = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

test('"Come and see it first" opens the times, with a look round chosen', async ({ page }) => {
  await load(page);
  await page.getByRole('link', { name: 'Come and see it first' }).first().click();
  await expect(dialog(page)).toBeVisible();
  await expect(page).toHaveURL(/#join-visit$/);
  await expect(count(page)).toHaveText('Step 2 of 3');
  await expect(page.locator('#msf-visit-viewing')).toBeChecked();
  await expect(page.locator('#msf-times-title')).toHaveText('When suits you?');
  await expect(days(page).first()).toHaveText('Thu 22 Oct');
  await expect(slots(page)).toHaveCount(14);
  await expect(slots(page).first()).toHaveText('10:00');
  await expect(slots(page).last()).toHaveText('16:30');
});

test('every "Apply for membership" opens the enquiry on this page', async ({ page }) => {
  await load(page);
  const applies = page.locator('a[href="#join"]');
  expect(await applies.count()).toBeGreaterThanOrEqual(2);
  // The nav and footer still link to Work with ODD; only the membership
  // detour (intent=membership) is gone.
  await expect(page.locator('a[href*="intent=membership"]')).toHaveCount(0);
  await applies.first().click();
  await expect(dialog(page)).toBeVisible();
  await expect(count(page)).toHaveText('Step 1 of 3');
  // Esc closes it and takes the #join entry back off the history.
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page).not.toHaveURL(/#join/);
});

test('picks are kept across days, capped at three, and can be removed', async ({ page }) => {
  await load(page, '#join-visit');
  await slots(page).nth(0).click();
  await slots(page).nth(3).click();
  await days(page).nth(2).click();
  await slots(page).nth(0).click();
  await expect(page.locator('#msf-picks')).toContainText('Your picks (3 of 3)');
  await expect(slots(page).nth(1)).toBeDisabled();
  await expect(days(page).nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(days(page).nth(1)).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Remove Thu 22 Oct, 10:00' }).click();
  await expect(page.locator('#msf-picks')).toContainText('Your picks (2 of 3)');
  await expect(slots(page).nth(1)).toBeEnabled();
});

test('a visit is not asked when to start or how they would use it', async ({ page }) => {
  await load(page);
  await open(page);
  await chooseVisit(page, 'viewing');
  await expect(page.locator('[data-step="membership"]')).toBeHidden();
  await slots(page).first().click();
  await page.click(NEXT);
  await expect(page.locator('#msf-start-this_month')).toBeHidden();
  await expect(page.locator('#msf-heard')).toBeHidden();
  await expect(page.locator('#msf-phone')).toBeVisible();
  await expect(page.locator(NEXT)).toHaveText('Send');
});

test('a trial day offers days and needs a phone number', async ({ page }) => {
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return fulfil(r, 500, {});
  });
  await load(page);
  await open(page);
  await chooseVisit(page, 'trial_day');
  await expect(page.locator('#msf-times-title')).toHaveText('Which days could you come?');
  await expect(days(page)).toHaveCount(0);
  await expect(slots(page).first()).toHaveText(/^(Mon|Tue|Wed|Thu|Fri) \d+ [A-Z][a-z]{2}$/);
  await slots(page).first().click();
  await page.click(NEXT);
  await fillAbout(page);
  await page.click(NEXT);
  await expect(page.locator('#msf-err-phone')).toContainText('phone number for a trial day');
  expect(posted).toBe(false);
});

test('coffee does not ask for a phone number', async ({ page }) => {
  await load(page);
  await open(page);
  await chooseVisit(page, 'coffee');
  await expect(page.locator('#msf-times-title')).toHaveText('Which Mondays could you come?');
  await slots(page).first().click();
  await page.click(NEXT);
  await expect(page.locator('#msf-phone')).toBeHidden();
});

test('"ready to join" asks start, use, team and studio, and explains ODDstudio', async ({
  page,
}) => {
  await load(page);
  await open(page);
  await chooseVisit(page, 'ready');
  await expect(page.locator('[data-step="membership"]')).toBeVisible();
  await expect(page.locator('#msf-start-just_curious')).toHaveCount(0);
  await page.click(NEXT);
  await expect(page.locator('#msf-err-start')).toHaveText('When would you like to start?');
  await expect(page.locator('#msf-err-use')).toBeVisible();
  await page.getByText("What's ODDstudio?").click();
  await expect(page.locator('.msf-more')).toContainText('€100 / month');
  await page.check('#msf-start-next_month');
  await page.check('#msf-use-most_weekdays');
  await page.check('#msf-team');
  await page.click(NEXT);
  await expect(page.locator('#msf-err-team_size')).toContainText('How many of you?');
  await page.fill('#msf-team-size', '3');
  await page.click(NEXT);
  await expect(count(page)).toHaveText('Step 3 of 3');
  await expect(page.locator('#msf-heard')).toBeVisible();
});

test('says what is missing on each step, without sending', async ({ page }) => {
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return fulfil(r, 500, {});
  });
  await load(page);
  await open(page);
  await page.click(NEXT);
  await expect(page.locator('#msf-err-visit')).toBeVisible();
  await chooseVisit(page, 'viewing');
  await page.click(NEXT);
  await expect(page.locator('#msf-err-times')).toHaveText('Pick at least one time.');
  await slots(page).first().click();
  await page.click(NEXT);
  await page.click(NEXT);
  await expect(page.locator('#msf-err-name')).toHaveText('Tell us your name.');
  await expect(page.locator('#msf-err-link')).toContainText('Add a link to your work');
  await expect(page.locator('#msf-err-consent_privacy')).toBeVisible();
  expect(posted).toBe(false);
});

test('sends only what the path asks and says thank you', async ({ page }) => {
  let body: Record<string, unknown> = {};
  await page.route(SUBMIT, (r) => {
    body = r.request().postDataJSON();
    return fulfil(r, 200, { ok: true, status: 'delivered', submission_id: body.submission_id });
  });
  await load(page);
  await viewingReady(page);
  await page.click(NEXT);

  await expect(page.locator('#msf-done')).toBeVisible();
  await expect(page.locator('#msf-done-title')).toHaveText('Thanks, TEST.');
  await expect(page.locator('#msf-done-body')).toContainText('confirm it by email');
  // Their picks, repeated so a wrong day can be caught now.
  await expect(page.locator('#msf-done-list li')).toHaveText(['Thu 22 Oct, 10:30']);
  await expect(page.locator('#membershipForm')).toBeHidden();

  expect(body).toMatchObject({
    name: 'TEST Anna Virtanen',
    email: 'anna@example.com',
    works_on: 'Ceramics and set design',
    link: 'instagram.com/anna.makes',
    visit: 'viewing',
    consent_privacy: true,
    newsletter: false,
    hp_field: '',
    locale: 'en',
    source: PAGE,
  });
  for (const key of ['start', 'use', 'team', 'team_size', 'studio', 'heard']) {
    expect(body, key).not.toHaveProperty(key);
  }
  expect(body.submission_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(body.times).toHaveLength(1);
  expect(String((body.times as string[])[0])).toMatch(/^\d{4}-\d{2}-\d{2}T10:30:00\+0[23]:00$/);

  // Closed, the page's own ask has become the confirmation.
  await page.locator('#msf-done .msf-done-close').click();
  await expect(page.locator('#msf-sent')).toBeVisible();
  await expect(page.locator('#msf-open')).toBeHidden();
});

test("shows the Worker's own field errors on the step that holds them", async ({ page }) => {
  await page.route(SUBMIT, (r) =>
    fulfil(r, 400, {
      ok: false,
      status: 'invalid',
      errors: { times: 'One of those times is no longer available. Please pick again.' },
    }),
  );
  await load(page);
  await viewingReady(page);
  await page.click(NEXT);
  await expect(count(page)).toHaveText('Step 2 of 3');
  await expect(page.locator('#msf-err-times')).toContainText('no longer available');
  await expect(page.locator('#msf-picks')).toBeEmpty();
});

test("says so in the Worker's words when the bot check fails", async ({ page }) => {
  await page.route(SUBMIT, (r) =>
    fulfil(r, 403, {
      ok: false,
      message: "We couldn't confirm this came from a person. Please reload the page and try again.",
    }),
  );
  await load(page);
  await viewingReady(page);
  await page.click(NEXT);
  await expect(page.locator('#msf-status')).toContainText(
    "couldn't confirm this came from a person",
  );
  await expect(page.locator('#msf-name')).toHaveValue('TEST Anna Virtanen');
});

test('never says "thanks" for a reply it cannot trust', async ({ page }) => {
  // 200, but for a different id: not this visitor's request.
  await page.route(SUBMIT, (r) =>
    fulfil(r, 200, { ok: true, status: 'delivered', submission_id: 'someone-else' }),
  );
  await load(page);
  await viewingReady(page);
  await page.click(NEXT);
  await expect(page.locator('#msf-status')).toContainText('may not have reached us');
  await expect(page.locator('#msf-done')).toBeHidden();
  await expect(page.locator(NEXT)).toBeEnabled();
});

test('a network failure keeps the answers and offers the email address', async ({ page }) => {
  await page.route(SUBMIT, (r) => r.abort('failed'));
  await load(page);
  await viewingReady(page);
  await page.click(NEXT);
  await expect(page.locator('#msf-status')).toContainText('hello@oddfest.co');
  await expect(page.locator('#msf-works')).toHaveValue('Ceramics and set design');
});

test('the newsletter popup stays away once the enquiry has been opened', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => localStorage.removeItem('oddNewsletterPopupSeen'));
  await page.clock.install({ time: NOW });
  await page.goto(PAGE);
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect(page.locator('#membershipForm')).toHaveAttribute('data-ready', 'true');
  await open(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await page.clock.fastForward(20_000);
  await expect(page.locator('#newsletterPopup')).toBeHidden();
});
