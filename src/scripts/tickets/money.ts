// Display-only money formatting — the backend (../../../odd-growth-os
// /worker/src/tickets/money.ts) is the only place a total is ever computed
// authoritatively. This never does arithmetic, only formatting.
export function formatMinor(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-FI', {
    style: 'currency',
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}
