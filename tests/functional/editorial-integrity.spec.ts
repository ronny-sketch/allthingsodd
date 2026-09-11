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
      featuredIn: html.indexOf('Featured in'),
      workWithOdd: html.indexOf('wwo-band'),
      video: html.indexOf('aftermovie-section'),
      participate: html.indexOf('The way in is by doing'),
    };
  });

  for (const [name, index] of Object.entries(order)) {
    expect(index, `home section "${name}" is missing`).toBeGreaterThan(-1);
  }

  // Order set by the 2026-09-11 reorg, replacing the 2026-09-03 contract this
  // test was written against. It moves two sections, both deliberately and
  // both back to where an earlier pass had them — the reasoning is in
  // index.astro's own section-order comment, which is the place to read
  // before changing any of this. In short: the page answers the reader's
  // questions in the order they arrive, and "is this for me?" arrives before
  // three product names mean anything.
  //
  // "What's happening" used to sit in this sequence too; it was removed
  // outright on 2026-09-04 (see identity-integrity.spec.ts, which asserts it
  // stays gone).
  expect(order.whyOdd).toBeLessThan(order.audience);
  expect(order.audience).toBeLessThan(order.whatWeDo);
  // The organisational band sits directly under the three product cards, and
  // has to stay there: its question ("something bigger than those three?")
  // only lands while they are still on screen.
  expect(order.whatWeDo).toBeLessThan(order.workWithOdd);
  // One social-proof chapter, numbers then logos — not two separated ones.
  expect(order.workWithOdd).toBeLessThan(order.proof);
  expect(order.proof).toBeLessThan(order.featuredIn);
  // The video is the break between the argument and the ask. Asserted so a
  // later pass can't quietly move the page's only moving image above the
  // proof, where it would interrupt the case rather than close it.
  expect(order.featuredIn).toBeLessThan(order.video);
  expect(order.video).toBeLessThan(order.participate);
});

test('every audience split on home puts creatives before business', async ({ page }) => {
  await page.goto('/');

  // A sitewide editorial rule from the 2026-09-11 reorg, and the kind that
  // silently regresses: both of these sections take their order from content
  // (Converge's `creativeFirst`, index.json's `participate` array), so a
  // reordered JSON array is all it would take.
  const splits = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const audience = html.indexOf('Who ODD is for');
    const participate = html.indexOf('The way in is by doing');
    return {
      converge: {
        creative: html.indexOf('For creatives', audience),
        business: html.indexOf('For business', audience),
      },
      participate: {
        creative: html.indexOf('For creatives', participate),
        business: html.indexOf('For business', participate),
      },
    };
  });

  for (const [section, { creative, business }] of Object.entries(splits)) {
    expect(creative, `"${section}" has no creative side`).toBeGreaterThan(-1);
    expect(business, `"${section}" has no business side`).toBeGreaterThan(-1);
    expect(creative, `"${section}" puts business before creatives`).toBeLessThan(business);
  }
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
