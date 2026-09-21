// GA4 ecommerce mapping for the ticket funnel.
//
// Until 2026-09-21 this funnel reported itself with invented event names —
// ticket_page_viewed, ticket_quantity_changed, checkout_started,
// payment_form_loaded, payment_succeeded. GA4 accepted all of them and did
// nothing with any of them: no revenue, no items, no funnel, no
// monetisation reports, nothing in the default Ecommerce collection. Every
// one of those reports is keyed off GA4's *recommended* event names and off
// the `items`/`value`/`currency` parameter shape, so a property that never
// sends them has a permanently empty purchase funnel no matter how much
// real money goes through it.
//
// This file is that mapping and nothing else. The names below are GA4's,
// not ours, and they are the reason the funnel works:
//
//   view_item_list  — the /tickets catalog rendered
//   add_to_cart     — a stepper went up
//   remove_from_cart— a stepper went down
//   begin_checkout  — the visitor left for /tickets/checkout
//   add_payment_info— Stripe's embedded form mounted
//   purchase        — the webhook confirmed payment (never the redirect)
//
// See docs/analytics.md for what each one is used to answer.
import type { CatalogTicketType } from './api';

/** GA4 monetary parameters are major units. Everything else in the ticket
 *  stack is minor units, and mixing the two silently reports EUR 4,500 as
 *  EUR 450,000. */
export function toMajor(amountMinor: number): number {
  return Math.round(amountMinor) / 100;
}

export interface GaItem {
  item_id: string;
  item_name: string;
  item_category: string;
  price: number;
  quantity: number;
}

export function itemFor(
  tt: CatalogTicketType,
  quantity: number,
  eventSlug: string,
): GaItem {
  return {
    item_id: tt.slug,
    item_name: tt.name,
    item_category: eventSlug,
    price: toMajor(tt.displayPriceMinor),
    quantity,
  };
}

const PURCHASE_SENT_KEY = 'odd_tickets_purchase_reported_v1';

/** True the first time a given transaction is seen in this session.
 *
 *  The confirmation page polls, and a visitor who reloads it (or lands on
 *  it twice from the same Stripe redirect) would otherwise send `purchase`
 *  again and double the reported revenue. GA4 does not reliably de-duplicate
 *  on transaction_id, so this is ours to do. */
export function firstReportOf(transactionId: string): boolean {
  try {
    if (sessionStorage.getItem(PURCHASE_SENT_KEY) === transactionId) return false;
    sessionStorage.setItem(PURCHASE_SENT_KEY, transactionId);
  } catch {
    /* Private mode or blocked storage: report it and accept the risk of a
       duplicate over the certainty of losing the purchase entirely. */
  }
  return true;
}

/** A stable, non-secret transaction id.
 *
 *  Prefers the order id the Worker returns. Falls back to a SHA-256 of the
 *  order token so this page keeps working against a Worker deployed before
 *  that field existed — the two repos deploy independently, the website on
 *  merge and the Worker by hand. The token itself is a capability (it is
 *  what proves payment on this page) and must never be sent to Google, so
 *  the fallback hashes it rather than passing it through. */
export async function transactionIdFor(
  orderId: string | undefined,
  orderToken: string,
): Promise<string> {
  if (orderId) return orderId;
  try {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(orderToken),
    );
    return Array.from(new Uint8Array(digest).slice(0, 16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return 'unknown';
  }
}
