// Progressive-enhancement submit for the "Work with ODD" business-enquiry
// form, posting to the same-origin Worker route /api/business-enquiry (see
// worker/src/index.ts). No API key or vendor SDK here — this is a plain
// fetch to our own endpoint, which is what actually holds the Attio secret.
import { captureFirstTouch } from './utm';

const form = document.getElementById('workEnquiryForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Sending…';

    const payload = { ...Object.fromEntries(new FormData(form)), ...captureFirstTouch() };

    try {
      const res = await fetch('/api/business-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      status.textContent = data.message;
      if (data.ok) form.reset();
    } catch {
      status.textContent =
        "We couldn't submit this right now. Please try again or email us directly.";
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

export {};
