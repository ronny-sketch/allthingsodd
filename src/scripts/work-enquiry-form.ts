// Progressive-enhancement submit for the "Work with ODD" business-enquiry
// form, posting to /api/business-enquiry on the Growth OS Worker (see
// ../odd-growth-os's worker/src/index.ts and this repo's api-base.ts for
// why it's a cross-origin absolute URL, not same-origin). No API key or
// vendor SDK here — this is a plain fetch to our own endpoint, which is
// what actually holds the Attio secret.
import { captureFirstTouch } from './utm';
import { API_BASE } from './api-base';
import { trackEvent } from './analytics';
import { submitToWeb3Forms } from './web3forms';

// Human-readable labels for the notification email. The Worker gets the raw
// enum (it has to — ../odd-growth-os/schemas/products.yml is what Attio maps
// against), but "oddference_corporate" in a subject line is unreadable to the
// person being asked to act on it. Falls back to the raw value rather than
// dropping it, so a newly added product still names itself in the inbox.
const INTEREST_LABELS: Record<string, string> = {
  oddference_corporate: 'ODDference',
  oddmembership: 'ODDnetwork',
  strategic_partnership: 'Event partnership',
  oddagency: 'ODDagency / project',
  oddspace: 'ODDspace',
  other: 'Something else',
};

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
  // things — neither a personal member nor someone enquiring about renting
  // the space for an event is necessarily part of a business, so both
  // shouldn't be asked for a "work email" and a required "organisation" as
  // though they were. `requestedIntent` is carried through to the Worker
  // below (see ../../odd-growth-os/worker/src/validate.ts's `intent` field)
  // — Attio has no dedicated structured field for it today, so it lands in
  // the same human-readable submission note goal/timing/referrer already
  // do, not silently folded into the visitor's own free-text message.
  const requestedIntent = params.get('intent');
  if (requestedIntent === 'membership' || requestedIntent === 'event') {
    const emailLabel = form.querySelector<HTMLLabelElement>('#we-email-label');
    const orgLabel = form.querySelector<HTMLLabelElement>('#we-org-label');
    const orgInput = form.querySelector<HTMLInputElement>('#we-org');
    if (emailLabel) emailLabel.textContent = 'Email';
    if (orgLabel) orgLabel.textContent = 'Organisation (leave blank if applying as an individual)';
    if (orgInput) orgInput.required = false;
  }

  const notifyKey = form.dataset.notifyKey?.trim();

  // Emails partners@oddfest.co so a person actually learns the enquiry
  // exists. Resolves false rather than throwing: a failed notification must
  // not take down a submission whose CRM write succeeded.
  async function notifyPartnerships(payload: Record<string, unknown>): Promise<boolean> {
    if (!notifyKey) return false;
    const interest = String(payload.interest ?? '');
    const org = String(payload.organisation ?? '').trim() || 'an individual';
    return submitToWeb3Forms(notifyKey, {
      subject: `Work with ODD — ${INTEREST_LABELS[interest] ?? interest} — ${org}`,
      // Web3Forms treats a field named `email` as the reply-to; this form's
      // is `work_email`, so say it explicitly or replies go nowhere useful.
      replyto: payload.work_email,
      from_name: payload.name,
      ...payload,
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Sending…';

    const payload = {
      ...Object.fromEntries(new FormData(form)),
      ...(requestedIntent === 'membership' || requestedIntent === 'event'
        ? { intent: requestedIntent }
        : {}),
      ...captureFirstTouch(),
    };

    // Both at once: the CRM write and the notification are independent
    // deliveries of the same enquiry, and neither should wait on the other.
    const [crm, notified] = await Promise.all([
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/business-enquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          return (await res.json()) as { ok: boolean; message: string };
        } catch {
          return null;
        }
      })(),
      notifyPartnerships(payload),
    ]);

    if (crm?.ok) {
      status.textContent = crm.message;
      trackEvent('business_enquiry_submit', {
        product_interest: (payload as { interest?: string }).interest,
      });
      form.reset();
    } else if (notified) {
      // Attio is down or rejected it, but the email carries every field the
      // team needs to act on — so the enquiry is genuinely not lost, and
      // telling the visitor to try again would be the false statement here.
      // The missing CRM record is ODD's problem to reconcile, not theirs.
      status.textContent = "Thanks — we've received this and will get back to you soon.";
      trackEvent('business_enquiry_submit', {
        product_interest: (payload as { interest?: string }).interest,
      });
      form.reset();
    } else {
      status.textContent =
        crm?.message ?? "We couldn't submit this right now. Please try again or email us directly.";
    }
    submitBtn?.removeAttribute('disabled');
  });

  // See contact-form.ts — readiness flag so a test can wait for the submit
  // handler rather than race the module script that attaches it.
  form.dataset.ready = 'true';
}

export {};
