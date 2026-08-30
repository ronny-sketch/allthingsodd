// Progressive-enhancement submit for every newsletter form on the page
// (footer + the timed popup share this one script via NewsletterForm.astro —
// see docs/architecture.md). Replaces the old bare
// `GET .../beehiiv-hosted-page` redirect with a same-origin POST to
// /api/newsletter (worker/src/index.ts), which calls beehiiv's API
// server-side and preserves UTM/source data the redirect never captured.
//
// If JS fails to load or the fetch throws, each form's own `action`/`method`
// attributes are untouched, so a native submit still falls through to the
// original beehiiv-hosted subscribe page — this never leaves a visitor with
// a dead button.
import { captureFirstTouch } from './utm';

document.querySelectorAll<HTMLFormElement>('[data-newsletter-form]').forEach((form) => {
  const status = form.parentElement?.querySelector<HTMLElement>('.nl-status');
  const source = form.dataset.source || 'newsletter';

  form.addEventListener('submit', async (e) => {
    const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]');
    if (!emailInput?.value) return; // let native `required` validation handle it

    e.preventDefault();
    if (!status) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Signing up…';

    const payload = { ...Object.fromEntries(new FormData(form)), source };

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ...captureFirstTouch() }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      status.textContent = data.message;
      if (data.ok) form.reset();
    } catch {
      status.textContent = "We couldn't sign you up right now — try again shortly.";
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
});

export {};
