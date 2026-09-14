import { test, expect } from '@playwright/test';

// The site's own identity, asserted on the rendered HTML.
//
// Added 2026-09-04 with the All Things ODD identity/domain/repository
// migration. Every assertion here corresponds to something that was actually
// wrong at the start of that pass, or to a decision made during it that a
// later edit could silently undo — a stale project name in a <title>, a
// canonical URL left on a retired host, or the homepage's proof row quietly
// reverting to the 2025-only numbers it launched with.
//
// The two halves of the identity contract are deliberately split:
//   - this file sees what a visitor sees, including values composed at build
//     time (canonical URLs, JSON-LD, the rendered proof row);
//   - scripts/check-identity.mjs sees what a visitor never sees — docs, CI
//     config, package metadata — and runs in `npm run quality`.
// Neither can cover the other's ground.

const CANONICAL_ORIGIN = 'https://allthingsodd.co';
const SITE_NAME = 'All Things ODD';

// Every public route, so a stale name cannot survive on the one page nobody
// checks. Mirrors the route list in site-integrity.spec.ts plus the
// ticketing funnel and 404, which that suite deliberately excludes.
const ROUTES = [
  '/',
  '/about',
  '/oddfest',
  '/oddference',
  '/oddspace',
  '/oddstudio',
  '/work-with-odd',
  '/oddagency',
  '/membership',
  '/media',
  '/contact',
  '/privacy',
  '/tickets',
  '/tickets/checkout',
  '/tickets/confirmation',
  '/404',
];

function meta(html: string, property: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, 'i'),
  );
  return match ? match[1] : null;
}

function canonical(html: string): string | null {
  const match = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i);
  return match ? match[1] : null;
}

function jsonLd(html: string, type: string): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const [, body] of blocks) {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (parsed['@type'] === type) return parsed;
  }
  return null;
}

test('every public route is canonical on allthingsodd.co', async ({ request }) => {
  for (const route of ROUTES) {
    const html = await (await request.get(route)).text();
    const href = canonical(html);
    expect(href, `${route} has no <link rel="canonical">`).toBeTruthy();
    expect(href!.startsWith(`${CANONICAL_ORIGIN}/`), `${route} canonical is ${href}`).toBe(true);
    // og:url is the same value; a page that only fixed one of the two still
    // hands social platforms the wrong origin.
    expect(meta(html, 'og:url'), `${route} og:url`).toBe(href);
  }
});

test('every public route declares All Things ODD as the site name', async ({ request }) => {
  for (const route of ROUTES) {
    const html = await (await request.get(route)).text();
    expect(meta(html, 'og:site_name'), `${route} og:site_name`).toBe(SITE_NAME);
  }
});

test('the WebSite entity is named All Things ODD and keeps the publisher factual', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  const website = jsonLd(html, 'WebSite');
  expect(website, 'no WebSite JSON-LD block on /').toBeTruthy();
  expect(website!.name).toBe(SITE_NAME);
  // ODD stays on as the brand's alternate name — the site rename is not a
  // rebrand, and structured data is where that distinction is machine-readable.
  expect(website!.alternateName).toBe('ODD');
  expect(website!.url).toBe(CANONICAL_ORIGIN);
  expect((website!.publisher as Record<string, string>).name).toBe('New Nordic Way rf');

  const organization = jsonLd(html, 'Organization');
  expect(organization!.name).toBe('New Nordic Way rf');
  expect(organization!.alternateName).toBe('ODD');
});

test('the homepage title uses the site name; product pages stay product-first', async ({
  request,
}) => {
  const home = await (await request.get('/')).text();
  expect(home).toMatch(/<title>All Things ODD\b/);

  // The rename must not have been swept across every page — ODDfest,
  // ODDference and ODDspace are still their own products and still lead
  // their own titles.
  for (const [route, product] of [
    ['/oddfest', 'ODDfest'],
    ['/oddference', 'ODDference'],
    ['/oddspace', 'ODDspace'],
    ['/oddstudio', 'ODDstudio'],
  ] as const) {
    const html = await (await request.get(route)).text();
    const title = html.match(/<title>([^<]*)<\/title>/)![1];
    expect(title.startsWith(product), `${route} title is "${title}"`).toBe(true);
  }
});

