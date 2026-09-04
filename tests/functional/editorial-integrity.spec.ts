import { test, expect } from '@playwright/test';

// Guards the specific editorial facts that drifted between merged branches
// and shipped to production anyway, because nothing compared the rendered
// page to the copy that was approved for it.
//
// Every assertion here corresponds to a real defect found live on
// main @ 3a656fe during the 2026-09-03 final integration pass — none of them
// is a hypothetical. See docs/FINAL_IMPLEMENTATION_MATRIX_2026-09-03.md.

test('home tells the story in the order the copy master specifies', async ({ page }) => {
  await page.goto('/');

  // Source order, not merely "the section exists somewhere" — the two are
  // exactly what a visual snapshot cannot tell apart once a section moves.
  const order = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    return {
      whyOdd: html.indexOf('Why ODD'),
      whatWeDo: html.indexOf('What we do'),
      proof: html.indexOf('Already in motion'),
      audience: html.indexOf('Who ODD is for'),
      whatsHappening: html.indexOf('whats-happening'),
      workWithOdd: html.indexOf('wwo-band'),
      participate: html.indexOf('The way in is by doing'),
    };
  });

  for (const [name, index] of Object.entries(order)) {
    expect(index, `home section "${name}" is missing`).toBeGreaterThan(-1);
  }
  expect(order.whyOdd).toBeLessThan(order.whatWeDo);
  expect(order.whatWeDo).toBeLessThan(order.proof);
  expect(order.proof).toBeLessThan(order.audience);
  expect(order.audience).toBeLessThan(order.whatsHappening);
  // The organisational band closes the story; before this pass it sat
  // directly under the three product cards and read as a fourth product.
  expect(order.whatsHappening).toBeLessThan(order.workWithOdd);
  expect(order.workWithOdd).toBeLessThan(order.participate);
});

test('the participation band uses the approved final wording', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The way in is by doing.' })).toBeVisible();
});

test('no page still carries the superseded participation wording', async ({ page, request }) => {
  for (const route of ['/', '/about', '/oddspace', '/oddfest']) {
    const body = await (await request.get(route)).text();
    expect(body, `${route} still contains the pre-rewrite line`).not.toContain(
      'The way in is by participation',
    );
  }
  await page.goto('/');
});

test('ODDspace does not answer an accessibility question with reassurance', async ({ request }) => {
  const body = await (await request.get('/oddspace')).text();
  // The published answer must not imply the building has been checked. The
  // master's rule: facts, or an honest statement that there are none yet.
  expect(body).not.toContain("we'll make sure it works");
  expect(body).not.toContain('we’ll make sure it works');
  expect(body).toContain('We do not have verified accessibility information');
});

test('the contact form names the site it actually belongs to', async ({ page }) => {
  await page.goto('/contact');
  const subject = page.locator('#cf-subject');
  await expect(subject).toHaveValue(/allthingsodd\.co/);
  await expect(subject).not.toHaveValue(/oddfest\.co contact form/);
});

test('nothing user-facing still advertises the retired production domain', async ({ request }) => {
  // hello@oddfest.co / ronny@oddfest.co are canonical email infrastructure
  // and stay (a separate, unapproved migration); the *site* naming itself
  // oddfest.co after the cutover is what was stale.
  for (const route of ['/', '/about', '/oddspace', '/contact']) {
    const body = await (await request.get(route)).text();
    const nonEmail = body.replace(/[\w.-]+@oddfest\.co/g, '');
    expect(nonEmail, `${route} still refers to oddfest.co outside an email address`).not.toContain(
      'oddfest.co',
    );
  }
});
