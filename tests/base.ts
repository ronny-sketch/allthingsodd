import { test as base, expect } from '@playwright/test';

// The shared test fixture. Import `test` from here, not from
// '@playwright/test', in any spec that can reach a consent decision.
//
// WHY THIS FILE EXISTS. Twice now a spec has written real hits into the live
// GA4 property (G-FCGTBXT9KS) simply by accepting the consent banner:
//
//   * 2026-09-21 (c2c379f) — tests/functional/consent.spec.ts was submitting
//     the newsletter form with consent granted, putting 18 real
//     newsletter_signup events into the property's key-event count.
//   * the same day, found while auditing that fix —
//     tests/mobile/interaction.spec.ts taps "Accept all" with no block at
//     all, on two projects, so every full run inflated users and sessions.
//
// Both were fixed per file, by remembering. Playwright has no global `route`
// setting, so an auto-use fixture is the only way to make the guarantee
// structural instead: a new spec cannot forget, because it gets this by
// importing `test`.
//
// Aborting the LOADER is sufficient and is the right level to block at.
// /g/collect only ever comes from gtag.js, so with googletagmanager.com
// refused nothing can be sent — and an aborted request still fires
// page.on('request'), which is what lets consent.spec.ts keep asserting that
// no Google request was even ATTEMPTED before consent. Blocking the collect
// endpoints as well would hide the attempt those tests exist to catch.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(
      /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net/,
      (route) => route.abort(),
    );
    await use(page);
  },
});

export { expect };