test('no rendered page carries the retired ODD Field Guide identity', async ({ request }) => {
  for (const route of ROUTES) {
    const html = await (await request.get(route)).text();
    expect(html, `${route} still says "ODD Field Guide"`).not.toContain('ODD Field Guide');
    // The one permitted occurrence of the retired slug is the legacy-host
    // redirect in Layout.astro, and only when it is switched on at build
    // time. Anything else is the old project identity leaking into a page.
    const withoutLegacyRedirect = html.replace(
      /if\(location\.hostname==='odd-field-guide\.surge\.sh'\)[^<]*/g,
      '',
    );
    expect(withoutLegacyRedirect, `${route} references odd-field-guide`).not.toContain(
      'odd-field-guide.surge.sh',
    );
  }
});

test('no rendered page advertises a legacy domain as the current website', async ({ request }) => {
  for (const route of ROUTES) {
    const html = await (await request.get(route)).text();

    // hello@oddfest.co / ronny@oddfest.co are the site's real, working
    // mailboxes and stay until @allthingsodd.co can actually receive mail —
    // see docs/IDENTITY_LAUNCH_MATRIX_2026-09-04.md. It is the *site* naming
    // a legacy domain as its own home that is the defect.
    //
    // /oddfest carries one deliberate exception, added 2026-09-11: a single
    // link to oddfest.co in its "look back at 2026" pair, labelled as the
    // 2026 site. That is the opposite of the defect this test was written
    // for — it presents oddfest.co as history, explicitly, rather than as
    // ODD's current home — so the route is checked by its own assertion
    // below instead of being exempted outright.
    const withoutEmails = html.replace(/[\w.-]+@oddfest\.co/g, '');
    if (route !== '/oddfest') {
      expect(withoutEmails, `${route} presents oddfest.co as a website`).not.toContain(
        'oddfest.co',
      );
    }

    // "oddspace.co" appears legitimately as an Instagram handle
    // (instagram.com/oddspace.co, "Follow @oddspace.co"). The domain used as
    // a URL is what must not appear.
    expect(html, `${route} links to the legacy oddspace.co site`).not.toMatch(
      /https?:\/\/(www\.)?oddspace\.co/,
    );
  }
});

test('ODDfest links to oddfest.co only as the labelled 2026 archive', async ({ page }) => {
  await page.goto('/oddfest');

  // Exactly one link to the legacy domain, and it has to say what it is. A
  // future edit that drops "2026" from the label, or adds a second oddfest.co
  // link somewhere the reader has no reason to read it as history, turns a
  // deliberate archive pointer back into the defect the test above guards.
  const legacy = page.locator('a[href*="oddfest.co"]').filter({ hasNotText: '@' });
  await expect(legacy).toHaveCount(1);
  await expect(legacy).toHaveText(/2026/);

  // It leaves the site, so it opens in a new tab and carries rel=noreferrer —
  // the same treatment every other outbound link on the site gets.
  await expect(legacy).toHaveAttribute('target', '_blank');
  await expect(legacy).toHaveAttribute('rel', 'noreferrer');

  // And the archived thank-you page sits beside it, on our own domain.
  const archive = page.locator('a[href="/oddfest-2026/"]');
  await expect(archive.first()).toBeVisible();
});

test('no public mailto promises an @allthingsodd.co address that cannot receive mail', async ({
  request,
}) => {
  // Inverted on purpose. allthingsodd.co has no MX record, so every
  // @allthingsodd.co address is currently undeliverable — publishing one
  // would be worse than keeping the working @oddfest.co ones. Flip this
  // assertion the day the mailbox exists and the addresses are cut over;
  // until then it stops a well-meaning "tidy the domains up" edit from
  // silently breaking every contact route on the site.
  for (const route of ROUTES) {
    const html = await (await request.get(route)).text();
    expect(html, `${route} publishes an unverified @allthingsodd.co address`).not.toMatch(
      /[\w.-]+@allthingsodd\.co/,
    );
  }
});

