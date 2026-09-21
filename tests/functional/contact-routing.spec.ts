import { test, expect, type Page } from '@playwright/test';

// The contact form routes by topic: the Worker's /api/contact picks the
// recipient group from the `topic` it receives, and a ?topic= deep link adds
// a `regarding` label the inbox subject uses. Getting either wrong does not
// fail loudly — the visitor still sees "Thanks" — so these tests assert on
// what the browser actually POSTs, not on the UI saying it worked.

const SUBMIT = '**/api/contact';

type Submission = { topic: string; regarding?: string; name: string; email: string };

async function openContact(page: Page, query = '') {
  // `/contact/`, not `/contact`: on Surge the un-slashed form 301s to the
  // slashed one and the redirect drops the query string, so `?topic=` would
  // never reach the form live. astro preview does not redirect, which is
  // exactly how that went unnoticed — see query-string-links.spec.ts.
  await page.goto(`/contact/${query}`);
  // Not just visible — ready. The submit handler is attached by a module
  // script, and clicking before it runs does nothing.
  await expect(page.locator('#contactForm')).toHaveAttribute('data-ready', 'true');
}

// Resolves with what the browser actually posted, or fails the test via a
// timeout if the form never sent — never silently passes.
async function submit(page: Page): Promise<Submission> {
  const captured = page.waitForRequest(SUBMIT);
  await page.route(SUBMIT, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Thanks — test.' }),
    }),
  );
  await page.fill('#cf-name', 'Test Person');
  await page.fill('#cf-email', 'test@example.com');
  await page.fill('#cf-message', 'Hello');
  await page.click('#contactForm button[type="submit"]');
  return (await captured).postDataJSON() as Submission;
}

test('a general message posts topic=general with no deep-link label', async ({ page }) => {
  await openContact(page);
  await expect(page.locator('#cf-topic')).toHaveValue('general');
  const sent = await submit(page);
  expect(sent.topic).toBe('general');
  expect(sent.regarding ?? '').toBe('');
  await expect(page.locator('#contactForm .form-status')).toContainText('Thanks');
});

for (const topic of ['partnering', 'oddspace', 'oddfest'] as const) {
  test(`choosing ${topic} posts that topic`, async ({ page }) => {
    await openContact(page);
    await page.selectOption('#cf-topic', topic);
    const sent = await submit(page);
    expect(sent.topic).toBe(topic);
  });
}

test("ODDfest's deep links preselect ODDfest and keep their own wording", async ({ page }) => {
  await openContact(page, '?topic=oddfest_2027_event');
  await expect(page.locator('#cf-topic')).toHaveValue('oddfest');
  await expect(page.locator('#cf-topic-note')).toContainText('event idea');
  const sent = await submit(page);
  expect(sent.topic).toBe('oddfest');
  expect(sent.regarding).toBe('ODDfest 2027 — event idea');
});

test('the two ODDfest deep links stay distinguishable', async ({ page }) => {
  await openContact(page, '?topic=oddfest_2027_question');
  const sent = await submit(page);
  expect(sent.regarding).toContain('a question');
});

test('overriding the topic by hand beats the deep link that set it', async ({ page }) => {
  await openContact(page, '?topic=oddfest_2027_event');
  await page.selectOption('#cf-topic', 'oddspace');
  // The "Regarding: …" note no longer describes what is being sent.
  await expect(page.locator('#cf-topic-note')).toBeHidden();
  const sent = await submit(page);
  expect(sent.topic).toBe('oddspace');
  expect(sent.regarding ?? '').toBe('');
});

test('a failed send tells the visitor instead of pretending', async ({ page }) => {
  await openContact(page);
  await page.route(SUBMIT, (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Something went wrong — try again.' }),
    }),
  );
  await page.fill('#cf-name', 'Test Person');
  await page.fill('#cf-email', 'test@example.com');
  await page.fill('#cf-message', 'Hello');
  await page.click('#contactForm button[type="submit"]');
  await expect(page.locator('#contactForm .form-status')).toContainText('went wrong');
  await expect(page.locator('#cf-name')).toHaveValue('Test Person'); // not reset
});
