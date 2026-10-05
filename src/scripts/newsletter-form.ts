// Progressive-enhancement submit for every newsletter form on the page
// (footer + the timed popup share this one script via NewsletterForm.astro —
// see docs/architecture.md). Replaces the old bare
// `GET .../beehiiv-hosted-page` redirect with a POST to /api/newsletter on
// the Growth OS Worker (../odd-growth-os's worker/src/index.ts; see
// api-base.ts for why this is a cross-origin absolute URL, not same-origin),
// which calls beehiiv's API server-side and preserves UTM/source data the
// redirect never captured.
//
// If JS fails to load or the fetch throws, each form's own `action`/`method`
// attributes are untouched, so a native submit still falls through to the
// original beehiiv-hosted subscribe page — this never leaves a visitor with
// a dead button.
import { captureSubmitSource } from './utm';
import { API_BASE } from './api-base';
import { trackEvent } from './analytics';
import { postJson } from './post-json';

document.querySelectorAll<HTMLFormElement>('[data-newsletter-form]').forEach((form) => {
  const status = form.parentElement?.querySelector<HTMLElement>('.nl-status');
  const source = form.dataset.source || 'newsletter';

  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  let sending = false;

  form.addEventListener('submit', async (e) => {
    const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]');
    if (!emailInput?.value) return; // let native `required` validation handle it

    e.preventDefault();
    if (!status || sending) return;
    sending = true;
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Signing up…';

    const payload = { ...Object.fromEntries(new FormData(form)), source };
    const result = await postJson(`${API_BASE}/api/newsletter`, {
      ...payload,
      ...captureSubmitSource(),
    });
    if (result.kind === 'ok') {
      status.textContent = result.message;
      trackEvent('newsletter_signup', { signup_source: source });
      form.reset();
    } else {
      status.textContent =
        result.kind === 'refused'
          ? result.message
          : result.kind === 'timeout'
            ? "This is taking too long, and we can't tell whether you're signed up. Check your inbox for a welcome email before trying again."
            : "We couldn't sign you up right now. Try again shortly.";
      // The failure path had no event at all, so a beehiiv outage or a
      // rejected address looked identical to nobody trying to sign up.
      trackEvent('newsletter_error', {
        signup_source: source,
        error_kind:
          result.kind === 'refused'
            ? 'rejected'
            : result.kind === 'timeout'
              ? 'timeout'
              : 'network',
      });
    }
    sending = false;
    submitBtn?.removeAttribute('disabled');
  });
});

export {};
