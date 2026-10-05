// A fixed GET /api/tickets/catalog response (moved here 2026-10-05 from
// oddference-tickets.spec.ts so the visual suite can use it too). The
// /oddference ticket cards hydrate from the live catalogue, so a test that
// let the real request through would be asserting the state of production
// on the day it ran.

export const CATALOG_ROUTE = '**/api/tickets/catalog**';

export function catalogBody(overrides: Record<string, unknown>[] = [], pricesIncludeTax = false) {
  const base = [
    {
      id: 'tt_blind_bird',
      slug: 'blind-bird',
      name: 'Blind Bird',
      description: 'x',
      status: 'active',
      currency: 'EUR',
      displayPriceMinor: 29900,
      taxRateBps: 1350,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 10,
    },
    {
      id: 'tt_early_bird',
      slug: 'early-bird',
      name: 'Early Bird',
      description: 'x',
      status: 'upcoming',
      currency: 'EUR',
      displayPriceMinor: 39900,
      taxRateBps: 1350,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 0,
    },
    {
      id: 'tt_regular',
      slug: 'regular',
      name: 'Regular Ticket',
      description: 'x',
      status: 'upcoming',
      currency: 'EUR',
      displayPriceMinor: 49900,
      taxRateBps: 1350,
      maxPerOrder: 10,
      admissionsPerUnit: 1,
      benefits: ['Full ODDference 2027 access'],
      availableToPurchase: 0,
    },
  ];
  const merged = base.map((tt, i) => ({ ...tt, ...(overrides[i] ?? {}) }));
  return JSON.stringify({
    ok: true,
    event: { slug: 'oddference-2027', name: 'ODDference 2027', currency: 'EUR', pricesIncludeTax },
    ticketTypes: merged,
  });
}