test('the homepage does not render a "What\'s happening" section', async ({ request }) => {
  // Removed outright on 2026-09-04 — not hidden, not gated on an empty
  // array. The old behaviour was `whatsHappening.items.length > 0 &&`, which
  // this asserts can never come back by asserting on the markup it produced.
  const html = await (await request.get('/')).text();
  expect(html).not.toContain("What's happening");
  expect(html).not.toContain('What&rsquo;s happening');
  expect(html).not.toContain('whats-happening');
  expect(html).not.toContain('whats-on');
});

test('"Already in motion" renders ODD\'s cumulative under-two-years proof', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('.home-proof');
  await expect(section).toHaveCount(1);

  await expect(section.getByText('Already in motion')).toBeVisible();

  // The framing is half the claim — four big numbers without a timeframe say
  // something different from the same four numbers in under two years. The
  // exact sentence is editorial and has already changed once (2026-09-11:
  // "In less than two years…" became "Two years in…" when the prose stopped
  // restating the figures below it), so this asserts the timeframe survives,
  // not one wording of it.
  await expect(section).toContainText(/two years/i);

  // All four figures, and no silent reversion to the three 2025-only ones.
  for (const value of ['5,000+', '500+', '100+', '€400K+']) {
    await expect(
      section.locator('.proof-value', { hasText: value }),
      `stat "${value}" is missing from the homepage proof row`,
    ).toHaveCount(1);
  }
  for (const stale of ['2,600+', '350+', '70+']) {
    await expect(
      section.locator('.proof-value', { hasText: stale }),
      `homepage proof reverted to the 2025-only value "${stale}"`,
    ).toHaveCount(0);
  }

  // The abbreviation must not cost the claim its meaning for a screen reader.
  await expect(section.locator('.proof-value .sr-only')).toHaveText('More than €400,000');

  // 2026-09-14: both of the section's links are buttons, and the one under the
  // figures is the ODDfest 2026 thank-you page. The 2025 Impact Report — and
  // the scope note it needed under cumulative figures — is About's to link.
  await expect(section.locator('.section-intro a.pill')).toHaveAttribute('href', '/about');
  await expect(section.locator('.proof-follow a.pill')).toHaveAttribute('href', '/oddfest-2026/');
  await expect(section.locator('.proof-follow-lead')).toContainText('co-created');
  await expect(section.locator('a[href*="impact_report"]')).toHaveCount(0);
});

test('About carries the two-year figures, both buttons, the launch photo and the wall', async ({
  page,
}) => {
  // 2026-09-14: About's figures are Home's cumulative four, not ODDfest 2025's
  // alone, and the empty 2026 snapshot ("still being compiled") is gone. The
  // buttons under them are the 2025 Impact Report and the 2026 thank-you page.
  await page.goto('/about');
  const section = page.locator('.proof-section');
  for (const value of ['5,000+', '500+', '100+', '€400K+']) {
    await expect(
      section.locator('.proof-value', { hasText: value }),
      `stat "${value}" is missing from About's figures`,
    ).toHaveCount(1);
  }
  await expect(page.getByText('still being compiled')).toHaveCount(0);

  const buttons = section.locator('.proof-follow a.pill');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toHaveAttribute('href', /impact_report/);
  await expect(buttons.nth(1)).toHaveAttribute('href', '/oddfest-2026/');

  await expect(page.locator('.photo-break img')).toHaveAttribute('alt', /ODDfest 2026 launch/);
  expect(await page.locator('.photo-wall img').count()).toBeGreaterThan(0);
});

test('the four-stat proof row does not overflow at supported mobile widths', async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(() => {
      const grid = document.querySelector('.home-proof .proof-grid');
      if (!grid) return { missing: true, scroll: 0, client: 0, doc: 0 };
      return {
        missing: false,
        scroll: grid.scrollWidth,
        client: grid.clientWidth,
        doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(overflow.missing, 'no .home-proof .proof-grid on the homepage').toBe(false);
    expect(overflow.scroll, `proof grid overflows its own box at ${width}px`).toBeLessThanOrEqual(
      overflow.client + 1,
    );
    expect(overflow.doc, `the page scrolls horizontally at ${width}px`).toBeLessThanOrEqual(1);
  }
});
