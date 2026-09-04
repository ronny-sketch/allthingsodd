// Progressive-enhancement submit for the contact form via Web3Forms
// (api.web3forms.com) — no backend of ours involved. See ContactForm.astro's
// own comment: with no access key set yet, this tells the visitor the form
// isn't connected instead of pretending to send anything.
// Known ?topic= values from deep links elsewhere on the site (currently just
// ODDfest's "Register your event idea" CTA — see oddfest.json) — a friendlier
// subject line and an on-page confirmation that the message landed in the
// right place, without needing a dedicated registration form/endpoint that
// doesn't exist yet. Any unrecognised or absent value leaves the form's
// default subject/behaviour untouched.
const TOPICS: Record<string, string> = {
  oddfest_2027_event: 'ODDfest 2027 — event idea',
};

const form = document.getElementById('contactForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');
  const accessKey = form.dataset.accessKey;

  const topicParam = new URLSearchParams(window.location.search).get('topic');
  const topicLabel = topicParam ? TOPICS[topicParam] : undefined;
  if (topicLabel) {
    const subjectField = form.querySelector<HTMLInputElement>('#cf-subject');
    if (subjectField) subjectField.value = `${topicLabel} — allthingsodd.co contact form`;
    const topicNote = document.getElementById('cf-topic-note');
    if (topicNote) {
      topicNote.textContent = `Regarding: ${topicLabel}.`;
      topicNote.hidden = false;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return;

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
