// /tickets/checkout page controller — buyer details, then Stripe embedded
// payment. See ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md's
// "Stripe flow" for the sequence this drives.
import { fetchCatalog, createCheckout, type CatalogTicketType } from './api';
import { loadCart, saveCart, revalidateCart, cartTotalQuantity, type Cart } from './cart';
import { formatMinor } from './money';
import { EVENT_SLUG, STRIPE_PUBLISHABLE_KEY } from './config';
import { loadStripe, type EmbeddedCheckout } from './stripe-loader';
import { captureFirstTouch } from '../utm';
import { trackEvent } from '../analytics';

const emptyNotice = document.getElementById('tixcEmptyNotice')!;
const layout = document.getElementById('tixcLayout')!;
const buyerForm = document.getElementById('tixcBuyerForm');
const companyToggle = document.getElementById('tixc-company-toggle');
const companyFields = document.getElementById('tixcCompanyFields')!;
const status = document.getElementById('tixcStatus')!;
const continueBtn = document.getElementById('tixcContinueBtn');
const paymentSection = document.getElementById('tixcPaymentSection')!;
const checkoutMount = document.getElementById('tixcCheckoutMount')!;
const paymentError = document.getElementById('tixcPaymentError')!;
const summary = document.getElementById('tixcSummary')!;
const notConnectedNotice = document.getElementById('tixcNotConnected');

if (
  emptyNotice &&
  layout &&
  buyerForm instanceof HTMLFormElement &&
  companyToggle instanceof HTMLInputElement &&
  companyFields &&
  status &&
  continueBtn instanceof HTMLButtonElement &&
  paymentSection &&
  checkoutMount &&
  paymentError &&
  summary
) {
  let ticketTypes: CatalogTicketType[] = [];
  let currency = 'EUR';
  let cart: Cart = {};
  let embeddedCheckout: EmbeddedCheckout | null = null;

  function ticketById(id: string): CatalogTicketType | undefined {
    return ticketTypes.find((t) => t.id === id);
  }

  function cartTotal(): number {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const tt = ticketById(id);
      return sum + (tt ? tt.displayPriceMinor * qty : 0);
    }, 0);
  }

  function renderSummary(): void {
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    const lines = entries
      .map(([id, qty]) => {
        const tt = ticketById(id);
        if (!tt) return '';
        return `<div class="tixc-summary-line">
          <span>${qty} × ${escapeHtml(tt.name)}</span>
          <span>${formatMinor(tt.displayPriceMinor * qty, tt.currency)}</span>
        </div>`;
      })
      .join('');
    summary.innerHTML = `
      <span class="eyebrow">ODDference 2027</span>
      <div class="tixc-summary-lines">${lines}</div>
      <div class="tixc-summary-total-row">
        <span>Total</span>
        <span>${formatMinor(cartTotal(), currency)}</span>
      </div>
      <p class="tixc-summary-vat-note">VAT included where applicable</p>
    `;
  }

  function escapeHtml(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  companyToggle.addEventListener('change', () => {
    companyFields.hidden = !companyToggle.checked;
  });

  buyerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (continueBtn.disabled) return; // double-click guard

    const formData = new FormData(buyerForm);
    const email = String(formData.get('email') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    if (!email || !name) return; // native required-field validation already covers this

    if (!STRIPE_PUBLISHABLE_KEY) {
      status.textContent =
        "Payment isn't connected yet — please email ronny@oddfest.co to reserve your ticket.";
      return;
    }

    continueBtn.disabled = true;
    continueBtn.setAttribute('aria-busy', 'true');
    status.textContent = 'Setting up secure payment…';
    paymentError.hidden = true;

    const items = Object.entries(cart).map(([ticketTypeId, quantity]) => ({
      ticketTypeId,
      quantity,
    }));
    const buyer = {
      email,
      name,
      companyName: companyToggle.checked
        ? String(formData.get('companyName') ?? '').trim() || undefined
        : undefined,
      vatId: companyToggle.checked
        ? String(formData.get('vatId') ?? '').trim() || undefined
        : undefined,
    };

    const result = await createCheckout(EVENT_SLUG, items, buyer, captureFirstTouch());

    if (!result.ok) {
      status.textContent = '';
      paymentError.hidden = false;
      paymentError.textContent = result.message;
      continueBtn.disabled = false;
      continueBtn.removeAttribute('aria-busy');
      return;
    }

    sessionStorage.setItem('odd_tickets_order_token_v1', result.orderToken);
    buyerForm.querySelectorAll('input').forEach((input) => (input.disabled = true));
    status.textContent = 'Details confirmed.';
    paymentSection.hidden = false;
    paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      embeddedCheckout = await stripe.createEmbeddedCheckoutPage({
        fetchClientSecret: async () => result.clientSecret,
      });
      embeddedCheckout.mount('#tixcCheckoutMount');
      trackEvent('payment_form_loaded', { event: EVENT_SLUG, order_id: result.orderId });
    } catch (err) {
      console.error('Stripe embedded checkout failed to mount', err);
      paymentError.hidden = false;
      paymentError.textContent =
        "We couldn't load the payment form. Please refresh this page — your order is held for a few minutes.";
    }
  });

  (async function init() {
    cart = loadCart();
    if (cartTotalQuantity(cart) === 0) {
      layout.hidden = true;
      emptyNotice.hidden = false;
      return;
    }

    const catalog = await fetchCatalog(EVENT_SLUG);
    if (!catalog) {
      status.textContent =
        "We couldn't load your order right now. Please refresh, or go back to Tickets.";
      continueBtn.disabled = true;
      return;
    }
    ticketTypes = catalog.ticketTypes;
    currency = catalog.event.currency;

    const { cart: revalidated, changed, messages } = revalidateCart(cart, ticketTypes);
    cart = revalidated;
    if (changed) {
      saveCart(cart);
      if (cartTotalQuantity(cart) === 0) {
        layout.hidden = true;
        emptyNotice.hidden = false;
        emptyNotice.textContent = `${messages.join(' ')} Your cart is now empty.`;
        return;
      }
      const notice = document.createElement('p');
      notice.className = 'tixc-cart-notice';
      notice.setAttribute('role', 'status');
      notice.textContent = messages.join(' ');
      layout.prepend(notice);
    }

    renderSummary();

    if (!STRIPE_PUBLISHABLE_KEY && notConnectedNotice) {
      notConnectedNotice.hidden = false;
    }
  })();

  window.addEventListener('beforeunload', () => {
    embeddedCheckout?.destroy();
  });
}

export {};
