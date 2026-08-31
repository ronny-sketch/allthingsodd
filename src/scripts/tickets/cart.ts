// Client-side cart — persisted so a refresh doesn't destroy a selection,
// but never the source of truth for price or availability. See
// ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md's "Cart"
// section: the backend re-validates everything at checkout time regardless
// of what's stored here.
import type { CatalogTicketType } from './api';

const STORAGE_KEY = 'odd_tickets_cart_v1';

export type Cart = Record<string, number>; // ticketTypeId -> quantity

export function loadCart(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const cart: Cart = {};
    for (const [id, qty] of Object.entries(parsed)) {
      if (typeof qty === 'number' && Number.isInteger(qty) && qty > 0) cart[id] = qty;
    }
    return cart;
  } catch {
    return {};
  }
}

export function saveCart(cart: Cart): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Private browsing / storage blocked — the cart still works for this
    // page view, it just won't survive a refresh.
  }
}

export interface RevalidationResult {
  cart: Cart;
  changed: boolean;
  messages: string[];
}

/**
 * Reconciles a persisted cart against a fresh catalog response — a ticket
 * type that vanished, went hidden, or shrank below the held quantity gets
 * clamped or dropped, with a human-readable reason for each change. Never
 * silent (see the brief's "Blind Bird sold out while your cart was
 * inactive" example).
 */
export function revalidateCart(cart: Cart, ticketTypes: CatalogTicketType[]): RevalidationResult {
  const byId = new Map(ticketTypes.map((tt) => [tt.id, tt]));
  const next: Cart = {};
  const messages: string[] = [];
  let changed = false;

  for (const [id, qty] of Object.entries(cart)) {
    const tt = byId.get(id);
    if (!tt || tt.status !== 'active') {
      changed = true;
      messages.push(
        `${tt?.name ?? 'A ticket in your cart'} is no longer available. We removed it.`,
      );
      continue;
    }
    const clamped = Math.min(qty, tt.availableToPurchase);
    if (clamped <= 0) {
      changed = true;
      messages.push(`${tt.name} sold out while your cart was inactive. We removed it.`);
      continue;
    }
    if (clamped < qty) {
      changed = true;
      messages.push(`Only ${clamped} × ${tt.name} left — we updated your order.`);
    }
    next[id] = clamped;
  }

  return { cart: next, changed, messages };
}

export function cartTotalQuantity(cart: Cart): number {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}
