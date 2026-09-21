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

// The hosts where a visitor is a real buyer holding a real card.
//
// Keep in sync with the deploy job's PRIMARY_DOMAIN/LEGACY_DOMAIN in
// .github/workflows/ci.yml, and with ALLOWED_ORIGINS in
// ../../../odd-growth-os/worker/src/index.ts.
export const PUBLIC_HOSTS: readonly string[] = [
  'allthingsodd.co',
  'www.allthingsodd.co',
  'odd-field-guide.surge.sh',
];

/**
 * Whether this page may present a ticket as buyable.
 *
 * WHY THIS EXISTS (2026-09-21). Production was serving `/tickets` with Blind
 * Bird `active` and ten available, while `/tickets/checkout` loaded
 * `pk_test_…` — a Stripe TEST MODE key. A real buyer could fill the cart,
 * enter their details and reach a payment form that could never take their
 * money. The ticket store recorded eleven orders and EUR 6,036 attempted
 * against zero payments and zero tickets issued between 1 and 17 September.
 * Nothing in the build, the tests or the deploy could see it, because every
 * one of those runs against localhost, where a test-mode key is exactly
 * right.
 *
 * So the rule is derived rather than configured. There is no flag to flip and
 * nothing to remember: the day a `pk_live_` key is set here, sales open by
 * themselves, and until then the public site does not offer a purchase.
 *
 *   pk_live_ key          → open, anywhere.
 *   pk_test_ key, non-public host → open (a test-mode purchase is a real
 *                           purchase in test mode, and that path has to stay
 *                           testable locally and in CI).
 *   pk_test_ key, public host     → CLOSED.
 *   no key at all         → CLOSED everywhere.
 *
 * `?sales=closed` forces the closed state anywhere, so the not-yet-on-sale
 * page can be reviewed and tested on a machine where sales are open. There is
 * deliberately NO opposite switch: forcing sales closed can only ever
 * under-promise, while forcing them open would be a way to put a test-mode
 * checkout in front of someone's card.
 */
export function salesEnabled(loc: { hostname: string; search: string }): boolean {
  if (new URLSearchParams(loc.search).get('sales') === 'closed') return false;
  if (!STRIPE_PUBLISHABLE_KEY) return false;
  if (STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) return true;
  return !PUBLIC_HOSTS.includes(loc.hostname);
}
