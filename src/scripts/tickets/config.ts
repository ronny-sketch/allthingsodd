// Ticketing config — the one event this storefront sells right now. See
// ../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md for the backend
// this talks to.
export const EVENT_SLUG = 'oddference-2027';

// Public by design (Stripe publishable keys are meant to ship to the
// browser) — same "ships inert until configured" pattern as
// analytics-config.ts's GA_MEASUREMENT_ID: null keeps /tickets/checkout
// showing an honest "payment isn't connected yet" state instead of a
// broken Stripe.js call until the real pk_test_/pk_live_ value is set here.
export const STRIPE_PUBLISHABLE_KEY: string | null = null;

// Loaded only on /tickets/checkout — never sitewide. "dahlia" matches the
// API version pinned in ../../../odd-growth-os/worker/src/tickets/stripe.ts;
// keep both in sync if either is ever bumped.
export const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';
