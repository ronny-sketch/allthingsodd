// Submit script for the ODDspace booking enquiry form (BookingEnquiryForm.astro).
// It shows and hides conditional fields, turns the form's questions into the
// spec's payload, validates with the shared rules in booking-enquiry-schema.ts,
// shows what is missing, and POSTs JSON to /api/booking-enquiry on the Growth
// OS Worker (see api-base.ts for why that is a cross-origin URL). No key or
// vendor SDK is involved. The Worker holds the Notion token and the Make
// webhook, and it validates everything again.
//
// Duplicate protection works in two layers. First, a single in-flight guard
// with the button disabled, so a double click sends one request. Second,
// one `submission_id` per filled-in form, generated once and reused on every
// retry. The Worker treats that id as an idempotency key, so a retry after a
// timeout that actually reached Notion does not create a second record.
//
// Errors (2026-09-24). Nothing is marked while someone is still filling the
// form in, apart from an email address that is plainly wrong once they leave
// the field. On submit, every question that needs an answer is marked where
// it is (label, line and message in Heat), focus goes to the first one, and
// a panel at the foot of the screen lists them all as links. From then on
// each one clears the moment it is answered, and the panel counts down.
import { API_BASE } from './api-base';
import { captureFirstTouch } from './utm';
import { trackEvent } from './analytics';
import {
  AUDIENCE,
  LIMITS,
  validateBooking,
  shortNoticeWarning,
  capacityWarning,
  headcountBand,
  helsinkiLocalToISO,
  type BookingPayload,
  type FieldErrors,
} from './booking-enquiry-schema';

const REQUEST_TIMEOUT_MS = 20_000;
const FALLBACK_EMAIL = 'hello@oddfest.co';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// What the Worker answers with. `errors` carries field-level messages on a 400.
interface ResponseBody {
  ok?: boolean;
  message?: string;
  submission_id?: string;
  errors?: FieldErrors;
}

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

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "2026-11-02" plus n days, as a calendar date with no time zone involved.
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return isoDate(new Date(y, m - 1, d + n));
}

