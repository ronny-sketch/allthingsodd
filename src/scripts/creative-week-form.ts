// Script for the ODDfest 2027 Creative Week submission (CreativeWeekForm.astro).
// It runs the same guided dialog as the venue page's quote form
// (booking-enquiry-form.ts): opening and closing it, one step at a time
// with a progress bar, a "Check and send" summary and the sticky bar. It
// turns the answers into the payload, validates them with the rules in
// creative-week-schema.ts and POSTs JSON to /api/creative-week-submission
// on the Growth OS Worker (api-base.ts says why that is a cross-origin URL).
// The Worker validates everything again and holds the Notion token.
//
// Duplicates. One request at a time with the button disabled, and one
// `submission_id` per filled-in form, generated once and reused on every
// retry: the Worker treats it as an idempotency key, so a retry after a
// timeout that did reach Notion does not make a second record.
//
// The answer is read strictly (readOutcome): the thank-you shows only for
// the three states in which the Worker says it kept the idea (delivered,
// queued, emailed), with this form's own id echoed back, and each state has
// its own wording. Anything else keeps the answers and says to try again.
//
// Errors. Nothing is marked while someone is still filling a step in, apart
// from an email address that is plainly wrong once they leave the field.
// Next checks the current step only; Back never checks anything; Send checks
// everything again and takes the visitor to the first step with something
// missing. Every link to #creative-week-form opens the dialog, and the URL
// gains the hash, so the phone's back button closes it again, as do Esc and
// ×. The answers live in the page until it is reloaded; nothing is stored in
// the browser.
import { API_BASE } from './api-base';
import { captureFirstTouch } from './utm';
import { trackEvent } from './analytics';
import {
  readOutcome,
  validateCreativeWeek,
  type CreativeWeekPayload,
} from './creative-week-schema';

const REQUEST_TIMEOUT_MS = 20_000;
const FALLBACK_EMAIL = 'hello@oddfest.co';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HASH = '#creative-week-form';

type Errors = Record<string, string>;

function newSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 from getRandomValues, for the few browsers without randomUUID.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// "/oddfest" and "/oddfest/" are the same page.
const samePath = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

