import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const oddference: { tickets?: { syncSlug?: string }[] } = JSON.parse(
  readFileSync(new URL('../../src/content/pages/oddference.json', import.meta.url), 'utf8'),
);

// Live backend contract smoke (2026-10-05, finding F16). The deterministic
// suites never touch production: the visual suite refuses the catalogue and
// the functional suite serves a fixed one. This is the other half — a few
// read-only or rejected requests against the real Worker, to catch the
// site and the backend drifting apart. Not part of `npm test` or CI; run it
// after a Worker deploy with `npm run test:contract`.
//
// Nothing here writes data: the catalogue is a GET, and the event idea POST
// is an empty body the Worker must refuse before it stores anything.

const API = process.env.CONTRACT_API_BASE || 'https://odd-field-guide.ronny-507.workers.dev';
const ORIGIN = 'https://allthingsodd.co';

test('the ticket catalogue has every ticket the /oddference page syncs', async ({ request }) => {
  const res = await request.get(`${API}/api/tickets/catalog?event=oddference-2027`, {
    headers: { Origin: ORIGIN },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(typeof body.event?.pricesIncludeTax).toBe('boolean');
  const slugs = new Set(body.ticketTypes.map((t: { slug: string }) => t.slug));
  for (const tier of oddference.tickets ?? []) {
    if (tier.syncSlug)
      expect(slugs, `catalogue is missing ${tier.syncSlug}`).toContain(tier.syncSlug);
  }
  for (const t of body.ticketTypes) {
    expect(Number.isInteger(t.displayPriceMinor), `${t.slug} price`).toBe(true);
    expect(t.currency).toBe('EUR');
  }
});

test('the event idea route refuses an empty submission', async ({ request }) => {
  const res = await request.post(`${API}/api/creative-week-submission`, {
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    data: {},
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).status).toBe('invalid');
});
