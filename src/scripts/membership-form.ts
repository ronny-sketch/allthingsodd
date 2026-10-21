// Script for the ODDspace membership form (MembershipForm.astro, #join on
// /oddspace/membership). It builds the visit-time picker from today's date,
// checks the answers with the rules in membership-schema.ts and POSTs JSON to
// /api/membership-enquiry on the Growth OS Worker, which checks them again,
// writes the Notion Membership pipeline and posts the times to Slack for a
// teammate to claim (../odd-growth-os D34).
//
// The picker. A viewing has 14 half-hour times a day over two weeks, too many
// to show at once, so a viewing shows the days first and the times of one day
// at a time; the picks (up to three) are kept across days and listed below.
// Coffee and trial days have one time a day, so their days are the choices.
//
// Duplicates and answers are handled as on the Creative Week form: one
// submission_id per filled-in form, reused on every retry (the Worker's
// idempotency key), one request at a time, and the reply read strictly by
// readOutcome: only delivered, queued and emailed count as sent.
//
// "#join-visit" (the page's "Come and see it first") scrolls here with a
// viewing already chosen.
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
  validateMembership,
  type MembershipPayload,
  type SlotKind,
  type Visit,
} from './membership-schema';

const REQUEST_TIMEOUT_MS = 20_000;
const FALLBACK_EMAIL = 'hello@oddfest.co';

function newSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const found = document.getElementById('membershipForm') as HTMLFormElement | null;