const form = document.getElementById('creativeWeekForm');
const dialog = document.getElementById('cw-dialog');
if (form instanceof HTMLFormElement && dialog instanceof HTMLDialogElement) {
  const body = document.getElementById('cw-body');
  const status = form.querySelector<HTMLElement>('.form-status');
  const announce = document.getElementById('cw-announce');
  const review = form.querySelector<HTMLElement>('#cw-review');
  const done = document.getElementById('cw-done');
  const count = document.getElementById('cw-count');
  const progress = Array.from(dialog.querySelectorAll<HTMLElement>('.cw-progress li'));
  const backBtn = form.querySelector<HTMLButtonElement>('.cw-back');
  const nextBtn = form.querySelector<HTMLButtonElement>('.cw-next');
  const steps = Array.from(form.querySelectorAll<HTMLElement>('.cw-step[data-step]'));
  const numbered = steps.filter((s) => s.dataset.step !== 'review');
  const submissionId = newSubmissionId();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sending = false;
  let sent = false;
  let attempted = false;
  let current = 0;
  // Set by "Edit" on the summary: that step's Next goes straight back there.
  let editing = false;

  // --- Reading controls ---------------------------------------------------

  const valuesOf = (name: string): string[] =>
    Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`))
      .filter((c) => !c.disabled)
      .filter((c) => (c.type === 'radio' || c.type === 'checkbox' ? c.checked : c.value !== ''))
      .map((c) => c.value);
  const value = (name: string) => valuesOf(name)[0]?.trim() ?? '';

  // The visible label of each checked option of one name.
  const choiceLabels = (name: string): string[] =>
    Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`))
      .filter((c) => !c.disabled)
      .map(
        (c) =>
          c.closest('label')?.querySelector('.chip-face, .cw-option-text')?.textContent?.trim() ??
          c.value,
      );

  // --- Conditional questions ----------------------------------------------

  const conditionals = Array.from(form.querySelectorAll<HTMLElement>('[data-show-when]'));
  const applies = (rule: string): boolean => {
    const [name, wanted] = rule.split('=');
    if (!name || wanted === undefined) return true;
    const answers = valuesOf(name);
    return wanted.split('|').some((v) => answers.includes(v));
  };
  const applyConditionals = () => {
    for (const el of conditionals) {
      const show = applies(el.dataset.showWhen ?? '');
      el.hidden = !show;
      el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach(
        (c) => {
          c.disabled = !show;
        },
      );
    }
  };

  // --- From questions to payload ------------------------------------------

  const sourceOf = () => {
    const touch = captureFirstTouch();
    const utm = [
      touch.utm_source && `utm_source=${touch.utm_source}`,
      touch.utm_medium && `utm_medium=${touch.utm_medium}`,
      touch.utm_campaign && `utm_campaign=${touch.utm_campaign}`,
    ].filter(Boolean);
    return [window.location.pathname, ...utm].join(' · ').slice(0, 200);
  };

  const readPayload = (): CreativeWeekPayload => {
    const fd = new FormData(form);
    const str = (k: string) => {
      const v = fd.get(k);
      return typeof v === 'string' ? v.trim() : '';
    };
    const opt = (k: string) => str(k) || undefined;
    const list = (k: string) => fd.getAll(k).map(String);
    return {
      submission_id: submissionId,
      source: sourceOf(),
      hp_field: str('hp_field'),

      full_name: str('full_name'),
      email: str('email'),
      phone: str('phone'),
      org_name: str('org_name'),
      website: str('website'),
      applicant_type: str('applicant_type'),
      applicant_type_other: opt('applicant_type_other'),

      title: str('title'),
      description: str('description'),
      event_kind: str('event_kind'),
      formats: list('formats'),
      formats_other: opt('formats_other'),
      fields: list('fields'),
      fields_other: opt('fields_other'),
      motivation: opt('motivation'),

      readiness: str('readiness'),
      readiness_other: opt('readiness_other'),
      involved: opt('involved'),
      still_needed: str('still_needed'),

      venue_status: str('venue_status'),
      venue: opt('venue'),
      space_needs: opt('space_needs'),
      timing_flexibility: str('timing_flexibility'),
      timing_notes: opt('timing_notes'),

      audiences: list('audiences'),
      audiences_other: opt('audiences_other'),
      access: str('access'),
      capacity: str('capacity'),

      help: list('help'),
      help_other: opt('help_other'),
      help_details: str('help_details'),
      financing: str('financing'),

      links: opt('links'),
      notes: opt('notes'),
      referral: opt('referral'),
      referral_other: opt('referral_other'),

      ack_selection: str('ack_selection') === 'true',
      ack_responsibility: str('ack_responsibility') === 'true',
      consent_privacy: str('consent_privacy') === 'true',
    };
  };

  const collectErrors = (): Errors => validateCreativeWeek(readPayload()) as Errors;

  // --- Marking questions --------------------------------------------------

  const wrapperFor = (name: string) =>
    form.querySelector<HTMLElement>(`[name="${name}"]`)?.closest<HTMLElement>('.field') ?? null;

  const controlsIn = (wrap: HTMLElement) =>
    Array.from(
      wrap.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]), textarea',
      ),
    ).filter((c) => !c.disabled);

  const errorSlot = (wrap: HTMLElement) => wrap.querySelector<HTMLElement>(':scope > .field-error');

  const mark = (wrap: HTMLElement, message: string) => {
    const err = errorSlot(wrap);
    if (!err) return;
    err.textContent = message;
    err.hidden = false;
    wrap.classList.add('is-invalid');
    for (const c of controlsIn(wrap)) {
      c.setAttribute('aria-invalid', 'true');
      const ids = new Set((c.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
      ids.add(err.id);
      c.setAttribute('aria-describedby', [...ids].join(' '));
    }
  };

  const unmark = (wrap: HTMLElement) => {
    const err = errorSlot(wrap);
    wrap.classList.remove('is-invalid');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
    wrap.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
  };

  const invalidWrappers = () =>
    Array.from(form.querySelectorAll<HTMLElement>('.field.is-invalid')).filter((w) => !w.hidden);

  // One entry per question, in page order, first message wins.
  const byQuestion = (errors: Errors) => {
    const seen = new Map<HTMLElement, string>();
    for (const [name, message] of Object.entries(errors)) {
      if (!message) continue;
      const wrap = wrapperFor(name);
      if (wrap && !wrap.hidden && !seen.has(wrap)) seen.set(wrap, message);
    }
    return [...seen.entries()].sort(([a], [b]) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  };

  const stepIndexOf = (el: Element) => {
    const step = el.closest<HTMLElement>('.cw-step');
    return step ? steps.indexOf(step) : -1;
  };

  const focusQuestion = (wrap: HTMLElement) => {
    const controls = controlsIn(wrap);
    const target =
      controls.find((c) => c.value === '' && c.type !== 'radio' && c.type !== 'checkbox') ??
      controls[0];
    wrap.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    target?.focus({ preventScroll: true });
  };

  const setStatus = (text: string, isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  const say = (text: string) => {
    if (!announce) return;
    // Cleared first, so the same text announced twice is still announced.
    announce.textContent = '';
    window.setTimeout(() => {
      announce.textContent = text;
    }, 50);
  };

  const neededText = (n: number) => {
    if (steps[current]?.dataset.step === 'review') {
      return n === 1 ? '1 tick box needed before sending.' : `${n} answers needed before sending.`;
    }
    return n === 1 ? '1 answer needed to continue.' : `${n} answers needed to continue.`;
  };

  // Marks each question in `entries`, says how many, and moves to the first.
  const showErrors = (entries: [HTMLElement, string][]) => {
    for (const [wrap, message] of entries) mark(wrap, message);
    const here = entries.filter(([w]) => stepIndexOf(w) === current);
    const n = here.length;
    if (n > 0) {
      setStatus(neededText(n), true);
      const labels = here.map(([w]) => w.dataset.label ?? '').filter(Boolean);
      say(`${n === 1 ? '1 answer' : `${n} answers`} needed: ${labels.join(', ')}.`);
      focusQuestion(here[0]![0]);
    }
  };

  // Keep each marked question's message current and clear it once it is
  // answered. Nothing new is marked here: that would scold someone halfway
  // through typing.
  const refreshMarks = () => {
    if (invalidWrappers().length === 0) return;
    const now = new Map(byQuestion(collectErrors()));
    for (const wrap of invalidWrappers()) {
      const message = now.get(wrap);
      if (message) mark(wrap, message);
      else unmark(wrap);
    }
    form.querySelectorAll<HTMLElement>('.field.is-invalid[hidden]').forEach(unmark);
    const left = invalidWrappers().filter((w) => stepIndexOf(w) === current).length;
    if (status?.classList.contains('is-error') && !sending) {
      setStatus(left === 0 ? '' : neededText(left), left > 0);
    }
  };

  // --- Check and send -----------------------------------------------------

  type Row = [label: string, value: string | undefined];

  // A choice and the words behind its "Other", as one line.
  const withOther = (name: string, other: string) => {
    const picked = valuesOf(name);
    const extra = value(other);
    const labels = choiceLabels(name).map((l, i) =>
      picked[i] === 'other' && extra ? `${l}: ${extra}` : l,
    );
    return labels.join(', ') || undefined;
  };

  // What the summary shows for each numbered step. Empty answers are left
  // out; the required ones cannot be empty by the time it shows.
  const summaryRows = (): Row[][] => [
    [
      ['Working title', value('title')],
      ['The idea', value('description')],
      ['Type', choiceLabels('event_kind')[0]],
      ['Formats', withOther('formats', 'formats_other')],
      ['Creative fields', withOther('fields', 'fields_other')],
      ['Why ODDfest', value('motivation') || undefined],
    ],
    [
      ['Where it is', withOther('readiness', 'readiness_other')],
      ['Already involved', value('involved') || undefined],
      ['Still needed', value('still_needed')],
    ],
    [
      ['Venue', choiceLabels('venue_status')[0]],
      ['Place or route', value('venue') || undefined],
      ['Space needed', value('space_needs') || undefined],
      ['Timing', choiceLabels('timing_flexibility')[0]],
      ['Timing notes', value('timing_notes') || undefined],
    ],
    [
      ['For', withOther('audiences', 'audiences_other')],
      ['Access', choiceLabels('access')[0]],
      ['People', value('capacity')],
    ],
    [
      ['Help', withOther('help', 'help_other')],
      ['In detail', value('help_details')],
      ['Resources', choiceLabels('financing')[0]],
    ],
    [
      ['Name', value('full_name')],
      ['Email', value('email')],
      ['Phone', value('phone')],
      ['Organisation', value('org_name')],
      ['Website', value('website')],
      ['You are', withOther('applicant_type', 'applicant_type_other')],
      ['Links', value('links') || undefined],
      ['Anything else', value('notes') || undefined],
      ['Heard via', withOther('referral', 'referral_other')],
    ],
  ];

  // Built from text nodes only, never HTML, because every value is the
  // visitor's own typing.
  const renderReview = () => {
    if (!review) return;
    const groups = summaryRows().map((rows, i) => {
      const group = document.createElement('section');
      group.className = 'cw-review-group';
      const head = document.createElement('div');
      head.className = 'cw-review-head';
      const title = document.createElement('h3');
      title.className = 'cw-review-title';
      const stepTitle = numbered[i]?.querySelector('.cw-step-head > span:last-child')?.textContent;
      title.textContent = stepTitle ?? '';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'cw-review-edit';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${stepTitle ?? 'this step'}`);
      edit.addEventListener('click', () => {
        editing = true;
        showStep(i, { back: true });
      });
      head.append(title, edit);
      const dl = document.createElement('dl');
      for (const [label, val] of rows) {
        if (!val) continue;
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = val;
        dl.append(dt, dd);
      }
      group.append(head, dl);
      return group;
    });
    review.replaceChildren(...groups);
  };

  // --- Steps --------------------------------------------------------------

  const isReview = (i: number) => steps[i]?.dataset.step === 'review';

  const primaryLabel = (i: number) => {
    if (isReview(i)) return 'Send your idea';
    if (editing) return 'Back to summary';
    if (i === numbered.length - 1) return 'Check your answers';
    return 'Next';
  };

  const showStep = (i: number, { back = false, focus = true } = {}) => {
    const target = steps[i];
    if (!target) return;
    steps.forEach((s, k) => {
      s.hidden = k !== i;
    });
    current = i;
    if (isReview(i)) {
      editing = false;
      renderReview();
    }
    target.classList.remove('is-entering', 'from-back');
    // Restart the entrance animation for this step.
    void target.offsetWidth;
    target.classList.add('is-entering');
    target.classList.toggle('from-back', back);
    target.addEventListener(
      'animationend',
      () => target.classList.remove('is-entering', 'from-back'),
      { once: true },
    );
    if (body) body.scrollTop = 0;

    const atReview = isReview(i);
    if (count)
      count.textContent = atReview ? 'Ready to send' : `Step ${i + 1} of ${numbered.length}`;
    progress.forEach((li, k) => li.classList.toggle('is-done', atReview || k <= i));
    if (backBtn) backBtn.hidden = i === 0;
    if (nextBtn) nextBtn.textContent = primaryLabel(i);
    setStatus('');
    if (focus) target.querySelector<HTMLElement>('.cw-step-head')?.focus({ preventScroll: true });
  };

  backBtn?.addEventListener('click', () => {
    if (current > 0) showStep(current - 1, { back: true });
  });

  // --- Wiring -------------------------------------------------------------

  const onEdit = () => {
    applyConditionals();
    refreshMarks();
  };
  form.addEventListener('change', onEdit);
  form.addEventListener('input', onEdit);

  const email = form.querySelector<HTMLInputElement>('input[name="email"]');
  email?.addEventListener('blur', () => {
    const v = email.value.trim();
    const wrap = wrapperFor('email');
    if (!wrap) return;
    if (v !== '' && !EMAIL_RE.test(v)) mark(wrap, 'That email address does not look right.');
    else if (!attempted) unmark(wrap);
  });

  applyConditionals();

  const showDone = (kind: 'delivered' | 'queued' | 'emailed', payload: CreativeWeekPayload) => {
    const ref = submissionId.slice(0, 8).toUpperCase();
    done?.querySelectorAll<HTMLElement>('[data-done]').forEach((el) => {
      el.hidden = el.dataset.done !== kind;
    });
    done?.querySelectorAll('[data-done-email]').forEach((el) => {
      el.textContent = payload.email;
    });
    done?.querySelectorAll('[data-done-ref]').forEach((el) => {
      el.textContent = ref;
    });
    form.hidden = true;
    if (count) count.textContent = 'Sent';
    progress.forEach((li) => li.classList.add('is-done'));
    if (done) {
      done.hidden = false;
      done.focus();
    }
    // The page says so too, under How to join.
    const sentNote = document.getElementById('cw-sent');
    sentNote?.querySelectorAll('[data-sent-ref]').forEach((el) => {
      el.textContent = ref;
    });
    if (sentNote) sentNote.hidden = false;
    updateSticky();
  };

  // Sends the whole idea. Anything missing takes the visitor to the step it
  // belongs to, with every missing answer marked.
  const send = async () => {
    attempted = true;
    const entries = byQuestion(collectErrors());
    if (entries.length > 0) {
      const first = stepIndexOf(entries[0]![0]);
      if (first !== current && first >= 0) showStep(first, { back: true, focus: false });
      showErrors(entries);
      return;
    }
    invalidWrappers().forEach(unmark);

    const payload = readPayload();
    sending = true;
    nextBtn?.setAttribute('disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending…');

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let httpStatus: number | null = null;
    let reply: unknown = null;
    try {
      const res = await fetch(`${API_BASE}/api/creative-week-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      httpStatus = res.status;
      reply = await res.json().catch(() => null);
    } catch {
      httpStatus = null;
    } finally {
      window.clearTimeout(timer);
    }

    const outcome = readOutcome(httpStatus, reply, submissionId);
    const tracked = { event_kind: payload.event_kind };

    if (outcome.kind === 'delivered' || outcome.kind === 'queued' || outcome.kind === 'emailed') {
      trackEvent('creative_week_submit', { ...tracked, outcome: outcome.kind });
      sent = true;
      showDone(outcome.kind, payload);
      return;
    }

    sending = false;
    nextBtn?.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (outcome.kind === 'invalid') {
      const refused = byQuestion(outcome.errors as Errors);
      if (refused.length > 0) {
        setStatus('');
        const first = stepIndexOf(refused[0]![0]);
        if (first !== current && first >= 0) showStep(first, { back: true, focus: false });
        showErrors(refused);
      } else {
        setStatus(
          `Something in your answers was refused. Check them, or email ${FALLBACK_EMAIL}.`,
          true,
        );
      }
      trackEvent('creative_week_error', { ...tracked, error_kind: 'invalid' });
      return;
    }
    if (outcome.kind === 'rate_limited') {
      setStatus(
        `Too many submissions from this connection just now. Wait a few minutes and try again, or email ${FALLBACK_EMAIL}.`,
        true,
      );
      trackEvent('creative_week_error', { ...tracked, error_kind: 'rate_limited' });
      return;
    }
    setStatus(
      `Your idea did not go through. Your answers are still here, so try again in a moment, or email ${FALLBACK_EMAIL}.`,
      true,
    );
    trackEvent('creative_week_error', {
      ...tracked,
      error_kind: httpStatus === null ? 'network' : 'rejected',
    });
  };

  // The one primary button is the form's submit button, so Enter in a text
  // field moves on too. On a step it means Next; on the summary, Send.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending || sent) return;
    if (isReview(current)) {
      void send();
      return;
    }
    const here = byQuestion(collectErrors()).filter(([w]) => stepIndexOf(w) === current);
    if (here.length > 0) {
      showErrors(here);
      return;
    }
    const reviewIndex = steps.findIndex((s) => s.dataset.step === 'review');
    showStep(editing ? reviewIndex : current + 1);
  });

  // --- Opening and closing ------------------------------------------------

  const html = document.documentElement;
  let returnFocus: HTMLElement | null = null;
  let opened = false;

  // The drawn cursor (Cursor.astro) would slide under the dialog, which is
  // painted in the top layer, and the native pointer is hidden site-wide.
  // While the dialog is open the cursor element lives inside it, once the
  // sheet's entrance animation has finished, and it goes back on close.
  // Same as the quote form; see booking-enquiry-form.ts for the reasoning.
  const cursorEl = document.querySelector<HTMLElement>('.cursor');
  const cursorHome = cursorEl?.parentElement ?? null;
  const cursorNext = cursorEl?.nextSibling ?? null;
  let cursorTimer = 0;
  const adoptCursor = () => {
    if (!cursorEl) return;
    const move = () => {
      window.clearTimeout(cursorTimer);
      if (dialog.open && cursorEl.parentElement !== dialog) dialog.append(cursorEl);
    };
    if (getComputedStyle(dialog).animationName === 'none') {
      move();
      return;
    }
    const onEnd = (ev: AnimationEvent) => {
      if (ev.target !== dialog) return;
      dialog.removeEventListener('animationend', onEnd);
      move();
    };
    dialog.addEventListener('animationend', onEnd);
    // In case the animation never reports its end (a hidden tab).
    cursorTimer = window.setTimeout(() => {
      dialog.removeEventListener('animationend', onEnd);
      move();
    }, 600);
  };
  const releaseCursor = () => {
    window.clearTimeout(cursorTimer);
    if (!cursorEl || !cursorHome || cursorEl.parentElement === cursorHome) return;
    cursorHome.insertBefore(
      cursorEl,
      cursorNext && cursorNext.parentNode === cursorHome ? cursorNext : null,
    );
  };

  // Every way into the form that the page itself shows: the sticky bar is
  // hidden while one of these is on screen.
  const asks = () =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="#creative-week-form"]'));

  const openDialog = (entry: string, from?: HTMLElement) => {
    if (dialog.open) return;
    // Where focus goes back to on close: the ask that was used (Safari does
    // not focus a link or button on click, so it is passed in), else what
    // had focus. Opened on arrival from a link, nothing had, so the first ask.
    const active = document.activeElement;
    returnFocus =
      from ??
      (active instanceof HTMLElement && active !== document.body ? active : (asks()[0] ?? null));
    // The URL gains the hash as its own history entry, so the back button
    // closes the dialog rather than leaving the page. Arriving with the hash
    // already set, the plain URL goes underneath it first.
    const plain = window.location.pathname + window.location.search;
    if (window.location.hash !== HASH) {
      history.pushState({ cw: true }, '', HASH);
    } else if (!(history.state as { cw?: boolean } | null)?.cw) {
      history.replaceState(null, '', plain);
      history.pushState({ cw: true }, '', HASH);
    }
    dialog.showModal();
    adoptCursor();
    html.classList.add('cw-lock');
    updateSticky();
    if (!opened) trackEvent('creative_week_open', { entry });
    opened = true;
    const focusTarget =
      done && !done.hidden ? done : steps[current]?.querySelector<HTMLElement>('.cw-step-head');
    focusTarget?.focus({ preventScroll: true });
  };

  dialog.addEventListener('close', () => {
    releaseCursor();
    html.classList.remove('cw-lock');
    // Closed by × or Esc: take the hash entry back off the history.
    if (window.location.hash === HASH) {
      if ((history.state as { cw?: boolean } | null)?.cw) history.back();
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    returnFocus?.focus({ preventScroll: true });
    updateSticky();
  });
  dialog
    .querySelectorAll<HTMLElement>('.cw-close, .cw-done-close')
    .forEach((b) => b.addEventListener('click', () => dialog.close()));

  window.addEventListener('popstate', () => {
    if (window.location.hash === HASH) openDialog('history');
    else if (dialog.open) dialog.close();
  });
  window.addEventListener('hashchange', () => {
    if (window.location.hash === HASH && !dialog.open) openDialog('link');
  });

  const stickyCta = document.querySelector<HTMLElement>('.cw-sticky-cta');
  stickyCta?.addEventListener('click', () => openDialog('sticky', stickyCta));

  // Where an ask sits on the page, for the open event's `entry`.
  const entryOf = (a: Element) =>
    a.closest('.oddfest-hero-cta')
      ? 'hero'
      : a.closest('#join')
        ? 'join'
        : a.closest('.oddf-bring')
          ? 'host'
          : 'link';

  // Every link to this page's #creative-week-form opens the dialog. One
  // listener for the whole document.
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    const a = (ev.target as Element | null)?.closest?.('a');
    if (!(a instanceof HTMLAnchorElement) || a.hash !== HASH) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || !samePath(url.pathname, window.location.pathname))
      return;
    ev.preventDefault();
    openDialog(entryOf(a), a);
  });

  // --- The sticky bar -----------------------------------------------------

  // Shown once the hero's ask has scrolled away, and only while no other
  // ask is on screen. Hidden while the dialog is open, while the cookie
  // banner is up (consent comes first, and both want the foot of the
  // screen), and after an idea is sent.
  const sticky = document.getElementById('cw-sticky');
  const bannerUp = () => document.querySelector('[data-consent-banner].is-visible') !== null;
  const modal: HTMLDialogElement = dialog;
  function updateSticky() {
    if (!sticky) return;
    const links = asks();
    const onScreen = links.some((a) => {
      const r = a.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
    });
    const pastFirst = links[0] ? links[0].getBoundingClientRect().bottom < 0 : window.scrollY > 0;
    const show = pastFirst && !onScreen && !modal.open && !bannerUp() && !sent;
    sticky.classList.toggle('is-shown', show);
  }
  let frame = 0;
  const queueSticky = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      updateSticky();
    });
  };
  window.addEventListener('scroll', queueSticky, { passive: true });
  window.addEventListener('resize', queueSticky);
  const bannerEl = document.querySelector('[data-consent-banner]');
  if (bannerEl) {
    new MutationObserver(queueSticky).observe(bannerEl, {
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
  }
  updateSticky();

  showStep(0, { focus: false });
  if (window.location.hash === HASH) openDialog('link');

  // Readiness flag so a test can wait for the handler (same convention as
  // the other forms).
  form.dataset.ready = 'true';
}

export {};
