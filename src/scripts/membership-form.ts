// Script for the ODDspace membership enquiry (MembershipForm.astro, #join on
// /oddspace/membership). It runs the three-step dialog, builds the visit-time
// picker from today's date, checks each step with the rules in
// membership-schema.ts and POSTs JSON to /api/membership-enquiry on the
// Growth OS Worker, which checks them again, writes the Notion Membership
// pipeline and posts the times to Slack for a teammate to claim
// (../odd-growth-os D34). Design: .design/membership-form.
//
// The dialog shell (open, close, history, the drawn cursor, the sticky bar)
// follows booking-enquiry-form.ts; see that file for why each part is there.
//
// Steps: 01 the visit; 02 when (a visit) or your membership (ready to join);
// 03 about you. Pressing Next checks only the step on screen. A Worker error
// on Send goes back to the earliest step that holds a field it names.
//
// Duplicates and answers are handled as on the Creative Week form: one
// submission_id per filled-in form, reused on every retry (the Worker's
// idempotency key), one request at a time, and the reply read strictly by
// readOutcome: only delivered, queued and emailed count as sent.
import { API_BASE } from './api-base';
import { turnstileHeaders } from './turnstile';
import { trackEvent } from './analytics';
import {
  MAX_CHOICES,
  dayLabel,
  helsinkiDay,
  helsinkiTime,
  offeredSlots,
  readOutcome,
  stepOf,
  validateMembership,
  type MembershipPayload,
  type SlotKind,
  type Step,
  type Visit,
} from './membership-schema';

const REQUEST_TIMEOUT_MS = 20_000;
const FALLBACK_EMAIL = 'hello@oddfest.co';
const HASHES = ['#join', '#join-visit'];
// A tap on a visit card moves on after this long, so the choice is seen.
const CARD_ADVANCE_MS = 220;

function newSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const foundDialog = document.getElementById('msf-dialog') as HTMLDialogElement | null;
const foundForm = document.getElementById('membershipForm') as HTMLFormElement | null;

