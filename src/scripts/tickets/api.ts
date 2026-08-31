// Fetch wrappers for the ticketing Worker routes — see ../../../odd-growth-os
// /worker/src/tickets/*.ts for the handlers these call. Same cross-origin
// API_BASE pattern as work-enquiry-form.ts/newsletter-form.ts (see
// ../api-base.ts's own comment on why this isn't a relative path yet).
import { API_BASE } from '../api-base';
import type { FirstTouch } from '../utm';

export interface CatalogTicketType {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: 'upcoming' | 'active' | 'sold_out' | 'sale_ended' | 'hidden';
  currency: string;
  displayPriceMinor: number;
  maxPerOrder: number;
  admissionsPerUnit: number;
  benefits: string[];
  availableToPurchase: number;
}

export interface CatalogResponse {
  ok: true;
  event: { slug: string; name: string; currency: string };
  ticketTypes: CatalogTicketType[];
}

export async function fetchCatalog(eventSlug: string): Promise<CatalogResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/tickets/catalog?event=${encodeURIComponent(eventSlug)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as CatalogResponse;
  } catch {
    return null;
  }
}

export interface CheckoutItem {
  ticketTypeId: string;
  quantity: number;
}

export interface CheckoutBuyer {
  email: string;
  name: string;
  companyName?: string;
  vatId?: string;
  billingCountry?: string;
}

export type CheckoutResponse =
  | { ok: true; orderId: string; orderToken: string; clientSecret: string; totalMinor: number }
  | { ok: false; code?: string; message: string };

export async function createCheckout(
  eventSlug: string,
  items: CheckoutItem[],
  buyer: CheckoutBuyer,
  attribution: FirstTouch,
): Promise<CheckoutResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventSlug, items, buyer, attribution }),
    });
    return (await res.json()) as CheckoutResponse;
  } catch {
    return { ok: false, message: "We couldn't start checkout right now. Please try again." };
  }
}

export interface OrderStatusResponse {
  ok: true;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';
  eventId: string;
  totalMinor: number;
  currency: string;
  tickets: Array<{ ticketCode: string; ticketTypeId: string; attendeeAssigned: boolean }>;
}

export async function fetchOrderStatus(orderToken: string): Promise<OrderStatusResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/tickets/order-status?token=${encodeURIComponent(orderToken)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as OrderStatusResponse;
  } catch {
    return null;
  }
}

export type AssignResponse = { ok: true } | { ok: false; code?: string; message: string };

export async function assignAttendee(
  orderToken: string,
  ticketCode: string,
  name: string,
  email?: string,
  company?: string,
  jobTitle?: string,
): Promise<AssignResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderToken, ticketCode, name, email, company, jobTitle }),
    });
    return (await res.json()) as AssignResponse;
  } catch {
    return { ok: false, message: "We couldn't save that right now. Please try again." };
  }
}
