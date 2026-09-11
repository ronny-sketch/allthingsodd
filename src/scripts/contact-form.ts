// Progressive-enhancement submit for the contact form via Web3Forms
// (api.web3forms.com) — no backend of ours involved. See ContactForm.astro's
// own comment: with no access key set yet, this tells the visitor the form
// isn't connected instead of pretending to send anything.
import { CONTACT_TOPICS, type ContactAccessKeys, type ContactTopicValue } from './contact-topics';

// Known ?topic= values from deep links elsewhere on the site (both of them
// ODDfest's — the "How to join" section's two CTAs, see oddfest.json) — a
// friendlier subject line and an on-page confirmation that the message landed
// in the right place, without needing a dedicated registration form/endpoint
// that doesn't exist yet. Any unrecognised or absent value leaves the form's
// default subject/behaviour untouched.
//
// `routes` is what the deep link means for delivery, kept separate from the
// subject label: both of these are ODDfest's, so both must reach the ODDfest
// group, but they are two different asks and should not read as one in the
// inbox.
const DEEP_LINKS: Record<string, { route: ContactTopicValue; label: string }> = {
  oddfest_2027_event: { route: 'oddfest', label: 'ODDfest 2027 — event idea' },
  // The second way in from "How to join" (2026-09-11), for a reader who is
  // interested but has nothing to submit yet. Keep the two distinct: the
  // whole point of routing them separately is that one is a submission and
  // the other is a question, and they do not want the same reply.
  oddfest_2027_question: { route: 'oddfest', label: 'ODDfest 2027 — a question' },
};

const TOPIC_SUBJECTS = new Map(CONTACT_TOPICS.map((t) => [t.value, t.subject]));

const form = document.getElementById('contactForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');
  const subjectField = form.querySelector<HTMLInputElement>('#cf-subject');
  const topicField = form.querySelector<HTMLSelectElement>('#cf-topic');

  let accessKeys: ContactAccessKeys = {};
  try {
    accessKeys = JSON.parse(form.dataset.accessKeys || '{}') as ContactAccessKeys;
  } catch {
    // A malformed data attribute is a content/build problem, not the
    // visitor's — fall through to the "isn't connected" message below rather
    // than throwing and leaving the submit button silently dead.
    accessKeys = {};
  }

  // A deep link's own wording wins over the generic topic label, but only
  // while the visitor hasn't overridden the topic themselves.
  const topicParam = new URLSearchParams(window.location.search).get('topic');
  const deepLink = topicParam ? DEEP_LINKS[topicParam] : undefined;
  let deepLinkLabel = deepLink?.label;

  if (deepLink && topicField) topicField.value = deepLink.route;
  if (deepLinkLabel) {
    const topicNote = document.getElementById('cf-topic-note');
    if (topicNote) {
      topicNote.textContent = `Regarding: ${deepLinkLabel}.`;
      topicNote.hidden = false;
    }
  }

  const selectedTopic = (): ContactTopicValue =>
    (topicField?.value as ContactTopicValue) || 'general';

  const syncSubject = () => {
    if (!subjectField) return;
    const label = deepLinkLabel ?? TOPIC_SUBJECTS.get(selectedTopic()) ?? 'General';
    // The subject names the site it came from, not the address it goes to.
    // The old oddfest.co site still exists and still has its own forms, so a
    // subject naming it made messages from this site indistinguishable from
    // that one's.
    subjectField.value = `${label} — allthingsodd.co contact form`;
  };

  topicField?.addEventListener('change', () => {
    // Once the visitor picks a topic by hand, the deep link no longer
    // describes what they are writing about — drop its label and its note.
    if (deepLinkLabel) {
      deepLinkLabel = undefined;
      const topicNote = document.getElementById('cf-topic-note');
      if (topicNote) topicNote.hidden = true;
    }
    syncSubject();
  });
  syncSubject();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return;

    // Falling back to the general key rather than refusing: a message landing
    // in the shared inbox under the right subject is recoverable by a human,
    // a message never sent is not.
    const topic = selectedTopic();
    const accessKey = accessKeys[topic]?.trim() || accessKeys.general?.trim();

    if (!accessKey) {
      status.textContent = "This form isn't connected yet — email us directly instead.";
      return;
    }

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    status.textContent = 'Sending…';

    try {
      const payload = Object.fromEntries(new FormData(form));
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...payload, access_key: accessKey }),
      });
      const data = await res.json();
      if (data.success) {
        form.reset();
        syncSubject();
        status.textContent = "Thanks — we'll get back to you soon.";
      } else {
        status.textContent = 'Something went wrong — try again, or email us directly.';
      }
    } catch {
      status.textContent = 'Something went wrong — try again, or email us directly.';
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

export {};
