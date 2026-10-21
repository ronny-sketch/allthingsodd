import { test, expect } from '../base';
import type { Page, Route } from '@playwright/test';

// The ODDspace membership form at /oddspace/membership/#join (2026-10-21).
// The Worker route is mocked, so these tests assert on what the browser
// POSTs and on how the page answers each reply. Whether the Worker writes
// Notion, posts to Slack and books the visit is covered by its own tests in
// ../odd-growth-os (worker/src/membership/membership.test.ts).

test.describe.configure({ timeout: 60_000 });

const PAGE = '/oddspace/membership/';
const SUBMIT = '**/api/membership-enquiry';
const SEND = '#membershipForm button[type="submit"]';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oddNewsletterPopupSeen', '1');
  });
});

async function load(page: Page, hash = '') {
  await page.goto(`${PAGE}${hash}`);
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.getByRole('button', { name: 'Reject all' }).click();
  await expect(page.locator('#membershipForm')).toHaveAttribute('data-ready', 'true');
}

const slots = (page: Page) => page.locator('#msf-slots .msf-slot');
const days = (page: Page) => page.locator('#msf-days .msf-slot');

async function fillValid(page: Page) {
  await page.check('#msf-visit-viewing');
  await slots(page).nth(1).click();
  await page.check('#msf-start-next_month');
  await page.check('#msf-use-few_days');
  await page.fill('#msf-name', 'TEST Anna Virtanen');
  await page.fill('#msf-email', 'anna@example.com');
  await page.fill('#msf-works', 'Ceramics and set design');
  await page.check('#msf-consent');
}

const fulfil = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

test('"Come and see it first" lands on the form with a viewing chosen', async ({ page }) => {
  await load(page);
  await page.getByRole('link', { name: 'Come and see it first' }).first().click();
  await expect(page).toHaveURL(/#join-visit$/);
  await expect(page.locator('#msf-visit-viewing')).toBeChecked();
  await expect(page.locator('.msf-times')).toBeVisible();
  await expect(days(page).first()).toBeVisible();
  await expect(slots(page)).toHaveCount(14);
  await expect(slots(page).first()).toHaveText('10:00');
  await expect(slots(page).last()).toHaveText('16:30');
});

test('every "Apply for membership" leads to the form on this page', async ({ page }) => {
  await load(page);
  const applies = page.locator('a[href="#join"]');
  expect(await applies.count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('a[href*="/work-with-odd/"]')).toHaveCount(0);
});

test('picks are kept across days and capped at three', async ({ page }) => {
  await load(page, '#join-visit');
  await slots(page).nth(0).click();
  await slots(page).nth(3).click();
  await days(page).nth(2).click();
  await slots(page).nth(0).click();
  await expect(page.locator('#msf-picks')).toContainText('Your picks (3 of 3)');
  await expect(slots(page).nth(1)).toBeDisabled();
  await expect(days(page).nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(days(page).nth(1)).toHaveAttribute('aria-pressed', 'false');
  // Unpicking frees a place again.
  await slots(page).nth(0).click();
  await expect(slots(page).nth(1)).toBeEnabled();
});

test('a trial day offers days, and "ready to join" asks for no time', async ({ page }) => {
  await load(page);
  await page.check('#msf-visit-trial_day');
  await expect(page.locator('#msf-times-legend')).toHaveText('Pick up to three days');
  await expect(days(page)).toHaveCount(0);
  await expect(slots(page).first()).toHaveText(/^(Mon|Tue|Wed|Thu|Fri) \d+ [A-Z][a-z]{2}$/);
  await page.check('#msf-visit-ready');
  await expect(page.locator('.msf-times')).toBeHidden();
});

test('says what is missing, next to each question, without sending', async ({ page }) => {
  let posted = false;
  await page.route(SUBMIT, (r) => {
    posted = true;
    return fulfil(r, 500, {});
  });
  await load(page);
  await page.check('#msf-visit-coffee');
  await page.check('#msf-team');
  await page.click(SEND);
  await expect(page.locator('#msf-err-times')).toHaveText('Pick at least one time.');
  await expect(page.locator('#msf-err-team_size')).toContainText('How many of you?');
  await expect(page.locator('#msf-err-name')).toHaveText('Tell us your name.');
  await expect(page.locator('#msf-err-consent_privacy')).toBeVisible();
  expect(posted).toBe(false);
});

test('sends the answers the Worker expects and says thank you', async ({ page }) => {
  let body: Record<string, unknown> = {};
  await page.route(SUBMIT, (r) => {
    body = r.request().postDataJSON();
    return fulfil(r, 200, { ok: true, status: 'delivered', submission_id: body.submission_id });
  });
  await load(page);
  await fillValid(page);
  await page.check('#msf-team');
  await page.fill('#msf-team-size', '4');
  await page.fill('#msf-link', 'instagram.com/anna.makes');
  await page.click(SEND);

  await expect(page.locator('#msf-done')).toBeVisible();
  await expect(page.locator('#msf-done-title')).toHaveText('Thanks, TEST.');
  await expect(page.locator('#msf-done-body')).toContainText('confirm it by email');
  await expect(page.locator('#membershipForm')).toBeHidden();

  expect(body).toMatchObject({
    name: 'TEST Anna Virtanen',
    email: 'anna@example.com',
    works_on: 'Ceramics and set design',
    link: 'instagram.com/anna.makes',
    use: 'few_days',
    team: true,
    team_size: 4,
    studio: false,
    start: 'next_month',
    visit: 'viewing',
    consent_privacy: true,
    newsletter: false,
    hp_field: '',
    locale: 'en',
    source: PAGE,
  });
  expect(body.submission_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(body.times).toHaveLength(1);
  expect(String((body.times as string[])[0])).toMatch(/^\d{4}-\d{2}-\d{2}T10:30:00\+0[23]:00$/);
});

test("shows the Worker's own field errors and keeps the answers", async ({ page }) => {
  await page.route(SUBMIT, (r) =>
    fulfil(r, 400, {
      ok: false,
      status: 'invalid',
      errors: { email: 'That email address does not look right.' },
    }),
  );
  await load(page);
  await fillValid(page);
  await page.click(SEND);
  await expect(page.locator('#msf-err-email')).toHaveText(
    'That email address does not look right.',
  );
  await expect(page.locator('#msf-name')).toHaveValue('TEST Anna Virtanen');
});

test('never says "thanks" for a reply it cannot trust', async ({ page }) => {
  // 200, but for a different id: not this visitor's request.
  await page.route(SUBMIT, (r) =>
    fulfil(r, 200, { ok: true, status: 'delivered', submission_id: 'someone-else' }),
  );
  await load(page);
  await fillValid(page);
  await page.click(SEND);
  await expect(page.locator('#msf-status')).toContainText('may not have reached us');
  await expect(page.locator('#msf-done')).toBeHidden();
  await expect(page.locator(SEND)).toBeEnabled();
});

test('a network failure keeps the answers and offers the email address', async ({ page }) => {
  await page.route(SUBMIT, (r) => r.abort('failed'));
  await load(page);
  await fillValid(page);
  await page.click(SEND);
  await expect(page.locator('#msf-status')).toContainText('hello@oddfest.co');
  await expect(page.locator('#msf-works')).toHaveValue('Ceramics and set design');
});
