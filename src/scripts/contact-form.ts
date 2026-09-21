// Progressive-enhancement submit for the contact form. Posts to /api/contact
// on the Growth OS Worker (../odd-growth-os's worker/src/index.ts; see
// api-base.ts for why it's a cross-origin absolute URL), which picks the
// recipient group by topic server-side and emails it. Replaced Web3Forms
// (2026-09-20): one public key per recipient meant one sign-up per Google
// Group, and the only key ever created went to one person's inbox.
import { CONTACT_TOPICS, type ContactTopicValue } from './contact-topics';
import { API_BASE } from './api-base';
import { captureFirstTouch } from './utm';

// Known ?topic= values from deep links elsewhere on the site. `route` is the
// topic the Worker delivers by; `label` is the wording the inbox sees, so two
// different ODDfest asks never read as one.
const DEEP_LINKS: Record<string, { route: ContactTopicValue; label: string }> = {
  oddfest_2027_event: { route: 'oddfest', label: 'ODDfest 2027 — event idea' },
  oddfest_2027_question: { route: 'oddfest', label: 'ODDfest 2027 — a question' },
  oddfest_2026_feedback: { route: 'oddfest', label: 'ODDfest 2026 — feedback' },
};

const form = document.getElementById('contactForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');
  const topicField = form.querySelector<HTMLSelectElement>('#cf-topic');
  const topicNote = document.getElementById('cf-topic-note');
  const regardingField = form.querySelector<HTMLInputElement>('#cf-regarding');

  const topicParam = new URLSearchParams(window.location.search).get('topic');
  const deepLink = topicParam ? DEEP_LINKS[topicParam] : undefined;
  if (deepLink) {
    if (topicField) topicField.value = deepLink.route;
    if (regardingField) regardingField.value = deepLink.label;
    if (topicNote) {
      topicNote.textContent = `Regarding: ${deepLink.label}.`;
      topicNote.hidden = false;
    }
  }

  // Once the visitor picks a topic by hand, the deep link no longer
  // describes what they are writing about — drop its label and its note.
  topicField?.addEventListener('change', () => {
    if (regardingField) regardingField.value = '';
    if (topicNote) topicNote.hidden = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Sending…';

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Same first-touch data the newsletter and enquiry forms send, so a
        // campaign that produced a message is visible in the inbox.
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(form)),
          ...captureFirstTouch(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      status.textContent = data.message;
      if (data.ok) {
        form.reset();
        if (topicNote) topicNote.hidden = true;
      }
    } catch {
      status.textContent = 'Something went wrong — try again, or email us directly.';
    }
    submitBtn?.removeAttribute('disabled');
  });

  // Readiness flag so a test can wait for the submit handler rather than
  // race the module script that attaches it (same convention as reveal.ts).
  form.dataset.ready = 'true';
}

// Referenced so the option list and the Worker's topic enum stay one table.
void CONTACT_TOPICS;

export {};
