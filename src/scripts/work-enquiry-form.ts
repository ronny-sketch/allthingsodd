// Progressive-enhancement submit for the "Work with ODD" business-enquiry
// form, posting to /api/business-enquiry on the Growth OS Worker (see
// ../odd-growth-os's worker/src/index.ts and this repo's api-base.ts for
// why it's a cross-origin absolute URL, not same-origin). No API key or
// vendor SDK here — this is a plain fetch to our own endpoint, which is
// what actually holds the Attio secret.
import { captureFirstTouch } from './utm';
import { API_BASE } from './api-base';
import { trackEvent } from './analytics';

const form = document.getElementById('workEnquiryForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');

  // Product-specific pages (ODDagency, Membership, ...) link here with
  // ?interest=<../odd-growth-os/schemas/products.yml value> so a visitor coming from "Bring
  // us a brief" lands with the right option already selected, instead of a
  // blank dropdown that loses the context they arrived with.
  const interestSelect = form.querySelector<HTMLSelectElement>('#we-interest');
  const params = new URLSearchParams(window.location.search);
  const requestedInterest = params.get('interest');
  if (interestSelect && requestedInterest) {
    const match = Array.from(interestSelect.options).find((o) => o.value === requestedInterest);
    if (match) interestSelect.value = requestedInterest;
  }

  // ODDspace's two CTAs ("Become a member" / "Organise an event") both share
  // the single `oddspace` interest value (the Worker's products.yml enum
  // isn't touched by this website-only change) but mean genuinely different
  // things — a personal creative applying for membership shouldn't be asked
  // for a "work email" and a required "organisation" as though they were a
  // business. `intent` is a display-only query param this form reads itself;
  // it's never sent to the Worker. See oddspace.json's own CTAs and
  // content.config.ts's `interest`/`intent` note.
  if (params.get('intent') === 'membership') {
    const emailLabel = form.querySelector<HTMLLabelElement>('#we-email-label');
    const orgLabel = form.querySelector<HTMLLabelElement>('#we-org-label');
    const orgInput = form.querySelector<HTMLInputElement>('#we-org');
    if (emailLabel) emailLabel.textContent = 'Email';
    if (orgLabel) orgLabel.textContent = 'Organisation (leave blank if applying as an individual)';
    if (orgInput) orgInput.required = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Sending…';

    const payload = { ...Object.fromEntries(new FormData(form)), ...captureFirstTouch() };

    try {
      const res = await fetch(`${API_BASE}/api/business-enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      status.textContent = data.message;
      if (data.ok) {
        trackEvent('business_enquiry_submit', {
          product_interest: (payload as { interest?: string }).interest,
        });
        form.reset();
      }
    } catch {
      status.textContent =
        "We couldn't submit this right now. Please try again or email us directly.";
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

export {};