if (foundDialog && foundForm) {
  const dialog: HTMLDialogElement = foundDialog;
  const form: HTMLFormElement = foundForm;
  const html = document.documentElement;
  const $ = <T extends HTMLElement>(sel: string, root: ParentNode = dialog) =>
    root.querySelector<T>(sel);
  const byId = (id: string) => document.getElementById(id)!;

  const body = byId('msf-body');
  const count = byId('msf-count');
  const progress = [...dialog.querySelectorAll<HTMLElement>('.msf-progress li')];
  const backBtn = $<HTMLButtonElement>('.msf-back')!;
  const nextBtn = $<HTMLButtonElement>('.msf-next')!;
  const status = byId('msf-status');
  const done = byId('msf-done');
  const daysEl = byId('msf-days');
  const slotsEl = byId('msf-slots');
  const picksEl = byId('msf-picks');
  const timesTitle = byId('msf-times-title');
  const timesLegend = byId('msf-times-legend');
  const timesHint = byId('msf-times-hint');
  const teamSize = $<HTMLElement>('[data-field="team_size"]')!;
  const opener = byId('msf-opener');
  const sentNote = byId('msf-sent');
  const sections = {
    visit: $<HTMLElement>('[data-step="visit"]')!,
    times: $<HTMLElement>('[data-step="times"]')!,
    membership: $<HTMLElement>('[data-step="membership"]')!,
    about: $<HTMLElement>('[data-step="about"]')!,
  };

  let submissionId = newSubmissionId();
  let sending = false;
  let sent = false;
  let started = false;
  let opened = false;
  let visit: Visit | '' = '';
  let activeDay = '';
  let current = 0;
  const picks = new Set<string>();

  const radioValue = (name: string) =>
    form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const checked = (name: string) =>
    form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.checked === true;
  const text = (name: string) =>
    (
      form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${name}"]`,
      )?.value ?? ''
    ).trim();

  function setStatus(msg: string, error = false) {
    status.textContent = msg;
    if (error) status.setAttribute('data-error', '');
    else status.removeAttribute('data-error');
  }

  // ---------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------

  /** The three steps of the current path. */
  const order = (): HTMLElement[] => [
    sections.visit,
    visit === 'ready' ? sections.membership : sections.times,
    sections.about,
  ];
  const STEP_KEYS: Step[] = ['visit', 'second', 'about'];

  function showStep(i: number, { back = false, focus = true } = {}) {
    const steps = order();
    const target = steps[i];
    if (!target) return;
    Object.values(sections).forEach((s) => (s.hidden = s !== target));
    current = i;
    target.classList.remove('is-entering', 'from-back');
    void target.offsetWidth; // restart the entrance animation
    target.classList.add('is-entering');
    target.classList.toggle('from-back', back);
    target.addEventListener(
      'animationend',
      () => target.classList.remove('is-entering', 'from-back'),
      { once: true },
    );
    body.scrollTop = 0;
    count.textContent = `Step ${i + 1} of ${steps.length}`;
    progress.forEach((li, k) => li.classList.toggle('is-done', k <= i));
    backBtn.hidden = i === 0;
    nextBtn.textContent = i === steps.length - 1 ? 'Send' : 'Next';
    setStatus('');
    if (focus) target.querySelector<HTMLElement>('.msf-step-head')?.focus({ preventScroll: true });
    if (opened) trackEvent('membership_step', { step: i + 1, visit: visit || 'none' });
  }

  backBtn.addEventListener('click', () => {
    if (current > 0) showStep(current - 1, { back: true });
  });

  // ---------------------------------------------------------------------
  // Which fields this path asks
  // ---------------------------------------------------------------------

  // `data-paths` lists the visits a field (or a bit of a label) belongs to.
  // Off its paths it is hidden and its inputs disabled, so it is neither
  // checked nor sent.
  function applyPaths() {
    dialog.querySelectorAll<HTMLElement>('[data-paths]').forEach((el) => {
      const on = !!visit && (el.dataset.paths ?? '').split(' ').includes(visit);
      el.hidden = !on;
      el.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select').forEach(
        (i) => (i.disabled = !on),
      );
    });
  }

  // ---------------------------------------------------------------------
  // The time picker
  // ---------------------------------------------------------------------

  const slotButton = (label: string, pressed: boolean, extra: Record<string, string> = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msf-slot';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(pressed));
    for (const [k, v] of Object.entries(extra)) b.dataset[k] = v;
    return b;
  };

  const pickLabel = (t: string) =>
    visit === 'viewing' ? `${dayLabel(t)}, ${helsinkiTime(new Date(t))}` : dayLabel(t);

  function renderPicks() {
    const list = [...picks].sort();
    picksEl.replaceChildren();
    if (list.length > 0) {
      const label = document.createElement('p');
      label.className = 'msf-picks-label';
      label.textContent = `Your picks (${list.length} of ${MAX_CHOICES})`;
      picksEl.append(label);
      for (const t of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'msf-pick';
        b.dataset.slot = t;
        b.setAttribute('aria-label', `Remove ${pickLabel(t)}`);
        const name = document.createElement('span');
        name.textContent = pickLabel(t);
        const x = document.createElement('span');
        x.className = 'msf-pick-x';
        x.setAttribute('aria-hidden', 'true');
        x.textContent = '×';
        b.append(name, x);
        picksEl.append(b);
      }
    }
    const full = picks.size >= MAX_CHOICES;
    slotsEl.querySelectorAll<HTMLButtonElement>('.msf-slot').forEach((b) => {
      const on = picks.has(b.dataset.slot ?? '');
      b.setAttribute('aria-pressed', String(on));
      b.disabled = full && !on;
    });
    daysEl.querySelectorAll<HTMLButtonElement>('.msf-day').forEach((b) => {
      const has = list.some((p) => helsinkiDay(new Date(p)) === b.dataset.day);
      b.classList.toggle('has-pick', has);
      b.setAttribute('aria-pressed', String(has));
    });
  }

  function renderSlots() {
    daysEl.replaceChildren();
    slotsEl.replaceChildren();
    daysEl.hidden = visit !== 'viewing';
    if (!visit || visit === 'ready') return;
    const all = offeredSlots(visit, new Date());
    if (visit === 'viewing') {
      const days = [...new Set(all.map((s) => helsinkiDay(new Date(s))))];
      if (!days.includes(activeDay)) activeDay = days[0] ?? '';
      for (const day of days) {
        const first = all.find((s) => helsinkiDay(new Date(s)) === day)!;
        const b = slotButton(dayLabel(first), false, { day });
        b.classList.add('msf-day');
        b.setAttribute('aria-current', String(day === activeDay));
        b.addEventListener('click', () => {
          activeDay = day;
          renderSlots();
        });
        daysEl.append(b);
      }
      for (const s of all.filter((x) => helsinkiDay(new Date(x)) === activeDay)) {
        slotsEl.append(slotButton(helsinkiTime(new Date(s)), picks.has(s), { slot: s }));
      }
    } else {
      for (const s of all) slotsEl.append(slotButton(dayLabel(s), picks.has(s), { slot: s }));
    }
    renderPicks();
  }

  slotsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.msf-slot');
    const slot = b?.dataset.slot;
    if (!b || !slot || b.disabled) return;
    if (picks.has(slot)) picks.delete(slot);
    else if (picks.size < MAX_CHOICES) picks.add(slot);
    clearError('times');
    renderPicks();
  });
  picksEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.msf-pick');
    if (!b?.dataset.slot) return;
    picks.delete(b.dataset.slot);
    renderPicks();
    // Focus would be lost with the removed chip: keep it in the picker.
    (picksEl.querySelector<HTMLElement>('.msf-pick') ?? body).focus?.();
  });

  const COPY: Record<SlotKind, { title: string; legend: string; hint: string }> = {
    viewing: {
      title: 'When suits you?',
      legend: 'Pick up to three times',
      hint: 'Pick up to three. Helsinki time. Someone from the team takes one of them and confirms it by email.',
    },
    coffee: {
      title: 'Which Mondays could you come?',
      legend: 'Pick up to three Mondays',
      hint: "Coffee runs 09:00–10:00. Now and then it pops up at another Helsinki space; if your Monday is one of those, we'll tell you and suggest another.",
    },
    trial_day: {
      title: 'Which days could you come?',
      legend: 'Pick up to three days',
      hint: 'Pick up to three. Someone from the team takes one, meets you at 10:00 and lets you in.',
    },
  };

  function onVisit(next: Visit) {
    if (next === visit) return;
    picks.clear();
    visit = next;
    clearError('visit');
    if (visit !== 'ready') {
      timesTitle.textContent = COPY[visit].title;
      timesLegend.textContent = COPY[visit].legend;
      timesHint.textContent = COPY[visit].hint;
    }
    applyPaths();
    renderSlots();
  }

  let advanceTimer = 0;
  form.querySelectorAll<HTMLInputElement>('input[name="visit"]').forEach((r) => {
    r.addEventListener('change', () => onVisit(r.value as Visit));
    // A tap (not an arrow key moving through the group) moves on.
    r.addEventListener('click', (e) => {
      if ((e as PointerEvent).detail === 0) return;
      window.clearTimeout(advanceTimer);
      advanceTimer = window.setTimeout(() => {
        if (current === 0 && dialog.open) showStep(1);
      }, CARD_ADVANCE_MS);
    });
  });

  const teamTick = $<HTMLInputElement>('#msf-team')!;
  teamTick.addEventListener('change', () => {
    teamSize.hidden = !teamTick.checked;
    if (!teamTick.checked) clearError('team_size');
  });

  // ---------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------

  function clearError(field: string) {
    const el = document.getElementById(`msf-err-${field}`);
    if (el) {
      el.hidden = true;
      el.textContent = '';
    }
    dialog.querySelector(`[data-field="${field}"]`)?.classList.remove('is-invalid');
  }
  /** Clear a step's marks before it is checked again: autofill changes a
   *  field without an input event, so a stale error could otherwise stay. */
  function clearStepErrors(step: HTMLElement) {
    step.querySelectorAll<HTMLElement>('[data-field]').forEach((f) => {
      if (f.dataset.field) clearError(f.dataset.field);
    });
  }
  function showErrors(errors: Record<string, string>) {
    let first: HTMLElement | null = null;
    for (const [field, msg] of Object.entries(errors)) {
      const el = document.getElementById(`msf-err-${field}`);
      const wrap = dialog.querySelector<HTMLElement>(`[data-field="${field}"]`);
      if (el) {
        el.textContent = msg;
        el.hidden = false;
      }
      wrap?.classList.add('is-invalid');
      if (!first && wrap && !wrap.hidden) first = wrap;
    }
    if (first) {
      first.scrollIntoView({ block: 'center' });
      first
        .querySelector<HTMLElement>('input:not([disabled]), select, textarea, button')
        ?.focus({ preventScroll: true });
    }
  }
  form.addEventListener('input', (e) => {
    const name = (e.target as HTMLInputElement).name;
    if (name) clearError(name);
    if (!started) {
      started = true;
      trackEvent('membership_form_start');
    }
  });

  /** This step's own errors, from the same rules the whole form is sent by. */
  function stepErrors(i: number): Record<string, string> {
    const all = validateMembership(readPayload());
    const key = STEP_KEYS[i];
    return Object.fromEntries(Object.entries(all).filter(([f]) => stepOf(f) === key));
  }

  // ---------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------

  function readPayload(): MembershipPayload {
    const joining = visit === 'ready';
    const size = Number.parseInt(text('team_size'), 10);
    const phone = visit === 'coffee' ? '' : text('phone');
    return {
      submission_id: submissionId,
      locale: 'en',
      source: window.location.pathname,
      hp_field: text('hp_field'),
      name: text('name'),
      email: text('email'),
      ...(phone ? { phone } : {}),
      works_on: text('works_on'),
      link: text('link'),
      visit: radioValue('visit') as Visit,
      times: visit && !joining ? [...picks].sort() : [],
      ...(joining
        ? {
            start: radioValue('start'),
            use: radioValue('use'),
            team: checked('team'),
            ...(checked('team') ? { team_size: Number.isNaN(size) ? 0 : size } : {}),
            studio: checked('studio'),
            ...(text('heard') ? { heard: text('heard') } : {}),
          }
        : {}),
      ...(text('notes') ? { notes: text('notes') } : {}),
      newsletter: checked('newsletter'),
      consent_privacy: checked('consent_privacy'),
    };
  }

  const DONE: Record<Visit, string> = {
    viewing:
      'Someone from the team will take one of your times and confirm it by email, usually within one working day.',
    coffee:
      'Someone from the team will confirm which Monday by email, look out for you at coffee and show you round.',
    trial_day:
      'Someone from the team will confirm one of your days by email, then meet you at 10:00 to let you in.',
    ready:
      'Someone from the team will email you within one working day about a start date and the next steps.',
  };

  function showDone(p: MembershipPayload) {
    const ref = submissionId.slice(0, 8).toUpperCase();
    form.hidden = true;
    byId('msf-done-title').textContent = `Thanks, ${p.name.split(/\s+/)[0]}.`;
    byId('msf-done-body').textContent = DONE[p.visit];
    byId('msf-done-ref').textContent =
      `Your reference: ${ref}. If anything changes, email ${FALLBACK_EMAIL}.`;
    count.textContent = 'Sent';
    progress.forEach((li) => li.classList.add('is-done'));
    done.hidden = false;
    done.focus();
    // The page's own ask becomes the confirmation.
    sent = true;
    opener.hidden = true;
    sentNote.querySelector('[data-sent-ref]')!.textContent = ref;
    sentNote.hidden = false;
    updateSticky();
  }

  async function send() {
    if (sending) return;
    const payload = readPayload();
    const errors = validateMembership(payload);
    if (Object.keys(errors).length > 0) {
      goToErrors(errors);
      return;
    }

    sending = true;
    nextBtn.setAttribute('disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending…');

    const verification = await turnstileHeaders(form);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let httpStatus: number | null = null;
    let reply: unknown = null;
    try {
      const res = await fetch(`${API_BASE}/api/membership-enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...verification },
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
    const tracked = { visit: payload.visit };

    if (outcome.kind === 'delivered' || outcome.kind === 'queued' || outcome.kind === 'emailed') {
      trackEvent('membership_submit', {
        ...tracked,
        outcome: outcome.kind,
        times: payload.times.length,
      });
      showDone(payload);
      return;
    }

    sending = false;
    nextBtn.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (outcome.kind === 'invalid') {
      setStatus('');
      if (outcome.errors.times) {
        // A time went while they were filling in: show the picker afresh.
        picks.clear();
        renderSlots();
      }
      goToErrors(outcome.errors);
      trackEvent('membership_submit_error', {
        ...tracked,
        error_kind: 'invalid',
        fields: Object.keys(outcome.errors).join(','),
      });
      return;
    }
    // The Worker's own words when it refuses a request it could not confirm
    // came from a person (Turnstile), so the visitor knows what to try.
    const message =
      httpStatus === 403 && reply && typeof (reply as { message?: unknown }).message === 'string'
        ? (reply as { message: string }).message
        : '';
    if (message) {
      setStatus(message, true);
    } else if (outcome.kind === 'rate_limited') {
      setStatus(
        `Too many tries from this connection just now. Wait a few minutes, or email ${FALLBACK_EMAIL}.`,
        true,
      );
    } else if (outcome.kind === 'conflict') {
      const ref = submissionId.slice(0, 8).toUpperCase();
      submissionId = newSubmissionId();
      setStatus(
        `We already have an earlier version of this request (reference ${ref}). Press Send to send this one as well, or email ${FALLBACK_EMAIL} what changed.`,
        true,
      );
    } else {
      setStatus(
        `Something went wrong and this may not have reached us. Your answers are still here: try again, or email ${FALLBACK_EMAIL}.`,
        true,
      );
    }
    trackEvent('membership_submit_error', {
      ...tracked,
      error_kind: message ? 'verification' : outcome.kind,
    });
  }

  /** Show errors on the earliest step that holds one of them. */
  function goToErrors(errors: Record<string, string>) {
    const i = Math.min(...Object.keys(errors).map((f) => STEP_KEYS.indexOf(stepOf(f))));
    if (Number.isFinite(i) && i !== current) showStep(i, { back: i < current, focus: false });
    showErrors(errors);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const last = order().length - 1;
    clearStepErrors(order()[current]!);
    const errors = stepErrors(current);
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }
    if (current < last) showStep(current + 1);
    else void send();
  });

  // ---------------------------------------------------------------------
  // The dialog
  // ---------------------------------------------------------------------

  let returnFocus: HTMLElement | null = null;

  // The site's drawn cursor would sit under the top-layer dialog; it lives
  // inside the dialog while it is open (booking-enquiry-form.ts explains).
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

  const ourState = () => (history.state as { msf?: boolean } | null)?.msf === true;

  function openDialog(entry: string, hash: string) {
    // "Come and see it first": a look round, straight to the times.
    const toVisit = hash === '#join-visit' && !sent;
    if (toVisit && !visit) {
      const viewing = form.querySelector<HTMLInputElement>('#msf-visit-viewing');
      if (viewing) viewing.checked = true;
      onVisit('viewing');
    }
    if (dialog.open) return;
    const active = document.activeElement;
    returnFocus =
      active instanceof HTMLElement && active !== document.body
        ? active
        : sent
          ? sentNote
          : document.getElementById('msf-open');
    // Its own history entry, so the back button closes it rather than
    // leaving the page. Arriving with the hash set, the plain URL goes under.
    const plain = window.location.pathname + window.location.search;
    if (!HASHES.includes(window.location.hash)) {
      history.pushState({ msf: true }, '', hash);
    } else if (!ourState()) {
      history.replaceState(null, '', plain);
      history.pushState({ msf: true }, '', hash);
    }
    dialog.showModal();
    adoptCursor();
    html.classList.add('msf-lock');
    updateSticky();
    if (!opened) trackEvent('membership_form_open', { entry });
    opened = true;
    if (!sent) showStep(toVisit && current === 0 ? 1 : current, { focus: false });
    const focusTarget = sent
      ? done
      : order()[current]?.querySelector<HTMLElement>('.msf-step-head');
    focusTarget?.focus({ preventScroll: true });
  }

  dialog.addEventListener('close', () => {
    releaseCursor();
    html.classList.remove('msf-lock');
    if (HASHES.includes(window.location.hash)) {
      if (ourState()) history.back();
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    returnFocus?.focus({ preventScroll: true });
    updateSticky();
  });
  dialog
    .querySelectorAll<HTMLElement>('.msf-close, .msf-done-close')
    .forEach((b) => b.addEventListener('click', () => dialog.close()));

  window.addEventListener('popstate', () => {
    if (HASHES.includes(window.location.hash)) openDialog('history', window.location.hash);
    else if (dialog.open) dialog.close();
  });
  window.addEventListener('hashchange', () => {
    if (HASHES.includes(window.location.hash) && !dialog.open)
      openDialog('link', window.location.hash);
  });

  // Every link on this page to #join or #join-visit opens the dialog.
  const heroCta = document.querySelector<HTMLAnchorElement>('a[href="#join"]');
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    const a = (ev.target as Element | null)?.closest?.('a');
    if (!(a instanceof HTMLAnchorElement) || !HASHES.includes(a.hash)) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    ev.preventDefault();
    const location =
      a.closest('[data-cta-location]')?.getAttribute('data-cta-location') ??
      a.closest('section')?.className.split(' ')[0] ??
      'page';
    openDialog(a === heroCta ? 'hero' : location, a.hash);
  });
  const openBtn = document.getElementById('msf-open') as HTMLButtonElement | null;
  openBtn?.addEventListener('click', () => openDialog('final', '#join'));
  document
    .querySelector('.msf-sticky-cta')
    ?.addEventListener('click', () => openDialog('sticky', '#join'));

  // ---------------------------------------------------------------------
  // The sticky bar (phones; CSS hides it from 720px)
  // ---------------------------------------------------------------------

  // Shown once the hero's ask has scrolled away and until this section
  // comes into view. Hidden while the dialog is open, while the cookie
  // banner is up (consent comes first), and once a request is sent.
  const sticky = document.getElementById('msf-sticky');
  const section = document.getElementById('join');
  const bannerUp = () => document.querySelector('[data-consent-banner].is-visible') !== null;
  function updateSticky() {
    if (!sticky) return;
    const heroGone = heroCta
      ? heroCta.getBoundingClientRect().bottom < 0
      : window.scrollY > window.innerHeight;
    const sectionNear = section ? section.getBoundingClientRect().top < window.innerHeight : false;
    sticky.classList.toggle(
      'is-shown',
      heroGone && !sectionNear && !dialog.open && !bannerUp() && !sent,
    );
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

  applyPaths();
  showStep(0, { focus: false });
  if (HASHES.includes(window.location.hash)) openDialog('link', window.location.hash);

  openBtn?.removeAttribute('disabled');
  // Readiness flag so a test can wait for the handlers.
  form.dataset.ready = 'true';
}

export {};
