// /tickets page controller — catalog, quantity steppers, sticky desktop
// cart, mobile bottom bar + bottom sheet. See
// ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md for the API
// this drives and docs/design-system.md for the token/component rules this
// follows (Pill markup replicated inline below rather than importing the
// .astro component, since this is plain client JS — same class names, so
// the CSS is shared).
import { fetchCatalog, type CatalogTicketType } from './api';
import { loadCart, saveCart, revalidateCart, cartTotalQuantity, type Cart } from './cart';
import { formatMinor } from './money';
import { EVENT_SLUG } from './config';
import { trackEvent } from '../analytics';

const STATUS_LABEL: Record<CatalogTicketType['status'], string> = {
  active: '',
  sold_out: 'Sold out',
  upcoming: 'Coming soon',
  sale_ended: 'Sale ended',
  hidden: '',
};

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

const list = document.getElementById('tixList')!;
const summary = document.getElementById('tixSummary')!;
const mobileBar = document.getElementById('tixMobileBar')!;
const mobileBarSummary = document.getElementById('tixMobileBarSummary')!;
const sheet = document.getElementById('tixSheet')!;
const sheetBackdrop = document.getElementById('tixSheetBackdrop')!;
const sheetContent = document.getElementById('tixSheetContent')!;
// A single persistent live region, updated via textContent only — never
// blown away by the bulk list/summary re-renders below (which would make
// a screen reader re-announce the entire catalog on every click). See
// docs/design-system.md's accessibility notes and CLAUDE.md's
// aria-live-on-cart-total requirement.
const cartStatus = document.getElementById('tixCartStatus')!;

