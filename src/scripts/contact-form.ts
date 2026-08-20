// Progressive-enhancement submit for the contact form via Web3Forms
// (api.web3forms.com) — no backend of ours involved. See ContactForm.astro's
// own comment: with no access key set yet, this tells the visitor the form
// isn't connected instead of pretending to send anything.
const form = document.getElementById('contactForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');
  const accessKey = form.dataset.accessKey;

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
