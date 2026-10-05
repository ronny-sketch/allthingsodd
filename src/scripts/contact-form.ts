// Progressive-enhancement submit for the contact form. Posts to /api/contact
// on the Growth OS Worker (../odd-growth-os's worker/src/index.ts; see
// api-base.ts for why it's a cross-origin absolute URL), which picks the
// recipient group by topic server-side and emails it. Replaced Web3Forms
// (2026-09-20): one public key per recipient meant one sign-up per Google
// Group, and the only key ever created went to one person's inbox.
import { CONTACT_TOPICS, type ContactTopicValue } from './contact-topics';
import { API_BASE } from './api-base';
import { captureSubmitSource } from './utm';
import { trackEvent } from './analytics';
import { postJson, failureText } from './post-json';

const FALLBACK_EMAIL = 'hello@oddfest.co';

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

  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  let sending = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status || sending) return;
    sending = true;
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Sending…';

    // Same submit-source data the newsletter and enquiry forms send, so a
    // campaign that produced a message is visible in the inbox.
    const result = await postJson(`${API_BASE}/api/contact`, {
      ...Object.fromEntries(new FormData(form)),
      ...captureSubmitSource(),
    });
    const topic = topicField?.value ?? 'general';
    if (result.kind === 'ok') {
      status.textContent = result.message;
      // The topic is an enum from contact-topics.ts, so this says which inbox
      // the message routed to and nothing about who wrote it. The message
      // body is never sent anywhere near GA4.
      trackEvent('contact_submit', { contact_topic: topic });
      form.reset();
      if (topicNote) topicNote.hidden = true;
    } else {
      status.textContent =
        result.kind === 'refused'
          ? result.message
          : failureText(result.kind, `email ${FALLBACK_EMAIL}`);
      trackEvent('contact_error', {
        contact_topic: topic,
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

  // The button is rendered disabled (ContactForm.astro), so nothing can be
  // submitted natively before this handler exists.
  submitBtn?.removeAttribute('disabled');

  // Readiness flag so a test can wait for the submit handler rather than
  // race the module script that attaches it (same convention as reveal.ts).
  form.dataset.ready = 'true';
}

// Referenced so the option list and the Worker's topic enum stay one table.
void CONTACT_TOPICS;

export {};