if (found) {
  const form: HTMLFormElement = found;
  const $ = <T extends HTMLElement>(sel: string) => form.querySelector<T>(sel);
  const timesBox = $<HTMLFieldSetElement>('.msf-times')!;
  const daysEl = document.getElementById('msf-days')!;
  const slotsEl = document.getElementById('msf-slots')!;
  const picksEl = document.getElementById('msf-picks')!;
  const legend = document.getElementById('msf-times-legend')!;
  const hint = document.getElementById('msf-times-hint')!;
  const teamBox = $<HTMLElement>('.msf-team-size')!;
  const status = document.getElementById('msf-status')!;
  const submitBtn = $<HTMLButtonElement>('button[type="submit"]');
  const done = document.getElementById('msf-done')!;

  let submissionId = newSubmissionId();
  let sending = false;
  let started = false;
  let visit: Visit | '' = '';
  let activeDay = '';
  const picks = new Set<string>();

  const radioValue = (name: string) =>
    (form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '') as string;
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

  function renderPicks() {
    const kind = visit as SlotKind;
    const list = [...picks].sort();
    picksEl.textContent =
      list.length === 0
        ? ''
        : `Your picks (${list.length} of ${MAX_CHOICES}): ${list
            .map((t) =>
              kind === 'viewing' ? `${dayLabel(t)}, ${helsinkiTime(new Date(t))}` : dayLabel(t),
            )
            .join(' · ')}`;
    const full = picks.size >= MAX_CHOICES;
    slotsEl.querySelectorAll<HTMLButtonElement>('.msf-slot').forEach((b) => {
      const on = picks.has(b.dataset.slot ?? '');
      b.setAttribute('aria-pressed', String(on));
      b.disabled = full && !on;
    });
  }

  function renderSlots() {
    daysEl.replaceChildren();
    slotsEl.replaceChildren();
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
        b.setAttribute(
          'aria-pressed',
          String([...picks].some((p) => helsinkiDay(new Date(p)) === day)),
        );
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
    if (visit === 'viewing') renderSlots();
    else renderPicks();
  });

  const COPY: Record<SlotKind, { legend: string; hint: string }> = {
    viewing: {
      legend: 'Pick up to three times that suit you',
      hint: 'A look round takes about 30 minutes. Someone from the team takes one of your times and confirms it by email.',
    },
    coffee: {
      legend: 'Which Mondays could you come?',
      hint: 'Coffee on the House: free coffee and a DJ, 09:00–10:00. Someone from the team looks out for you and shows you round.',
    },
    trial_day: {
      legend: 'Pick up to three days',
      hint: 'A free working day. Someone from the team meets you at 10:00, lets you in and shows you round.',
    },
  };

  function onVisit(next: Visit) {
    if (next !== visit) picks.clear();
    visit = next;
    timesBox.hidden = visit === 'ready' || !visit;
    if (visit && visit !== 'ready') {
      legend.textContent = COPY[visit].legend;
      hint.textContent = COPY[visit].hint;
    }
    renderSlots();
  }
  form
    .querySelectorAll<HTMLInputElement>('input[name="visit"]')
    .forEach((r) => r.addEventListener('change', () => onVisit(r.value as Visit)));

  const teamTick = $<HTMLInputElement>('#msf-team')!;
  teamTick.addEventListener('change', () => {
    teamBox.hidden = !teamTick.checked;
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
    form.querySelector(`[data-field="${field}"]`)?.removeAttribute('data-invalid');
  }
  function showErrors(errors: Record<string, string>) {
    let first: HTMLElement | null = null;
    for (const [field, msg] of Object.entries(errors)) {
      const el = document.getElementById(`msf-err-${field}`);
      const wrap = form.querySelector<HTMLElement>(`[data-field="${field}"]`);
      if (el) {
        el.textContent = msg;
        el.hidden = false;
      }
      wrap?.setAttribute('data-invalid', '');
      if (!first && wrap) first = wrap;
    }
    if (first) {
      first.scrollIntoView({ block: 'center' });
      first
        .querySelector<HTMLElement>('input, select, textarea, button')
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

  // ---------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------

  function readPayload(): MembershipPayload {
    const size = Number.parseInt(text('team_size'), 10);
    return {
      submission_id: submissionId,
      locale: 'en',
      source: window.location.pathname,
      hp_field: text('hp_field'),
      name: text('name'),
      email: text('email'),
      ...(text('phone') ? { phone: text('phone') } : {}),
      works_on: text('works_on'),
      ...(text('link') ? { link: text('link') } : {}),
      use: radioValue('use'),
      team: checked('team'),
      ...(checked('team') ? { team_size: Number.isNaN(size) ? 0 : size } : {}),
      studio: checked('studio'),
      start: radioValue('start'),
      visit: radioValue('visit') as Visit,
      times: visit && visit !== 'ready' ? [...picks].sort() : [],
      ...(text('heard') ? { heard: text('heard') } : {}),
      ...(text('notes') ? { notes: text('notes') } : {}),
      newsletter: checked('newsletter'),
      consent_privacy: checked('consent_privacy'),
    };
  }

  const DONE: Record<Visit, string> = {
    viewing:
      'Someone from the team will take one of your times and confirm it by email, usually within one working day.',
    coffee:
      'Someone from the team will confirm which Monday by email, look out for you at coffee, and show you round.',
    trial_day:
      'Someone from the team will confirm one of your days by email, then meet you at 10:00 to let you in.',
    ready:
      'Someone from the team will email you within one working day about a start date and the next steps.',
  };

  function showDone(p: MembershipPayload) {
    form.hidden = true;
    document.getElementById('msf-done-title')!.textContent = `Thanks, ${p.name.split(/\s+/)[0]}.`;
    document.getElementById('msf-done-body')!.textContent = DONE[p.visit];
    document.getElementById('msf-done-ref')!.textContent =
      `Your reference: ${submissionId.slice(0, 8).toUpperCase()}. If anything changes, email ${FALLBACK_EMAIL}.`;
    done.hidden = false;
    done.focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const payload = readPayload();
    const errors = validateMembership(payload);
    if (Object.keys(errors).length > 0) {
      setStatus('');
      showErrors(errors);
      return;
    }

    sending = true;
    submitBtn?.setAttribute('disabled', 'true');
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
    const tracked = {
      visit: payload.visit,
      use: payload.use,
      start: payload.start,
      team: payload.team,
      studio: payload.studio,
    };

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
    submitBtn?.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (outcome.kind === 'invalid') {
      setStatus('');
      if (outcome.errors.times) {
        // A time went while they were filling in: show the picker afresh.
        picks.clear();
        renderSlots();
      }
      showErrors(outcome.errors);
      trackEvent('membership_submit_error', {
        ...tracked,
        error_kind: 'invalid',
        fields: Object.keys(outcome.errors).join(','),
      });
      return;
    }
    if (outcome.kind === 'rate_limited') {
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
    trackEvent('membership_submit_error', { ...tracked, error_kind: outcome.kind });
  });

  // ---------------------------------------------------------------------
  // Arriving
  // ---------------------------------------------------------------------

  function arrive() {
    if (window.location.hash === '#join-visit') {
      const viewing = form.querySelector<HTMLInputElement>('input[name="visit"][value="viewing"]');
      if (viewing && !radioValue('visit')) {
        viewing.checked = true;
        onVisit('viewing');
      }
      document.getElementById('join')?.scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', arrive);
  arrive();

  // Which button brought them here, for the funnel.
  document
    .querySelectorAll<HTMLAnchorElement>('a[href="#join"], a[href="#join-visit"]')
    .forEach((a) =>
      a.addEventListener('click', () =>
        trackEvent('membership_cta_click', {
          location:
            a.closest('[data-cta-location]')?.getAttribute('data-cta-location') ??
            a.closest('section')?.className.split(' ')[0] ??
            'page',
          visit: a.getAttribute('href') === '#join-visit' ? 'viewing' : 'any',
        }),
      ),
    );

  submitBtn?.removeAttribute('disabled');
  form.dataset.ready = 'true';
}

export {};
