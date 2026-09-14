// Display-side money helpers — the backend (../../../odd-growth-os
// /worker/src/tickets/money.ts) is the only place a total is ever computed
// authoritatively. Nothing here is ever sent to checkout.
import type { CatalogTicketType } from './api';

export function formatMinor(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-FI', {
    style: 'currency',
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

/** 1350 → "13.5%". */
export function formatRate(rateBps: number): string {
  return `${rateBps / 100}%`;
}

/** "+ VAT 13.5%" for an ex-VAT price, "" when VAT is included or unknown. */
export function vatSuffix(tt: CatalogTicketType, pricesIncludeTax: boolean): string {
  return !pricesIncludeTax && tt.taxRateBps ? `+ VAT ${formatRate(tt.taxRateBps)}` : '';
}

export interface OrderPreview {
  subtotalMinor: number;
  vat: Array<{ rateBps: number; amountMinor: number }>;
  totalMinor: number;
}

/**
 * The order summary's preview of what checkout will charge. For ex-VAT
 * prices it mirrors the Worker's calculateLineTotals exactly — VAT per line
 * on the line total, Math.round — so the summary agrees with Stripe to the
 * cent. For VAT-included prices there is nothing to add.
 */
export function previewOrder(
  lines: Array<{ tt: CatalogTicketType; quantity: number }>,
  pricesIncludeTax: boolean,
): OrderPreview {
  const vatByRate = new Map<number, number>();
  let subtotalMinor = 0;
  for (const { tt, quantity } of lines) {
    const lineMinor = tt.displayPriceMinor * quantity;
    subtotalMinor += lineMinor;
    if (pricesIncludeTax || !tt.taxRateBps) continue;
    const vatMinor = Math.round((lineMinor * tt.taxRateBps) / 10000);
    vatByRate.set(tt.taxRateBps, (vatByRate.get(tt.taxRateBps) ?? 0) + vatMinor);
  }
  const vat = [...vatByRate].map(([rateBps, amountMinor]) => ({ rateBps, amountMinor }));
  const vatMinor = vat.reduce((sum, v) => sum + v.amountMinor, 0);
  return { subtotalMinor, vat, totalMinor: subtotalMinor + vatMinor };
}