if (
  list &&
  summary &&
  mobileBar &&
  mobileBarSummary &&
  sheet &&
  sheetBackdrop &&
  sheetContent &&
  cartStatus
) {
  let ticketTypes: CatalogTicketType[] = [];
  let currency = 'EUR';
  let cart: Cart = {};

  function ticketById(id: string): CatalogTicketType | undefined {
    return ticketTypes.find((t) => t.id === id);
  }

  function lineTotal(id: string, qty: number): number {
    const tt = ticketById(id);
    return tt ? tt.displayPriceMinor * qty : 0;
  }

  function cartTotal(): number {
    return Object.entries(cart).reduce((sum, [id, qty]) => sum + lineTotal(id, qty), 0);
  }

  function renderRows(): void {
    if (ticketTypes.length === 0) {
      list.innerHTML =
        '<p class="tix-empty">Tickets aren\'t available right now — check back soon.</p>';
      return;
    }
    list.innerHTML = ticketTypes
      .map((tt) => {
        const qty = cart[tt.id] ?? 0;
        const isActive = tt.status === 'active';
        const priceHtml = `<div class="tix-row-price">${formatMinor(tt.displayPriceMinor, tt.currency)}</div>`;
        const benefitsHtml = tt.benefits.length
          ? `<ul class="tix-row-benefits">${tt.benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
          : '';
        const actionHtml = isActive
          ? `<div class="tix-stepper" role="group" aria-label="Quantity of ${escapeHtml(tt.name)}">
              <button type="button" class="tix-stepper-btn" data-action="decrease" data-id="${tt.id}" aria-label="Decrease quantity of ${escapeHtml(tt.name)}" ${qty <= 0 ? 'disabled' : ''}>−</button>
              <span class="tix-stepper-qty" data-role="qty" data-id="${tt.id}">${qty}</span>
              <button type="button" class="tix-stepper-btn" data-action="increase" data-id="${tt.id}" aria-label="Increase quantity of ${escapeHtml(tt.name)}" ${qty >= tt.availableToPurchase ? 'disabled' : ''}>+</button>
            </div>`
          : `<span class="tix-status-badge">${STATUS_LABEL[tt.status]}</span>`;

        return `<div class="tix-row ${isActive ? '' : 'is-inactive'}" data-ticket-id="${tt.id}">
          <div class="tix-row-main">
            <div class="tix-row-info">
              <span class="tix-row-name">${escapeHtml(tt.name)}</span>
              <p class="tix-row-desc">${escapeHtml(tt.description)}</p>
              ${benefitsHtml}
            </div>
            ${priceHtml}
          </div>
          <div class="tix-row-action">${actionHtml}</div>
        </div>`;
      })
      .join('');
  }

  function summaryLinesHtml(): string {
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      return '<p class="tix-summary-empty">No tickets selected yet.</p>';
    }
    return entries
      .map(([id, qty]) => {
        const tt = ticketById(id);
        if (!tt) return '';
        return `<div class="tix-summary-line">
          <span>${qty} × ${escapeHtml(tt.name)}</span>
          <span>${formatMinor(lineTotal(id, qty), tt.currency)}</span>
        </div>`;
      })
      .join('');
  }

  function summaryBodyHtml(): string {
    const total = cartTotal();
    const hasItems = total > 0;
    return `
      <span class="eyebrow">Your order</span>
      <div class="tix-summary-lines">${summaryLinesHtml()}</div>
      ${
        hasItems
          ? `<div class="tix-summary-total-row">
              <span>Total</span>
              <span>${formatMinor(total, currency)}</span>
            </div>
            <p class="tix-summary-vat-note">VAT included where applicable</p>`
          : ''
      }
      <button type="button" class="pill pill-solid tix-checkout-btn" id="tixCheckoutBtn" ${hasItems ? '' : 'disabled'}>
        Continue to checkout
      </button>
    `;
  }

  function renderSummary(): void {
    summary.innerHTML = summaryBodyHtml();
    summary.querySelector('#tixCheckoutBtn')?.addEventListener('click', goToCheckout);

    const qty = cartTotalQuantity(cart);
    if (qty > 0) {
      mobileBar.hidden = false;
      mobileBarSummary.textContent = `${qty} ticket${qty === 1 ? '' : 's'} · ${formatMinor(cartTotal(), currency)}`;
    } else {
      mobileBar.hidden = true;
      closeSheet();
    }

    if (!sheet.hidden) {
      sheetContent.innerHTML = summaryBodyHtml();
      sheetContent.querySelector('#tixCheckoutBtn')?.addEventListener('click', goToCheckout);
    }
  }

  function render(): void {
    renderRows();
    renderSummary();
  }

  function setQuantity(id: string, qty: number): void {
    const tt = ticketById(id);
    if (!tt) return;
    const clamped = Math.max(0, Math.min(qty, tt.availableToPurchase));
    if (clamped <= 0) delete cart[id];
    else cart[id] = clamped;
    saveCart(cart);
    render();
    cartStatus.textContent = `${tt.name} quantity: ${clamped}. Cart total: ${formatMinor(cartTotal(), currency)}.`;
    trackEvent('ticket_quantity_changed', {
      ticket_type: tt.slug,
      quantity: clamped,
      event: EVENT_SLUG,
    });
  }

  function goToCheckout(): void {
    if (cartTotalQuantity(cart) === 0) return;
    trackEvent('checkout_started', { event: EVENT_SLUG, ticket_count: cartTotalQuantity(cart) });
    window.location.href = '/tickets/checkout';
  }

  function openSheet(): void {
    sheet.hidden = false;
    sheetBackdrop.hidden = false;
    sheetContent.innerHTML = summaryBodyHtml();
    sheetContent.querySelector('#tixCheckoutBtn')?.addEventListener('click', goToCheckout);
    document.body.style.overflow = 'hidden';
    (sheet.querySelector('.tix-sheet-close') as HTMLElement | null)?.focus();
  }

  function closeSheet(): void {
    sheet.hidden = true;
    sheetBackdrop.hidden = true;
    document.body.style.overflow = '';
  }

  list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('.tix-stepper-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    const current = cart[id] ?? 0;
    setQuantity(id, btn.dataset.action === 'increase' ? current + 1 : current - 1);
  });

  mobileBar.addEventListener('click', openSheet);
  sheetBackdrop.addEventListener('click', closeSheet);
  document.getElementById('tixSheetClose')?.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  (async function init() {
    trackEvent('ticket_page_viewed', { event: EVENT_SLUG });
    const catalog = await fetchCatalog(EVENT_SLUG);
    if (!catalog) {
      list.innerHTML =
        '<p class="tix-error">We couldn\'t load tickets right now. Please refresh, or email ronny@oddfest.co.</p>';
      list.setAttribute('aria-busy', 'false');
      return;
    }
    ticketTypes = catalog.ticketTypes;
    currency = catalog.event.currency;

    const persisted = loadCart();
    const { cart: revalidated, changed, messages } = revalidateCart(persisted, ticketTypes);
    cart = revalidated;
    if (changed) saveCart(cart);

    list.setAttribute('aria-busy', 'false');
    render();

    if (messages.length > 0) {
      const notice = document.createElement('p');
      notice.className = 'tix-cart-notice';
      notice.setAttribute('role', 'status');
      notice.textContent = messages.join(' ');
      list.prepend(notice);
    }
  })();
}

export {};
