import { test, expect, type Page } from '@playwright/test';

// The contact form routes by topic: a Web3Forms access key is bound to one
// recipient address, so the key chosen at submit time IS the delivery
// decision. Getting it wrong does not fail loudly — the visitor still sees
// "Thanks", the message still arrives somewhere, and nobody finds out until a
// sponsor enquiry has been sitting in the wrong inbox for a month. So these
// tests assert on the access_key actually sent to api.web3forms.com, not on
// the UI saying it worked.
//
// Keys are injected by rewriting the server-rendered data-access-keys
// attribute: src/content/pages/contact.json deliberately ships blank keys
// (only a human can create a real one), and a test that skipped when they
// were blank would be a test that never ran.

const SUBMIT = 'https://api.web3forms.com/submit';

const KEYS = {
  general: 'key-general',
  partnering: 'key-partnering',
  oddspace: 'key-oddspace',
  oddfest: 'key-oddfest',
};

type Submission = { access_key: string; subject: string; topic: string };

async function openContact(page: Page, query = '', keys: Partial<typeof KEYS> = KEYS) {
  await page.route('**/contact**', async (route) => {
    const res = await route.fetch();
    const html = await res.text();
    return route.fulfill({
      response: res,
      body: html.replace(
        /data-access-keys="[^"]*"/,
        `data-access-keys="${JSON.stringify(keys).replace(/"/g, '&quot;')}"`,
      ),
    });
  });
  await page.goto(`/contact${query}`);
  await expect(page.locator('#contactForm')).toBeVisible();
}

// Resolves with what the browser actually posted, or rejects the test via a
// timeout if the form never sent — never silently passes.
async function submit(page: Page): Promise<Submission> {
  const captured = page.waitForRequest(SUBMIT);
  await page.route(SUBMIT, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) }),
  );

  await page.fill('#cf-name', 'Test Person');
  await page.fill('#cf-email', 'test@example.com');
  await page.fill('#cf-message', 'Hello');
  await page.click('#contactForm button[type="submit"]');

  return (await captured).postDataJSON() as Submission;
}

test('a general message goes to the general key', async ({ page }) => {
  await openContact(page);
  await expect(page.locator('#cf-topic')).toHaveValue('general');
  const sent = await submit(page);
  expect(sent.access_key).toBe(KEYS.general);
  expect(sent.topic).toBe('general');
});

for (const [topic, key] of [
  ['partnering', KEYS.partnering],
  ['oddspace', KEYS.oddspace],
  ['oddfest', KEYS.oddfest],
] as const) {
  test(`choosing ${topic} sends that topic's key, not the general one`, async ({ page }) => {
    await openContact(page);
    await page.selectOption('#cf-topic', topic);
    const sent = await submit(page);
    expect(sent.access_key).toBe(key);
    expect(sent.access_key).not.toBe(KEYS.general);
  });
}

test('the subject names the topic so a shared inbox can triage it', async ({ page }) => {
  await openContact(page);
  await page.selectOption('#cf-topic', 'oddspace');
  const sent = await submit(page);
  expect(sent.subject).toContain('ODDspace');
  // Names the site it came from — the old oddfest.co site still has its own
  // forms, and the two must be distinguishable in the inbox.
  expect(sent.subject).toContain('allthingsodd.co');
});

test("ODDfest's deep links preselect ODDfest and keep their own wording", async ({ page }) => {
  await openContact(page, '?topic=oddfest_2027_event');
  await expect(page.locator('#cf-topic')).toHaveValue('oddfest');
  await expect(page.locator('#cf-topic-note')).toContainText('event idea');

  const sent = await submit(page);
  expect(sent.access_key).toBe(KEYS.oddfest);
  expect(sent.subject).toContain('ODDfest 2027 — event idea');
});

test('the two ODDfest deep links stay distinguishable in the subject', async ({ page }) => {
  await openContact(page, '?topic=oddfest_2027_question');
  const sent = await submit(page);
  expect(sent.subject).toContain('a question');
  expect(sent.subject).not.toContain('event idea');
});

test('overriding the topic by hand beats the deep link that set it', async ({ page }) => {
  await openContact(page, '?topic=oddfest_2027_event');
  await page.selectOption('#cf-topic', 'oddspace');

  // The deep link's "Regarding: ODDfest 2027 — event idea" note no longer
  // describes what is being sent, so it must not stay on screen.
  await expect(page.locator('#cf-topic-note')).toBeHidden();

  const sent = await submit(page);
  expect(sent.access_key).toBe(KEYS.oddspace);
  expect(sent.subject).not.toContain('event idea');
});

test('a topic with no key yet falls back to the general inbox rather than failing', async ({
  page,
}) => {
  await openContact(page, '', { general: KEYS.general });
  await page.selectOption('#cf-topic', 'oddspace');
  const sent = await submit(page);
  expect(sent.access_key).toBe(KEYS.general);
  // The subject still says ODDspace, so whoever reads the shared inbox can
  // forward it to the right people.
  expect(sent.subject).toContain('ODDspace');
});

test('with no keys at all the form refuses honestly instead of pretending to send', async ({
  page,
}) => {
  await openContact(page, '', {});
  let posted = false;
  await page.route(SUBMIT, (route) => {
    posted = true;
    return route.fulfill({ contentType: 'application/json', body: '{"success":true}' });
  });

  await page.fill('#cf-name', 'Test Person');
  await page.fill('#cf-email', 'test@example.com');
  await page.fill('#cf-message', 'Hello');
  await page.click('#contactForm button[type="submit"]');

  await expect(page.locator('#contactForm .form-status')).toContainText("isn't connected");
  expect(posted).toBe(false);
});
