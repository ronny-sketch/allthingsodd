import { test, expect, type Page } from '@playwright/test';

// /work-with-odd writes the enquiry to Attio via the Growth OS Worker, and —
// added 2026-09-11 — also emails partners@oddfest.co. The email is the half
// that matters here: the Attio write alone was silent, so partnership
// enquiries accumulated in a CRM nobody was told to check.
//
// The interesting behaviour is what happens when only one of the two lands,
// because that is invisible to a visitor and the form is free to claim
// whatever it likes. These tests pin those cases down.

const ENQUIRY = '**/api/business-enquiry';
const SUBMIT = 'https://api.web3forms.com/submit';
const KEY = 'key-partnering';

// Astro collapses an empty string attribute to a bare `data-notify-key` with
// no `=""`, which is what ships today while the key is unset — so match both
// spellings or this rewrite silently no-ops and every test below passes for
// the wrong reason.
const NOTIFY_ATTR = /data-notify-key(="[^"]*")?/;

// Matches the page document only. A `**/work-with-odd**` glob also catches
// Astro's per-page CSS chunk (`/_astro/work-with-odd.<hash>.css`), which is
// not HTML and has no attribute to rewrite.
const PAGE = /\/work-with-odd\/?(\?[^#]*)?$/;

// Fetched once and served from memory — see contact-routing.spec.ts's note on
// why a route.fetch() per test goes flaky under a full-suite parallel run.
let pageHtml: string;

test.beforeAll(async () => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';
  pageHtml = await (await fetch(`${base}/work-with-odd`)).text();
  expect(pageHtml, 'the enquiry form should carry a notify-key attribute to rewrite').toMatch(
    NOTIFY_ATTR,
  );
});

async function openForm(page: Page, notifyKey: string | null = KEY) {
  await page.route(PAGE, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: pageHtml.replace(NOTIFY_ATTR, `data-notify-key="${notifyKey ?? ''}"`),
    }),
  );
  await page.goto('/work-with-odd');
  // See contact-routing.spec.ts — wait for the submit handler, not just the
  // markup.
  await expect(page.locator('#workEnquiryForm')).toHaveAttribute('data-ready', 'true');
  await page.locator('#workEnquiryForm').scrollIntoViewIfNeeded();
}

async function fillAndSend(page: Page) {
  await page.fill('#we-name', 'Jane Doe');
  await page.fill('#we-email', 'jane@examplecorp.com');
  await page.fill('#we-org', 'Example Corp');
  await page.selectOption('#we-interest', 'strategic_partnership');
  await page.fill('#we-goal', 'We want to sponsor.');
  await page.click('#workEnquiryForm button[type="submit"]');
}

function stubCrm(page: Page, ok: boolean) {
  return page.route(ENQUIRY, (route) =>
    route.fulfill({
      status: ok ? 200 : 502,
      contentType: 'application/json',
      body: JSON.stringify(
        ok
          ? { ok: true, message: "Thanks — we've received this and will get back to you soon." }
          : { ok: false, message: "We couldn't submit this right now." },
      ),
    }),
  );
}

test('a partnership enquiry emails partnerships as well as writing to the CRM', async ({
  page,
}) => {
  await openForm(page);
  await stubCrm(page, true);
  const captured = page.waitForRequest(SUBMIT);
  await page.route(SUBMIT, (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"success":true}' }),
  );

  await fillAndSend(page);

  const sent = (await captured).postDataJSON();
  expect(sent.access_key).toBe(KEY);
  // Readable in an inbox — not the raw products.yml enum.
  expect(sent.subject).toContain('ODD');
  expect(sent.subject).toContain('Example Corp');
  expect(sent.subject).not.toContain('strategic_partnership');
  // A reply must reach the enquirer; this form's field is work_email, which
  // Web3Forms would not pick up as reply-to on its own.
  expect(sent.replyto).toBe('jane@examplecorp.com');
  expect(sent.goal).toBe('We want to sponsor.');

  await expect(page.locator('#workEnquiryForm .form-status')).toContainText('Thanks');
});

test('a failed notification does not fail a submission the CRM accepted', async ({ page }) => {
  await openForm(page);
  await stubCrm(page, true);
  await page.route(SUBMIT, (route) => route.abort());

  await fillAndSend(page);

  await expect(page.locator('#workEnquiryForm .form-status')).toContainText('Thanks');
  await expect(page.locator('#we-name')).toHaveValue('');
});

test('if the CRM is down but the email landed, the enquiry is not lost and is not reported as failed', async ({
  page,
}) => {
  await openForm(page);
  await stubCrm(page, false);
  const captured = page.waitForRequest(SUBMIT);
  await page.route(SUBMIT, (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"success":true}' }),
  );

  await fillAndSend(page);

  // The team holds every field by email, so telling the visitor to try again
  // would be the false statement.
  const sent = (await captured).postDataJSON();
  expect(sent.goal).toBe('We want to sponsor.');
  await expect(page.locator('#workEnquiryForm .form-status')).toContainText('Thanks');
  await expect(page.locator('#we-name')).toHaveValue('');
});

test('when both fail the visitor is told, and the form keeps what they typed', async ({ page }) => {
  await openForm(page);
  await stubCrm(page, false);
  await page.route(SUBMIT, (route) => route.abort());

  await fillAndSend(page);

  await expect(page.locator('#workEnquiryForm .form-status')).toContainText("couldn't submit");
  // Losing a filled-in enquiry to a transient outage would be the worst
  // outcome of all — the visitor must be able to retry without retyping.
  await expect(page.locator('#we-goal')).toHaveValue('We want to sponsor.');
});

test('with no partnering key the form behaves exactly as it did before', async ({ page }) => {
  await openForm(page, null);
  await stubCrm(page, true);
  let emailed = false;
  await page.route(SUBMIT, (route) => {
    emailed = true;
    return route.fulfill({ contentType: 'application/json', body: '{"success":true}' });
  });

  await fillAndSend(page);

  await expect(page.locator('#workEnquiryForm .form-status')).toContainText('Thanks');
  expect(emailed).toBe(false);
});
