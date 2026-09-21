// /tickets/checkout page controller — buyer details, then Stripe embedded
// payment. See ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md's
// "Stripe flow" for the sequence this drives.
import { fetchCatalog, createCheckout, type CatalogTicketType } from './api';
import { loadCart, saveCart, revalidateCart, cartTotalQuantity, type Cart } from './cart';
import { formatMinor, formatRate, previewOrder, vatSuffix, type OrderPreview } from './money';
import { EVENT_SLUG, STRIPE_PUBLISHABLE_KEY, salesEnabled } from './config';
import { loadStripe, type EmbeddedCheckout } from './stripe-loader';
import { captureFirstTouch } from '../utm';
import { trackEvent } from '../analytics';
import { itemFor, toMajor } from './ecommerce';

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
const closedNotice = document.getElementById('tixcClosed');
const invoiceToggle = document.getElementById('tixcInvoiceToggle');
const invoiceForm = document.getElementById('tixcInvoiceForm');
const invoiceTicketSelect = document.getElementById('tixc-inv-ticket');
const invoiceQtyInput = document.getElementById('tixc-inv-qty');
const invoiceSubmit = document.getElementById('tixcInvoiceSubmit');

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
  summary &&
  invoiceToggle instanceof HTMLButtonElement &&
  invoiceForm instanceof HTMLFormElement &&
  invoiceTicketSelect instanceof HTMLSelectElement &&
  invoiceQtyInput instanceof HTMLInputElement &&
  invoiceSubmit instanceof HTMLAnchorElement
) {
  let ticketTypes: CatalogTicketType[] = [];
  let currency = 'EUR';
  let pricesIncludeTax = true;
  let cart: Cart = {};
  let embeddedCheckout: EmbeddedCheckout | null = null;

  function ticketById(id: string): CatalogTicketType | undefined {
    return ticketTypes.find((t) => t.id === id);
  }

  function preview(entries: Array<[string, number]>): OrderPreview {
    const lines = entries.flatMap(([id, quantity]) => {
      const tt = ticketById(id);
      return tt && quantity > 0 ? [{ tt, quantity }] : [];
    });
    return previewOrder(lines, pricesIncludeTax);
  }

  // Subtotal + one VAT row per rate, only when VAT is added on top.
  function vatRowsHtml(totals: OrderPreview): string {
    if (totals.vat.length === 0) return '';
    const rows = [
      ['Subtotal', totals.subtotalMinor] as const,
      ...totals.vat.map((v) => [`VAT ${formatRate(v.rateBps)}`, v.amountMinor] as const),
    ];
    return `<div class="tixc-summary-lines tixc-summary-vat">${rows
      .map(
        ([label, amount]) => `<div class="tixc-summary-line">
          <span>${label}</span>
          <span>${formatMinor(amount, currency)}</span>
        </div>`,
      )
      .join('')}</div>`;
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
    const totals = preview(entries);
    summary.innerHTML = `
      <span class="eyebrow">ODDference 2027</span>
      <div class="tixc-summary-lines">${lines}</div>
      ${vatRowsHtml(totals)}
      <div class="tixc-summary-total-row">
        <span>Total</span>
        <span>${formatMinor(totals.totalMinor, currency)}</span>
      </div>
      ${pricesIncludeTax ? '<p class="tixc-summary-vat-note">VAT included where applicable</p>' : ''}
    `;
  }

  // No invoicing backend exists yet (email delivery infrastructure is an
  // open item — see ../../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md's
  // launch checklist), so submitting #tixcInvoiceForm builds a plain
  // mailto: to Ronny rather than calling a server — same "honest
  // placeholder, zero new infra" pattern as #tixcNotConnected above. The
  // buyer's own mail client sends it. Deliberately independent of the
  // cart's own ticket type/quantity (though pre-filled from it below) —
  // Ronny asked for this to require its own explicit ticket-type +
  // quantity entry, not silently reuse whatever's in the cart.
  function buildInvoiceMailtoHref(
    ticketTypeId: string,
    quantity: number,
    name: string,
    email: string,
    company: string,
  ): string {
    const tt = ticketById(ticketTypeId);
    const line = tt
      ? `${quantity} x ${tt.name} - ${formatMinor(tt.displayPriceMinor * quantity, tt.currency)}`
      : `${quantity} x (ticket type unavailable)`;
    const totals = preview([[ticketTypeId, quantity]]);
    const total = tt ? formatMinor(totals.totalMinor, tt.currency) : '—';
    const body = [
      'Hi Ronny,',
      '',
      "I'd like to request an invoice for the following ODDference 2027 tickets:",
      '',
      line,
      ...(tt
        ? totals.vat.map(
            (v) => `VAT ${formatRate(v.rateBps)}: ${formatMinor(v.amountMinor, tt.currency)}`,
          )
        : []),
      '',
      `Total: ${total}${pricesIncludeTax ? ' (VAT included where applicable)' : ''}`,
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${company || '-'}`,
      '',
      'Thanks!',
    ].join('\n');
    const subject = 'ODDference 2027 — invoice request';
    return `mailto:hello@oddfest.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function escapeHtml(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  companyToggle.addEventListener('change', () => {
    companyFields.hidden = !companyToggle.checked;
  });

  invoiceToggle.addEventListener('click', () => {
    const nextHidden = !invoiceForm.hidden;
    invoiceForm.hidden = nextHidden;
    invoiceToggle.setAttribute('aria-expanded', String(!nextHidden));
    if (!nextHidden) {
      refreshInvoiceHref();
      invoiceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // The CTA is a real <a href="mailto:...">, kept live-updated on every
  // relevant input change, rather than a JS-driven window.location
  // assignment on submit — a genuine link the browser (and right-click
  // "copy email address") handles natively, matching this site's existing
  // Pill anchor-button pattern elsewhere. Disabled (via aria-disabled +
  // an intercepted click) until the required fields actually validate.
  const refreshInvoiceHref = (): void => {
    const ticketTypeId = invoiceTicketSelect.value;
    const quantity = Math.max(1, Math.trunc(Number(invoiceQtyInput.value) || 1));
    const name =
      (document.getElementById('tixc-inv-name') as HTMLInputElement | null)?.value.trim() ?? '';
    const email =
      (document.getElementById('tixc-inv-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const company =
      (document.getElementById('tixc-inv-company') as HTMLInputElement | null)?.value.trim() ?? '';
    invoiceSubmit.href = buildInvoiceMailtoHref(ticketTypeId, quantity, name, email, company);
    const isValid = invoiceForm.checkValidity();
    invoiceSubmit.setAttribute('aria-disabled', String(!isValid));
  };

  invoiceForm.addEventListener('input', refreshInvoiceHref);
  invoiceForm.addEventListener('change', refreshInvoiceHref);

  invoiceSubmit.addEventListener('click', (e) => {
    if (invoiceForm.checkValidity()) return; // real mailto href, let the browser handle it
    e.preventDefault();
    invoiceForm.reportValidity();
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
        "Payment isn't connected yet — please email hello@oddfest.co to reserve your ticket.";
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
      trackEvent('add_payment_info', {
        currency,
        value: toMajor(result.totalMinor),
        payment_type: 'stripe',
        items: Object.entries(cart).flatMap(([id, quantity]) => {
          const tt = ticketTypes.find((t) => t.id === id);
          return tt && quantity > 0 ? [itemFor(tt, quantity, EVENT_SLUG)] : [];
        }),
      });
    } catch (err) {
      console.error('Stripe embedded checkout failed to mount', err);
      paymentError.hidden = false;
      paymentError.textContent =
        "We couldn't load the payment form. Please refresh this page — your order is held for a few minutes.";
    }
  });

  (async function init() {
    // Before anything else: if card payment is not open, this page has no
    // job. A stale cart in localStorage or a shared link both land here.
    if (!salesEnabled(window.location)) {
      layout.hidden = true;
      if (closedNotice) closedNotice.hidden = false;
      return;
    }

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
    pricesIncludeTax = catalog.event.pricesIncludeTax !== false;

    invoiceTicketSelect.innerHTML = ticketTypes
      .map((tt) => {
        const price = `${formatMinor(tt.displayPriceMinor, tt.currency)} ${vatSuffix(tt, pricesIncludeTax)}`;
        return `<option value="${tt.id}">${escapeHtml(tt.name)} — ${price.trim()}</option>`;
      })
      .join('');
    const firstCartEntry = Object.entries(cart).find(([, qty]) => qty > 0);
    if (firstCartEntry) {
      const [firstCartId, firstCartQty] = firstCartEntry;
      invoiceTicketSelect.value = firstCartId;
      invoiceQtyInput.value = String(firstCartQty);
    }

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