function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const form = document.getElementById('bookingEnquiryForm');
if (form instanceof HTMLFormElement) {
  const root = document.getElementById('booking-form');
  const status = form.querySelector<HTMLElement>('.form-status');
  const statusDefault = status?.textContent?.trim() ?? '';
  const panel = document.getElementById('bk-summary');
  const panelTitle = panel?.querySelector<HTMLElement>('#bk-summary-title');
  const panelList = panel?.querySelector<HTMLElement>('.bk-panel-list');
  const announce = document.getElementById('bk-announce');
  const notice = form.querySelector<HTMLElement>('#bk-notice');
  const capacity = form.querySelector<HTMLElement>('#bk-capacity');
  const steward = form.querySelector<HTMLElement>('#bk-steward');
  const whenSummary = form.querySelector<HTMLElement>('#bk-when-summary');
  const done = document.getElementById('bk-done');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submissionId = newSubmissionId();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 520px)');
  let sending = false;
  let attempted = false;

  // --- Reading controls ---------------------------------------------------

  // Every current answer to one name, however it is rendered: checked
  // radios and checkboxes, or the value of any other enabled control.
  const valuesOf = (name: string): string[] =>
    Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`))
      .filter((c) => !c.disabled)
      .filter((c) => (c.type === 'radio' || c.type === 'checkbox' ? c.checked : c.value !== ''))
      .map((c) => c.value);
  const value = (name: string) => valuesOf(name)[0]?.trim() ?? '';

  // --- Conditional fields -------------------------------------------------

  const conditionals = Array.from(form.querySelectorAll<HTMLElement>('[data-show-when]'));

  const applies = (rule: string): boolean => {
    const negate = rule.includes('!=');
    const [name, wanted] = rule.split(negate ? '!=' : '=');
    if (!name || wanted === undefined) return true;
    const current = valuesOf(name);
    if (wanted === '*') return current.length > 0;
    const hit = wanted.split('|').some((v) => current.includes(v));
    return negate ? !hit : hit;
  };

  const applyConditionals = () => {
    // Twice, so a field whose trigger was itself just hidden settles in the
    // same pass (the layout details depend on the layout, which depends on
    // the space).
    for (let pass = 0; pass < 2; pass++) {
      for (const el of conditionals) {
        const show = applies(el.dataset.showWhen ?? '');
        el.hidden = !show;
        el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input, select, textarea',
        ).forEach((c) => {
          c.disabled = !show;
        });
      }
    }
  };

  // --- From questions to payload ------------------------------------------

  // The date and times as Helsinki wall-clock strings, or '' while a part is
  // missing. An end time at or before the start means the next day.
  const localTimes = () => {
    const date = value('event_date');
    const from = value('time_from');
    const until = value('time_until');
    const multi = valuesOf('multi_day').includes('true');
    const endDate = multi ? value('end_date') : '';
    if (!date || !from || !until || (multi && !endDate)) {
      return { start: '', end: '', nextDay: false };
    }
    const nextDay = !multi && until <= from;
    const lastDay = multi ? endDate : nextDay ? addDays(date, 1) : date;
    return { start: `${date}T${from}`, end: `${lastDay}T${until}`, nextDay };
  };

  const people = (): number | undefined => {
    const raw = value('headcount_estimate');
    if (raw === '') return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= LIMITS.maxHeadcount ? n : undefined;
  };

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
    const times = localTimes();
    const n = people();
    const audience = AUDIENCE.find((a) => a.value === str(fd, 'audience'));
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
      // Left unset (not false) when neither answer is picked, so the rule
      // "tell us whether you are a member" can fire.
      is_member: (memberRaw === '' ? undefined : memberRaw === 'true') as boolean,
      membership_tier: opt(fd, 'membership_tier'),
      consent_privacy: bool(fd, 'consent_privacy'),

      event_title: str(fd, 'event_title'),
      event_description: str(fd, 'event_description'),
      event_type: str(fd, 'event_type'),
      event_visibility: audience?.visibility ?? '',
      event_access: audience?.access ?? '',
      get_in: (times.start && helsinkiLocalToISO(times.start)) || '',
      get_out: (times.end && helsinkiLocalToISO(times.end)) || '',
      alt_date_1: opt(fd, 'alt_date_1'),
      alt_date_2: opt(fd, 'alt_date_2'),
      headcount_band: n === undefined ? '' : headcountBand(n),
      headcount_estimate: n,
      is_series: bool(fd, 'is_series'),
      series_count: int(fd, 'series_count'),

      space: str(fd, 'space'),
      layout: opt(fd, 'layout'),
      layout_custom: opt(fd, 'layout_custom'),
      support_level: str(fd, 'support_level'),
      tech: fd.getAll('tech').map(String),
      mic_count: int(fd, 'mic_count'),
      own_equipment: bool(fd, 'own_equipment'),
      own_equipment_detail: opt(fd, 'own_equipment_detail'),

      alcohol: str(fd, 'alcohol'),
      music: str(fd, 'music'),
      // One tick box in the form, the spec's yes/no in the payload.
      pyro_flame: bool(fd, 'has_pyro') ? 'yes' : 'no',
      pyro_flame_detail: opt(fd, 'pyro_flame_detail'),
      // Not asked any more (settled after booking); the Worker still takes
      // the key, so it goes as an empty list.
      media: [],

      notes: opt(fd, 'notes'),
    };
  };

  // --- Validation ---------------------------------------------------------

  // The shared rules, plus what only this form can say: which part of the
  // date and time is missing, and that the number of people is a guess.
  // Keys are payload names; each one resolves to the question it belongs to
  // through the control carrying that name.
  const collectErrors = (): Errors => {
    const payload = readPayload();
    const e: Errors = { ...(validateBooking(payload) as Errors) };

    const missing = [
      !value('event_date') && 'the date',
      !value('time_from') && 'a start time',
      !value('time_until') && 'an end time',
    ].filter(Boolean) as string[];
    const multi = valuesOf('multi_day').includes('true');
    if (missing.length) e.get_in = `Add ${listPhrase(missing)}.`;
    else if (multi && !value('end_date')) e.get_in = 'Add the last day.';
    else if (multi && value('end_date') < value('event_date'))
      e.get_in = 'The last day has to come after the first.';
    if (e.get_in) delete e.get_out;

    if (value('headcount_estimate') === '') {
      e.headcount_band = 'Roughly how many people? A guess is fine.';
    } else if (people() === undefined) {
      e.headcount_band = `Use a whole number between 1 and ${LIMITS.maxHeadcount}.`;
    }
    delete e.headcount_estimate;

    if (e.event_visibility || e.event_access) {
      e.event_visibility = 'Tell us who can come.';
      delete e.event_access;
    }
    return e;
  };

  // --- Marking questions --------------------------------------------------

  const wrapperFor = (name: string) =>
    form.querySelector<HTMLElement>(`[name="${name}"]`)?.closest<HTMLElement>('.field') ?? null;

  const controlsIn = (wrap: HTMLElement) =>
    Array.from(
      wrap.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]), select, textarea',
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

  const focusQuestion = (wrap: HTMLElement) => {
    const controls = controlsIn(wrap);
    const target =
      controls.find((c) =>
        c instanceof HTMLInputElement && c.type === 'radio' ? c.checked : false,
      ) ??
      controls.find((c) => c.value === '' && c.type !== 'radio' && c.type !== 'checkbox') ??
      controls[0];
    wrap.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    target?.focus({ preventScroll: true });
  };

  // The cookie banner shares the foot of the screen and outranks this panel
  // (consent comes first), so while it is up the panel sits just above it.
  const liftPanel = () => {
    if (!panel || panel.hidden) return;
    const banner = document.querySelector<HTMLElement>('[data-consent-banner].is-visible');
    // Measured from layout, not from the banner's current box, so a banner
    // still sliding in (a transform) does not give a short reading.
    const lift = banner
      ? banner.offsetHeight + (Number.parseFloat(getComputedStyle(banner).bottom) || 0)
      : 0;
    panel.style.setProperty('--bk-lift', lift ? `${lift + 12}px` : '0px');
  };
  const bannerEl = document.querySelector('[data-consent-banner]');
  if (bannerEl) {
    new MutationObserver(liftPanel).observe(bannerEl, {
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
  }
  window.addEventListener('resize', liftPanel);

  const hidePanel = () => {
    if (panel) panel.hidden = true;
    root?.classList.remove('has-panel');
  };

  const renderPanel = () => {
    if (!panel || !panelTitle || !panelList) return;
    const open = invalidWrappers();
    if (open.length === 0) {
      hidePanel();
      return;
    }
    panelTitle.textContent =
      open.length === 1 ? '1 answer needed' : `${open.length} answers needed`;
    // The first few by name, then a count, so the panel stays two lines
    // high however much is missing. "Show me" walks through all of them.
    const shown = narrow.matches ? 3 : 6;
    const items = open.slice(0, shown).map((wrap) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      const target = controlsIn(wrap)[0];
      a.href = `#${target?.id || wrap.id}`;
      a.textContent = wrap.dataset.label ?? 'This question';
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        focusQuestion(wrap);
      });
      li.append(a);
      return li;
    });
    if (open.length > shown) {
      const more = document.createElement('li');
      more.className = 'bk-panel-more';
      more.textContent = `and ${open.length - shown} more`;
      items.push(more);
    }
    panelList.replaceChildren(...items);
  };

  const showPanel = () => {
    if (!panel) return;
    renderPanel();
    if (invalidWrappers().length > 0) {
      panel.hidden = false;
      root?.classList.add('has-panel');
      liftPanel();
    }
  };

  // Marks every question in `errors`, shows the panel and moves to the first.
  const showErrors = (errors: Errors) => {
    invalidWrappers().forEach(unmark);
    const entries = byQuestion(errors);
    for (const [wrap, message] of entries) mark(wrap, message);
    showPanel();
    const first = entries[0]?.[0];
    if (announce) {
      const labels = entries.map(([w]) => w.dataset.label ?? '').filter(Boolean);
      // Cleared first, so the same text announced twice is still announced.
      announce.textContent = '';
      window.setTimeout(() => {
        announce.textContent = `${entries.length === 1 ? '1 answer' : `${entries.length} answers`} needed: ${labels.join(', ')}.`;
      }, 50);
    }
    if (first) focusQuestion(first);
  };

  // Keep each marked question's message current and clear it once it is
  // answered. Nothing new is marked here, because that would scold someone
  // halfway through typing.
  const refreshMarks = () => {
    if (invalidWrappers().length === 0) return;
    const current = new Map(byQuestion(collectErrors()));
    for (const wrap of invalidWrappers()) {
      const message = current.get(wrap);
      if (message) mark(wrap, message);
      else unmark(wrap);
    }
    // A question hidden since (its trigger changed) is not waiting any more.
    form.querySelectorAll<HTMLElement>('.field.is-invalid[hidden]').forEach(unmark);
    if (panel && !panel.hidden) renderPanel();
  };

  // --- Live feedback ------------------------------------------------------

  const updateWhenSummary = () => {
    if (!whenSummary) return;
    const { start, end, nextDay } = localTimes();
    const inIso = start && helsinkiLocalToISO(start);
    const outIso = end && helsinkiLocalToISO(end);
    const hours = inIso && outIso ? (Date.parse(outIso) - Date.parse(inIso)) / 3_600_000 : NaN;
    if (!(hours > 0)) {
      whenSummary.hidden = true;
      whenSummary.textContent = '';
      return;
    }
    // Hours and minutes, never a decimal: 12.75 hours reads like 12:75.
    const totalMin = Math.round(hours * 60);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    const hPart = hh ? `${hh} ${hh === 1 ? 'hour' : 'hours'}` : '';
    const mPart = mm ? `${mm} minutes` : '';
    const length = [hPart, mPart].filter(Boolean).join(' ');
    const until = end.slice(11);
    let text = `${length} in total, until ${until}.`;
    if (nextDay) text = `${length} in total, ending the next day at ${until}.`;
    if (valuesOf('multi_day').includes('true')) {
      const fmt = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const [y, m, d] = end.slice(0, 10).split('-').map(Number) as [number, number, number];
      text = `Until ${fmt.format(new Date(y, m - 1, d))} at ${until}.`;
    }
    whenSummary.textContent = text;
    whenSummary.hidden = false;
  };

  const updateNotices = () => {
    const p = readPayload();
    if (notice) {
      const warning = shortNoticeWarning(p, new Date());
      notice.textContent = warning ?? '';
      notice.hidden = !warning;
    }
    if (capacity) {
      const warning = capacityWarning(p.space, p.headcount_estimate);
      capacity.textContent = warning ?? '';
      capacity.hidden = !warning;
    }
    if (steward) steward.hidden = !((p.headcount_estimate ?? 0) > 100);
    updateWhenSummary();
  };

  // The earliest date each picker offers is today; the last day of a
  // multi-day event cannot be before its first.
  const today = isoDate(new Date());
  form
    .querySelectorAll<HTMLInputElement>('input[type="date"]')
    .forEach((d) => d.setAttribute('min', today));
  const syncEndMin = () => {
    const end = form.querySelector<HTMLInputElement>('input[name="end_date"]');
    if (end) end.min = value('event_date') || today;
  };

  // --- Picker-only dates ------------------------------------------------

  // A date is chosen from the calendar, never typed (2026-09-24). A click or
  // tap anywhere on the field opens the browser's own picker, and Enter or
  // Space does the same from the keyboard. Keys that would type into the
  // field are swallowed; Tab, Escape and the arrow keys are left alone, so
  // the field stays operable without a mouse. Where showPicker() is missing
  // (older browsers) the native field simply behaves as before.
  const openPicker = (input: HTMLInputElement) => {
    try {
      input.showPicker?.();
    } catch {
      // Refused (not a user gesture, or inside a cross-origin frame).
    }
  };
  form.querySelectorAll<HTMLInputElement>('input[data-picker-only]').forEach((input) => {
    input.addEventListener('click', () => openPicker(input));
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        openPicker(input);
        return;
      }
      if (ev.key === 'Backspace' || ev.key === 'Delete') return;
      if (ev.key.length === 1 && !ev.metaKey && !ev.ctrlKey) ev.preventDefault();
    });
    input.addEventListener('paste', (ev) => ev.preventDefault());
  });

  // --- Wiring -------------------------------------------------------------

  const onEdit = () => {
    applyConditionals();
    syncEndMin();
    updateNotices();
    refreshMarks();
  };
  form.addEventListener('change', onEdit);
  form.addEventListener('input', onEdit);

  // An email address that is plainly wrong is worth saying so as soon as
  // the visitor leaves the field. An empty one waits for submit.
  const email = form.querySelector<HTMLInputElement>('input[name="contact_email"]');
  email?.addEventListener('blur', () => {
    const v = email.value.trim();
    const wrap = wrapperFor('contact_email');
    if (!wrap) return;
    if (v !== '' && !EMAIL_RE.test(v)) mark(wrap, 'That email address does not look right.');
    else if (!attempted) unmark(wrap);
  });

  panel?.querySelector('[data-panel-next]')?.addEventListener('click', () => {
    const open = invalidWrappers();
    if (open.length === 0) return;
    const active = document.activeElement;
    const next =
      open.find(
        (w) =>
          !(active instanceof Node && w.contains(active)) &&
          active instanceof Node &&
          active.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING,
      ) ?? open[0]!;
    focusQuestion(next);
  });
  panel?.querySelector('[data-panel-close]')?.addEventListener('click', () => {
    hidePanel();
    focusQuestion(invalidWrappers()[0] ?? form);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && panel && !panel.hidden) hidePanel();
  });

  applyConditionals();
  syncEndMin();

  const setStatus = (text: string, isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    attempted = true;

    const errors = collectErrors();
    if (Object.keys(errors).length > 0) {
      setStatus(statusDefault);
      showErrors(errors);
      return;
    }
    invalidWrappers().forEach(unmark);
    hidePanel();

    const payload = readPayload();
    sending = true;
    submitBtn?.setAttribute('disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending…');

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
        done.scrollIntoView({
          block: 'center',
          behavior: reducedMotion.matches ? 'auto' : 'smooth',
        });
        done.focus({ preventScroll: true });
      }
      return;
    }

    sending = false;
    submitBtn?.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (res?.status === 400 && body?.errors && Object.keys(body.errors).length > 0) {
      setStatus(statusDefault);
      showErrors(body.errors as Errors);
      trackEvent('booking_enquiry_error', { ...tracked, error_kind: 'invalid' });
      return;
    }
    if (res?.status === 429) {
      setStatus(
        `Too many enquiries from this connection just now. Wait a few minutes and try again, or email ${FALLBACK_EMAIL}.`,
        true,
      );
      trackEvent('booking_enquiry_error', { ...tracked, error_kind: 'rate_limited' });
      return;
    }
    setStatus(
      `This did not go through. Your answers are still here, so try again in a moment, or email ${FALLBACK_EMAIL}.`,
      true,
    );
    trackEvent('booking_enquiry_error', {
      ...tracked,
      error_kind: res === null ? 'network' : 'rejected',
    });
  });

  // --- Opening the form ---------------------------------------------------

  // The form starts closed behind one button. Opening it is one-way (there
  // is no close), so a half-filled form can never be folded away by mistake.
  // The hero's "#booking-form" link and arriving with that hash open it too.
  const opener = document.getElementById('bk-open');
  const openerWrap = opener?.closest<HTMLElement>('.bk-opener') ?? null;
  opener?.setAttribute('aria-expanded', 'false');
  opener?.setAttribute('aria-controls', form.id);
  const openForm = ({ focus = true } = {}) => {
    if (!form.hidden || done?.hidden === false) return;
    form.hidden = false;
    opener?.setAttribute('aria-expanded', 'true');
    if (openerWrap) openerWrap.hidden = true;
    trackEvent('booking_enquiry_open');
    if (focus) {
      const first = form.querySelector<HTMLElement>('#bk-step-1');
      form.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      first?.focus({ preventScroll: true });
    }
  };
  opener?.addEventListener('click', () => openForm());
  document.querySelectorAll<HTMLAnchorElement>('a[href="#booking-form"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      history.replaceState(null, '', '#booking-form');
      openForm();
    });
  });
  const openFromHash = () => {
    if (window.location.hash === '#booking-form') openForm();
  };
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  // Readiness flag so a test can wait for the handler (same convention as
  // contact-form.ts and work-enquiry-form.ts).
  form.dataset.ready = 'true';
}

export {};
