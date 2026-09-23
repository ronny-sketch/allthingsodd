// Submit script for the ODDspace booking enquiry form (BookingEnquiryForm.astro).
// It shows and hides conditional fields, validates with the shared rules in
// booking-enquiry-schema.ts, and POSTs JSON to /api/booking-enquiry on the
// Growth OS Worker (see api-base.ts for why that is a cross-origin URL). No
// key or vendor SDK is involved. The Worker holds the Notion token and the
// Make webhook, and it validates everything again.
//
// Duplicate protection works in two layers. First, a single in-flight guard
// with the button disabled, so a double click sends one request. Second,
// one `submission_id` per filled-in form, generated once and reused on every
// retry. The Worker treats that id as an idempotency key, so a retry after a
// timeout that actually reached Notion does not create a second record.
import { API_BASE } from './api-base';
import { captureFirstTouch } from './utm';
import { trackEvent } from './analytics';
import {
  validateBooking,
  shortNoticeWarning,
  helsinkiLocalToISO,
  type BookingPayload,
  type FieldErrors,
} from './booking-enquiry-schema';

const REQUEST_TIMEOUT_MS = 20_000;

// What the Worker answers with. `errors` carries field-level messages on a 400.
interface ResponseBody {
  ok?: boolean;
  message?: string;
  submission_id?: string;
  errors?: FieldErrors;
}
const FALLBACK_EMAIL = 'hello@oddfest.co';

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

