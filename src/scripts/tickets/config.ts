// Ticketing config — the one event this storefront sells right now. See
// ../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md for the backend
// this talks to.
export const EVENT_SLUG = 'oddference-2027';

// Public by design (Stripe publishable keys are meant to ship to the
// browser) — same "ships inert until configured" pattern as
// analytics-config.ts's GA_MEASUREMENT_ID. TEST MODE key (pk_test_), set
// 2026-09-01 alongside the matching sk_test_ Worker secret in
// ../../../odd-growth-os — see that repo's ops/TICKETING_IMPLEMENTATION_PLAN.md
// launch checklist before ever swapping this for a pk_live_ value.
export const STRIPE_PUBLISHABLE_KEY: string | null =
  'pk_test_51UAbRuEWKidxDSktHTSDUyrhnE4YkbqZVJ1kfGdCKrwTBaZXE8JqbPMYJPk2iTYBlbm35wC4lp34lh7nFiL8gtVR00UBKrfrTU';

// Loaded only on /tickets/checkout — never sitewide. "dahlia" matches the
// API version pinned in ../../../odd-growth-os/worker/src/tickets/stripe.ts;
// keep both in sync if either is ever bumped.
export const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';
