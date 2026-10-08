// /tickets/confirmation page controller. Never trusts the Stripe redirect
// itself as proof of payment — polls GET /api/tickets/order-status, which
// only ever reflects what the webhook handler wrote. See
// ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md's "Stripe
// flow" and the brief's "payment success must come from webhooks" rule.
import {
  fetchCatalog,
  fetchOrderStatus,
  type CatalogTicketType,
  type OrderStatusResponse,
} from './api';
import { EVENT_SLUG } from './config';
import { trackEvent } from '../analytics';
import { hasConsent } from '../consent';
import { firstReportOf, itemFor, toMajor, transactionIdFor } from './ecommerce';

const ORDER_TOKEN_KEY = 'odd_tickets_order_token_v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // ~60s

const heading = document.getElementById('tixfHeading');
const processing = document.getElementById('tixfProcessing');
const success = document.getElementById('tixfSuccess');
const failed = document.getElementById('tixfFailed');
const timeout = document.getElementById('tixfTimeout');
const notFound = document.getElementById('tixfNotFound');
const codeLine = document.getElementById('tixfCodeLine');
const code = document.getElementById('tixfCode');
const failedMessage = document.getElementById('tixfFailedMessage');

// One real heading text per state, keyed by the same element each state's
// <div> already uses — see confirmation.astro's own comment on why this
// page has a single shared <h1> instead of one per state.
const HEADINGS: Record<string, string> = {
  tixfProcessing: 'Processing your payment…',
  tixfSuccess: 'Thank you for your purchase.',
  tixfFailed: "This order didn't go through",
  tixfTimeout: 'Still processing',
  tixfNotFound: "We couldn't find that order",
};

function show(el: HTMLElement | null): void {
  if (!el) return;
  el.removeAttribute('hidden');
  if (heading && HEADINGS[el.id]) heading.textContent = HEADINGS[el.id];
}
function hide(el: HTMLElement | null): void {
  el?.setAttribute('hidden', '');
}

/** The one place real revenue enters GA4.
 *
 *  Deliberately driven by the polled order status, which only ever reflects
 *  what the Stripe webhook wrote, and never by the redirect back from
 *  Stripe — the same rule the rest of this page follows. A visitor who
 *  closes the tab before it resolves is a purchase GA4 never hears about,
 *  and that is the correct trade: under-reporting beats reporting revenue
 *  that was never captured. */
async function reportPurchase(order: OrderStatusResponse, orderToken: string): Promise<void> {
  // Checked here rather than relying on trackEvent's own gate, because
  // firstReportOf() WRITES to sessionStorage, and it writes for one purpose
  // only: to stop GA4 counting this order twice. Storing an analytics value
  // on the device of someone who declined statistics is the thing ePrivacy
  // 5(3) is about, and it happened on every purchase before this line.
  if (!hasConsent('statistics')) return;

  const transactionId = await transactionIdFor(order.orderId, orderToken);
  if (!firstReportOf(transactionId)) return;

  // The order carries ticket-type ids; the catalogue carries the slug, name
  // and price. Fetch it so this event's items match the ones the rest of the
  // funnel sends — view_item_list, add_to_cart and begin_checkout all use
  // itemFor(), keyed on the SLUG, and until now `purchase` was the one step
  // sending the raw uuid instead. GA4 joins item-level funnels on item_id, so
  // no ticket could be followed from list view through to purchase, and the
  // item-level revenue columns were empty because no price was sent either.
  // Reusing itemFor() is what keeps the five events one shape.
  let types: Record<string, CatalogTicketType> = {};
  try {
    const catalog = await fetchCatalog(EVENT_SLUG);
    if (catalog) types = Object.fromEntries(catalog.ticketTypes.map((tt) => [tt.id, tt]));
  } catch {
    /* non-fatal — fall through to the id-only shape below */
  }

  const byType = new Map<string, number>();
  for (const t of order.tickets) {
    byType.set(t.ticketTypeId, (byType.get(t.ticketTypeId) ?? 0) + 1);
  }

  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: order.currency,
    value: toMajor(order.totalMinor),
    items: [...byType].map(([ticketTypeId, quantity]) => {
      const tt = types[ticketTypeId];
      // An unreachable catalogue costs the slug, the name and the price, not
      // the purchase: reporting revenue with a uuid beats not reporting it.
      return tt
        ? itemFor(tt, quantity, EVENT_SLUG)
        : { item_id: ticketTypeId, item_name: ticketTypeId, item_category: EVENT_SLUG, quantity };
    }),
  });
}

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const orderToken = params.get('order_token') ?? sessionStorage.getItem(ORDER_TOKEN_KEY);

  if (!orderToken) {
    show(notFound);
    return;
  }

  // Get the token out of the address bar.
  //
  // Stripe sends the buyer here with ?session_id=…&order_token=…, and the
  // token is a bearer capability: it authorises reading this order's status
  // and buyer details. In the URL it also
  // reaches browser history, the Referer header of anything linked from this
  // page, and — before the sanitising in scripts/analytics.ts — GA4's
  // page_location.
  //
  // Persist it first and only scrub if that worked: a buyer opening this link
  // in a fresh tab has the token nowhere else, so dropping it before it is
  // saved would lose their order on the next reload. In a browser with no
  // session storage (private mode) the URL stays as it is, which is the
  // correct trade — an unreadable order is worse than a token in history.
  if (params.has('order_token')) {
    let persisted = false;
    try {
      sessionStorage.setItem(ORDER_TOKEN_KEY, orderToken);
      persisted = sessionStorage.getItem(ORDER_TOKEN_KEY) === orderToken;
    } catch {
      persisted = false;
    }
    if (persisted) {
      try {
        const clean = new URL(window.location.href);
        clean.searchParams.delete('order_token');
        clean.searchParams.delete('session_id');
        history.replaceState(null, '', `${clean.pathname}${clean.search}${clean.hash}`);
      } catch {
        /* non-fatal — the sanitising in analytics.ts still covers GA4 */
      }
    }
  }

  show(processing);
  let attempts = 0;

  async function poll(): Promise<void> {
    attempts++;
    const order = await fetchOrderStatus(orderToken!);

    if (!order) {
      // Transient network failure — keep polling within the attempt budget
      // rather than treating one failed request as "order not found."
      if (attempts >= MAX_POLL_ATTEMPTS) {
        hide(processing);
        show(timeout);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
      return;
    }

    if (order.status === 'paid') {
      hide(processing);
      show(success);
      try {
        localStorage.removeItem('odd_tickets_cart_v1');
      } catch {
        /* non-fatal */
      }
      // Sent by Workers deployed from 2026-10-08; an older one leaves the
      // sentence without its code rather than with an empty one.
      if (order.confirmationCode && code && codeLine) {
        code.textContent = order.confirmationCode;
        codeLine.hidden = false;
      }
      await reportPurchase(order, orderToken!);
      return;
    }

    if (order.status === 'expired' || order.status === 'cancelled' || order.status === 'refunded') {
      hide(processing);
      show(failed);
      if (failedMessage) {
        failedMessage.textContent =
          order.status === 'expired'
            ? 'This order expired before payment completed. Please start again.'
            : "This order isn't valid anymore. Please email hello@oddfest.co if you think this is a mistake.";
      }
      return;
    }

    // Still 'pending' — webhook hasn't landed yet.
    if (attempts >= MAX_POLL_ATTEMPTS) {
      hide(processing);
      show(timeout);
      return;
    }
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  poll();
})();

export {};