const form = document.getElementById('bookingEnquiryForm');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status');
  const summary = form.querySelector<HTMLElement>('#bk-summary');
  const notice = form.querySelector<HTMLElement>('#bk-notice');
  const done = document.getElementById('bk-done');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submissionId = newSubmissionId();
  let sending = false;

  // --- Conditional fields -------------------------------------------------

  const conditionals = Array.from(form.querySelectorAll<HTMLElement>('[data-show-when]'));

  // The current value(s) of a field, however it is rendered: a radio group
  // gives its checked value, a lone checkbox gives "true" when ticked, and a
  // checkbox group gives every ticked value.
  const valuesOf = (name: string): string[] => {
    const controls = Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`));
    if (controls.length === 0) return [];
    const first = controls[0]!;
    if (first.type === 'radio' || first.type === 'checkbox') {
      return controls.filter((c) => c.checked && !c.disabled).map((c) => c.value);
    }
    return first.disabled ? [] : [first.value];
  };

  const applyConditionals = () => {
    // Run twice, so a field whose trigger was itself just hidden (none today,
    // but cheap insurance) settles in the same pass.
    for (let pass = 0; pass < 2; pass++) {
      for (const el of conditionals) {
        const [name, wanted] = (el.dataset.showWhen ?? '').split('=');
        if (!name || !wanted) continue;
        const current = valuesOf(name);
        const show = wanted.split('|').some((v) => current.includes(v));
        el.hidden = !show;
        el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input, select, textarea',
        ).forEach((c) => {
          c.disabled = !show;
        });
      }
    }
  };

  // --- Reading the form ---------------------------------------------------

  const str = (fd: FormData, k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const opt = (fd: FormData, k: string) => str(fd, k) || undefined;
  const int = (fd: FormData, k: string) => {
    const v = str(fd, k);
    return v === '' ? undefined : Number(v);
  };
  const bool = (fd: FormData, k: string) => str(fd, k) === 'true';

  const sourceOf = () => {
    const touch = captureFirstTouch();
    const utm = [
      touch.utm_source && `utm_source=${touch.utm_source}`,
      touch.utm_medium && `utm_medium=${touch.utm_medium}`,
      touch.utm_campaign && `utm_campaign=${touch.utm_campaign}`,
    ].filter(Boolean);
    return [window.location.pathname, ...utm].join(' · ').slice(0, 200);
  };

  const readPayload = (): BookingPayload => {
    const fd = new FormData(form);
    const memberRaw = str(fd, 'is_member');
    const localIn = str(fd, 'get_in');
    const localOut = str(fd, 'get_out');
    return {
      submission_id: submissionId,
      submitted_at: new Date().toISOString(),
      locale: document.documentElement.lang.toLowerCase().startsWith('fi') ? 'fi' : 'en',
      source: sourceOf(),
      hp_field: str(fd, 'hp_field'),

      contact_first_name: str(fd, 'contact_first_name'),
      contact_last_name: str(fd, 'contact_last_name'),
      contact_email: str(fd, 'contact_email'),
      contact_phone: opt(fd, 'contact_phone'),
      org_name: opt(fd, 'org_name'),
      org_type: str(fd, 'org_type'),
      // Left unset (not false) when neither radio is picked, so the rule
      // "tell us whether you are a member" can fire.
      is_member: (memberRaw === '' ? undefined : memberRaw === 'true') as boolean,
      membership_tier: opt(fd, 'membership_tier'),
      consent_privacy: bool(fd, 'consent_privacy'),

      event_title: str(fd, 'event_title'),
      event_description: str(fd, 'event_description'),
      event_type: str(fd, 'event_type'),
      event_visibility: str(fd, 'event_visibility'),
      event_access: str(fd, 'event_access'),
      get_in: (localIn && helsinkiLocalToISO(localIn)) || '',
      get_out: (localOut && helsinkiLocalToISO(localOut)) || '',
      alt_date_1: opt(fd, 'alt_date_1'),
      alt_date_2: opt(fd, 'alt_date_2'),
      headcount_band: str(fd, 'headcount_band'),
      headcount_estimate: int(fd, 'headcount_estimate'),
      is_series: bool(fd, 'is_series'),
      series_count: int(fd, 'series_count'),

      space: str(fd, 'space'),
      layout: str(fd, 'layout'),
      layout_custom: opt(fd, 'layout_custom'),
      support_level: str(fd, 'support_level'),
      tech: fd.getAll('tech').map(String),
      mic_count: int(fd, 'mic_count'),
      own_equipment: bool(fd, 'own_equipment'),
      own_equipment_detail: opt(fd, 'own_equipment_detail'),

      catering: str(fd, 'catering'),
      caterer_name: opt(fd, 'caterer_name'),
      alcohol: str(fd, 'alcohol'),
      music: str(fd, 'music'),
      music_past_2200: opt(fd, 'music_past_2200'),
      pyro_flame: str(fd, 'pyro_flame'),
      pyro_flame_detail: opt(fd, 'pyro_flame_detail'),
      media: fd.getAll('media').map(String),

      cleaning: str(fd, 'cleaning'),
      accessibility_notes: opt(fd, 'accessibility_notes'),
      budget_band: str(fd, 'budget_band'),
      referral_source: opt(fd, 'referral_source'),
      notes: opt(fd, 'notes'),
    };
  };

  // --- Errors -------------------------------------------------------------

  const fieldFor = (name: string) => {
    const control = form.querySelector<HTMLElement>(`[name="${name}"]`);
    const wrap = control?.closest<HTMLElement>('.field');
    const err = wrap?.querySelector<HTMLElement>(':scope > .field-error');
    return { control, wrap, err };
  };

  const clearErrors = () => {
    form.querySelectorAll<HTMLElement>('.field-error').forEach((p) => {
      p.textContent = '';
      p.hidden = true;
    });
    form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
    if (summary) summary.hidden = true;
  };

  const showErrors = (errors: FieldErrors) => {
    clearErrors();
    const list = summary?.querySelector('ul');
    if (list) list.replaceChildren();
    let firstControl: HTMLElement | null = null;
    for (const [name, message] of Object.entries(errors)) {
      if (!message) continue;
      const { control, err } = fieldFor(name);
      if (!control || !err) continue;
      err.textContent = message;
      err.hidden = false;
      form.querySelectorAll(`[name="${name}"]`).forEach((c) => {
        c.setAttribute('aria-invalid', 'true');
        const ids = new Set((c.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
        ids.add(err.id);
        c.setAttribute('aria-describedby', [...ids].join(' '));
      });
      firstControl ??= control;
      if (list) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${control.id || err.id}`;
        a.textContent = message;
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          control.focus();
        });
        li.append(a);
        list.append(li);
      }
    }
    if (summary && list?.childElementCount) {
      summary.hidden = false;
      summary.focus();
    } else {
      firstControl?.focus();
    }
  };

  // --- Short-notice warning -----------------------------------------------

  const updateNotice = () => {
    if (!notice) return;
    const p = readPayload();
    const warning = shortNoticeWarning(p, new Date());
    notice.textContent = warning ?? '';
    notice.hidden = !warning;
  };

  // --- Wiring -------------------------------------------------------------

  form.addEventListener('change', (e) => {
    applyConditionals();
    updateNotice();
    // Once a field has been flagged, re-check it as the visitor fixes it
    // rather than making them submit again to see the message go.
    const target = e.target as HTMLInputElement | null;
    if (target?.name && target.getAttribute('aria-invalid') === 'true') {
      const errors = validateBooking(readPayload());
      const message = errors[target.name as keyof BookingPayload];
      const { err } = fieldFor(target.name);
      if (!message && err) {
        err.hidden = true;
        err.textContent = '';
        form
          .querySelectorAll(`[name="${target.name}"]`)
          .forEach((c) => c.removeAttribute('aria-invalid'));
      }
    }
  });

  applyConditionals();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || !status) return;

    const payload = readPayload();
    const errors = validateBooking(payload);
    if (Object.keys(errors).length > 0) {
      status.textContent = '';
      showErrors(errors);
      return;
    }
    clearErrors();

    sending = true;
    submitBtn?.setAttribute('disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending…';

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response | null = null;
    let body = null as ResponseBody | null;
    try {
      res = await fetch(`${API_BASE}/api/booking-enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      body = (await res.json().catch(() => null)) as ResponseBody | null;
    } catch {
      res = null;
    } finally {
      window.clearTimeout(timer);
    }

    const tracked = { space: payload.space, event_type: payload.event_type };

    if (res && (res.status === 200 || res.status === 202) && body?.ok !== false) {
      // 202 means the Worker could not reach Notion and has queued the
      // enquiry to retry. The visitor's side is the same either way.
      trackEvent('booking_enquiry_submit', { ...tracked, queued: res.status === 202 });
      const emailSlot = done?.querySelector('[data-done-email]');
      const refSlot = done?.querySelector('[data-done-ref]');
      if (emailSlot) emailSlot.textContent = payload.contact_email;
      if (refSlot) refSlot.textContent = submissionId.slice(0, 8).toUpperCase();
      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
      return;
    }

    sending = false;
    submitBtn?.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (res?.status === 400 && body?.errors && Object.keys(body.errors).length > 0) {
      status.textContent = '';
      showErrors(body.errors);
      trackEvent('booking_enquiry_error', { ...tracked, error_kind: 'invalid' });
      return;
    }
    if (res?.status === 429) {
      status.textContent = `Too many enquiries from this connection just now. Wait a few minutes and try again, or email ${FALLBACK_EMAIL}.`;
      trackEvent('booking_enquiry_error', { ...tracked, error_kind: 'rate_limited' });
      return;
    }
    status.textContent = `This did not go through. Your answers are still here, so try again in a moment, or email ${FALLBACK_EMAIL}.`;
    trackEvent('booking_enquiry_error', {
      ...tracked,
      error_kind: res === null ? 'network' : 'rejected',
    });
  });

  // Readiness flag so a test can wait for the handler (same convention as
  // contact-form.ts and work-enquiry-form.ts).
  form.dataset.ready = 'true';
}

export {};
