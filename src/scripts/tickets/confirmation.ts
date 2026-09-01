// /tickets/confirmation page controller. Never trusts the Stripe redirect
// itself as proof of payment — polls GET /api/tickets/order-status, which
// only ever reflects what the webhook handler wrote. See
// ../../../odd-growth-os/ops/TICKETING_IMPLEMENTATION_PLAN.md's "Stripe
// flow" and the brief's "payment success must come from webhooks" rule.
import { fetchOrderStatus, assignAttendee, type OrderStatusResponse } from './api';
import { EVENT_SLUG } from './config';
import { trackEvent } from '../analytics';

const ORDER_TOKEN_KEY = 'odd_tickets_order_token_v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // ~60s

const heading = document.getElementById('tixfHeading');
const processing = document.getElementById('tixfProcessing');
const success = document.getElementById('tixfSuccess');
const failed = document.getElementById('tixfFailed');
const timeout = document.getElementById('tixfTimeout');
const notFound = document.getElementById('tixfNotFound');
const ticketList = document.getElementById('tixfTicketList')!;
const failedMessage = document.getElementById('tixfFailedMessage');

// One real heading text per state, keyed by the same element each state's
// <div> already uses — see confirmation.astro's own comment on why this
// page has a single shared <h1> instead of one per state.
const HEADINGS: Record<string, string> = {
  tixfProcessing: 'Processing your payment…',
  tixfSuccess: 'Your tickets are yours.',
  tixfFailed: "This order didn't go through",
  tixfTimeout: 'Still processing',
  tixfNotFound: "We couldn't find that order",
};

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function show(el: HTMLElement | null): void {
  if (!el) return;
  el.removeAttribute('hidden');
  if (heading && HEADINGS[el.id]) heading.textContent = HEADINGS[el.id];
}
function hide(el: HTMLElement | null): void {
  el?.setAttribute('hidden', '');
}

function ticketRowHtml(index: number, ticketCode: string, assigned: boolean): string {
  return `<div class="tixf-ticket" data-code="${escapeHtml(ticketCode)}">
    <div class="tixf-ticket-head">
      <span class="tixf-ticket-number">Ticket ${index + 1}</span>
      <span class="tixf-ticket-code">${escapeHtml(ticketCode)}</span>
    </div>
    <div class="tixf-ticket-qr" data-role="qr"></div>
    <form class="tixf-assign-form" data-role="assign-form">
      <div class="field">
        <label for="tixf-name-${index}">Attendee name</label>
        <input id="tixf-name-${index}" name="name" type="text" required autocomplete="off" />
      </div>
      <div class="field">
        <label for="tixf-email-${index}">Attendee email (optional)</label>
        <input id="tixf-email-${index}" name="email" type="email" autocomplete="off" />
      </div>
      <button type="submit" class="pill pill-outline">${assigned ? 'Update' : 'Assign this ticket'}</button>
      <p class="tixf-assign-status" role="status" aria-live="polite">${assigned ? 'Assigned' : ''}</p>
    </form>
  </div>`;
}

async function renderQr(container: HTMLElement, ticketCode: string): Promise<void> {
  try {
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(ticketCode, { margin: 1, width: 220 });
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `QR code for ticket ${ticketCode}`;
    img.width = 220;
    img.height = 220;
    container.appendChild(img);
  } catch (err) {
    console.error('QR generation failed', err);
    container.textContent = 'QR code unavailable — use the code above at check-in.';
  }
}

async function renderTickets(orderToken: string, order: OrderStatusResponse): Promise<void> {
  if (!ticketList) return;
  ticketList.innerHTML = order.tickets
    .map((t, i) => ticketRowHtml(i, t.ticketCode, t.attendeeAssigned))
    .join('');

  ticketList.querySelectorAll<HTMLElement>('[data-role="qr"]').forEach((el) => {
    const code = el.closest<HTMLElement>('.tixf-ticket')?.dataset.code;
    if (code) renderQr(el, code);
  });

  ticketList.querySelectorAll<HTMLFormElement>('[data-role="assign-form"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ticketCode = form.closest<HTMLElement>('.tixf-ticket')?.dataset.code;
      if (!ticketCode) return;
      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const statusEl = form.querySelector<HTMLElement>('.tixf-assign-status');
      const formData = new FormData(form);
      const name = String(formData.get('name') ?? '').trim();
      const email = String(formData.get('email') ?? '').trim() || undefined;
      if (!name) return;

      submitBtn?.setAttribute('disabled', 'true');
      if (statusEl) statusEl.textContent = 'Saving…';

      const result = await assignAttendee(orderToken, ticketCode, name, email);
      if (result.ok) {
        if (statusEl) statusEl.textContent = 'Assigned';
        if (submitBtn) submitBtn.textContent = 'Update';
        trackEvent('ticket_assigned', { event: EVENT_SLUG });
      } else if (statusEl) {
        statusEl.textContent = result.message;
      }
      submitBtn?.removeAttribute('disabled');
    });
  });
}

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const orderToken = params.get('order_token') ?? sessionStorage.getItem(ORDER_TOKEN_KEY);

  if (!orderToken) {
    show(notFound);
    return;
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
      trackEvent('payment_succeeded', { event: EVENT_SLUG, ticket_count: order.tickets.length });
      await renderTickets(orderToken!, order);
      return;
    }

    if (order.status === 'expired' || order.status === 'cancelled' || order.status === 'refunded') {
      hide(processing);
      show(failed);
      if (failedMessage) {
        failedMessage.textContent =
          order.status === 'expired'
            ? 'This order expired before payment completed. Please start again.'
            : "This order isn't valid anymore. Please email ronny@oddfest.co if you think this is a mistake.";
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
