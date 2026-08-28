// Progressive-enhancement submit for the footer newsletter form. Replaces
// the old bare `GET .../beehiiv-hosted-page` redirect with a
// POST to /api/newsletter on the Growth OS Worker (../odd-growth-os's
// worker/src/index.ts; see api-base.ts for why this is a cross-origin
// absolute URL, not same-origin), which calls beehiiv's API server-side and
// preserves UTM/source data the redirect never captured.
//
// If JS fails to load or the fetch throws, the form's own `action`/`method`
// attributes are untouched, so a native submit still falls through to the
// original beehiiv-hosted subscribe page (see Footer.astro) — this never
// leaves a visitor with a dead button.
import { captureFirstTouch } from './utm';
import { API_BASE } from './api-base';
import { trackEvent } from './analytics';

const form = document.getElementById('newsletterForm');
if (form instanceof HTMLFormElement) {
  const status = form.parentElement?.querySelector<HTMLElement>('.nl-status');

  form.addEventListener('submit', async (e) => {
    const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]');
    if (!emailInput?.value) return; // let native `required` validation handle it

    e.preventDefault();
    if (!status) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Signing up…';

    const payload = { ...Object.fromEntries(new FormData(form)), source: 'footer_newsletter' };

    try {
      const res = await fetch(`${API_BASE}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ...captureFirstTouch() }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      status.textContent = data.message;
      if (data.ok) {
        trackEvent('newsletter_signup', { source: 'footer_newsletter' });
        form.reset();
      }
    } catch {
      status.textContent = "We couldn't sign you up right now — try again shortly.";
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

export {};
