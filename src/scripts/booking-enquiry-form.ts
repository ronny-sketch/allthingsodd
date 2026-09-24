// Script for the ODDspace booking enquiry (BookingEnquiryForm.astro). It runs
// the guided enquiry dialog (v2, 2026-09-24): opening and closing it, one
// step at a time with a progress bar, a "Check and send" summary, and the
// sticky "Get a quote" bar on the venue page. Underneath it does what it
// always has: shows and hides conditional fields, turns the questions into
// the spec's payload, validates with the shared rules in
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
//
// Errors. Nothing is marked while someone is still filling a step in, apart
// from an email address that is plainly wrong once they leave the field.
// Next checks the current step only: each question there that needs an
// answer is marked where it is (label, line and message in Heat) and focus
// goes to the first. From then on each one clears the moment it is answered.
// Back never checks anything. Send checks everything again, and anything
// still missing (or refused by the Worker) takes the visitor to the step it
// belongs to.
//
// Opening and closing. Every "Get a quote" and every link to #booking-form
// opens the dialog, and the URL gains #booking-form, so the phone's back
// button closes it again, as do Esc and ×. The answers live in the page and
// stay until it is reloaded; nothing is stored in the browser.
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
const HASH = '#booking-form';
const REPLY_PROMISE =
  'We check the date and reply with availability and a price within one working day.';

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

// "2026-11-02" as "Mon 2 Nov 2026".
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
function formatDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return dateFmt.format(new Date(y, m - 1, d));
}

function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const form = document.getElementById('bookingEnquiryForm');
const dialog = document.getElementById('bk-dialog');
if (form instanceof HTMLFormElement && dialog instanceof HTMLDialogElement) {
  const root = document.getElementById('booking-form');
  const body = document.getElementById('bk-body');
  const status = form.querySelector<HTMLElement>('.form-status');
  const announce = document.getElementById('bk-announce');
  const notice = form.querySelector<HTMLElement>('#bk-notice');
  const capacity = form.querySelector<HTMLElement>('#bk-capacity');
  const steward = form.querySelector<HTMLElement>('#bk-steward');
  const whenSummary = form.querySelector<HTMLElement>('#bk-when-summary');
  const review = form.querySelector<HTMLElement>('#bk-review');
  const reviewNotes = form.querySelector<HTMLElement>('#bk-review-notes');
  const done = document.getElementById('bk-done');
  const count = document.getElementById('bk-count');
  const progress = Array.from(dialog.querySelectorAll<HTMLElement>('.bk-progress li'));
  const backBtn = form.querySelector<HTMLButtonElement>('.bk-back');
  const nextBtn = form.querySelector<HTMLButtonElement>('.bk-next');
  const steps = Array.from(form.querySelectorAll<HTMLElement>('.bk-step[data-step]'));
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

  // Every current answer to one name, however it is rendered: checked
  // radios and checkboxes, or the value of any other enabled control.
  const valuesOf = (name: string): string[] =>
    Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`))
      .filter((c) => !c.disabled)
      .filter((c) => (c.type === 'radio' || c.type === 'checkbox' ? c.checked : c.value !== ''))
      .map((c) => c.value);
  const value = (name: string) => valuesOf(name)[0]?.trim() ?? '';
  const ticked = (name: string) => valuesOf(name).includes('true');

  // The visible label of each checked option of one name.
  const choiceLabels = (name: string): string[] =>
    Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`))
      .filter((c) => !c.disabled)
      .map(
        (c) =>
          c.closest('label')?.querySelector('.chip-face, .bk-card-name')?.textContent?.trim() ??
          c.value,
      );

  // --- Conditional fields -------------------------------------------------

  const conditionals = Array.from(form.querySelectorAll<HTMLElement>('[data-show-when]'));

  const applies = (rule: string): boolean => {
    const negate = rule.includes('!=');
    const [name, wanted] = rule.split(negate ? '!=' : '=');
    if (!name || wanted === undefined) return true;
    const answers = valuesOf(name);
    if (wanted === '*') return answers.length > 0;
    const hit = wanted.split('|').some((v) => answers.includes(v));
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
    const multi = ticked('multi_day');
    const endDate = multi ? value('end_date') : '';
    if (!date || !from || !until || (multi && !endDate)) {
      return { start: '', end: '', nextDay: false };
    }
    const nextDay = !multi && until <= from;
    const lastDay = multi ? endDate : nextDay ? addDays(date, 1) : date;
    return { start: `${date}T${from}`, end: `${lastDay}T${until}`, nextDay };
  };

  // "12 hours 45 minutes", or '' until the times make sense. Hours and
  // minutes, never a decimal: 12.75 hours reads like 12:75.
  const lengthText = (): string => {
    const { start, end } = localTimes();
    const inIso = start && helsinkiLocalToISO(start);
    const outIso = end && helsinkiLocalToISO(end);
    const hours = inIso && outIso ? (Date.parse(outIso) - Date.parse(inIso)) / 3_600_000 : NaN;
    if (!(hours > 0)) return '';
    const totalMin = Math.round(hours * 60);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    const hPart = hh ? `${hh} ${hh === 1 ? 'hour' : 'hours'}` : '';
    const mPart = mm ? `${mm} minutes` : '';
    return [hPart, mPart].filter(Boolean).join(' ');
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
    const multi = ticked('multi_day');
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

  const stepIndexOf = (el: Element) => {
    const step = el.closest<HTMLElement>('.bk-step');
    return step ? steps.indexOf(step) : -1;
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

  // The footer's count. On the summary the button says "Send enquiry", so
  // the count says "before sending" there; the only question on that step
  // is the privacy tick box, so it names it.
  const neededText = (n: number) => {
    if (steps[current]?.dataset.step === 'review') {
      return n === 1 ? 'Tick the privacy box to send.' : `${n} answers needed before sending.`;
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
  // answered. Nothing new is marked here, because that would scold someone
  // halfway through typing.
  const refreshMarks = () => {
    if (invalidWrappers().length === 0) return;
    const now = new Map(byQuestion(collectErrors()));
    for (const wrap of invalidWrappers()) {
      const message = now.get(wrap);
      if (message) mark(wrap, message);
      else unmark(wrap);
    }
    // A question hidden since (its trigger changed) is not waiting any more.
    form.querySelectorAll<HTMLElement>('.field.is-invalid[hidden]').forEach(unmark);
    const left = invalidWrappers().filter((w) => stepIndexOf(w) === current).length;
    if (status?.classList.contains('is-error') && !sending) {
      if (left === 0) setStatus(steps[current]?.dataset.step === 'review' ? REPLY_PROMISE : '');
      else setStatus(neededText(left), true);
    }
  };

  // --- Live feedback ------------------------------------------------------

  const updateWhenSummary = () => {
    if (!whenSummary) return;
    const { end, nextDay } = localTimes();
    const length = lengthText();
    if (!length) {
      whenSummary.hidden = true;
      whenSummary.textContent = '';
      return;
    }
    const until = end.slice(11);
    let text = `${length} in total, until ${until}.`;
    if (nextDay) text = `${length} in total, ending the next day at ${until}.`;
    if (ticked('multi_day')) text = `Until ${formatDate(end.slice(0, 10))} at ${until}.`;
    whenSummary.textContent = text;
    whenSummary.hidden = false;
  };

  const warnings = () => {
    const p = readPayload();
    return {
      shortNotice: shortNoticeWarning(p, new Date()),
      capacity: capacityWarning(p.space, p.headcount_estimate),
      steward: (p.headcount_estimate ?? 0) > 100,
    };
  };

  const updateNotices = () => {
    const w = warnings();
    if (notice) {
      notice.textContent = w.shortNotice ?? '';
      notice.hidden = !w.shortNotice;
    }
    if (capacity) {
      capacity.textContent = w.capacity ?? '';
      capacity.hidden = !w.capacity;
    }
    if (steward) steward.hidden = !w.steward;
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

  // A date is chosen from the calendar, never typed. A click or tap anywhere
  // on the field opens the browser's own picker, and Enter or Space does the
  // same from the keyboard. Keys that would type into the field are
  // swallowed; Tab, Escape and the arrow keys are left alone, so the field
  // stays operable without a mouse. Where showPicker() is missing (older
  // browsers) the native field simply behaves as before.
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

  // --- Check and send -----------------------------------------------------

  type Row = [label: string, value: string | undefined];

  // What the summary shows for each numbered step. Empty answers are left
  // out; the required ones cannot be empty by the time the summary shows.
  const summaryRows = (): Row[][] => {
    const multi = ticked('multi_day');
    const { nextDay } = localTimes();
    const from = value('time_from');
    const until = value('time_until');
    const length = lengthText();
    const alts = ticked('has_alt_dates')
      ? [value('alt_date_1'), value('alt_date_2')].filter(Boolean).map(formatDate)
      : [];
    const fixed = form.querySelector<HTMLElement>('[data-show-when^="space="] .bk-fixed');
    const layoutFixed = fixed ? !fixed.closest<HTMLElement>('.field')!.hidden : false;
    const layout = layoutFixed
      ? 'Fixed tiered seating'
      : value('layout') === 'custom'
        ? value('layout_custom')
        : choiceLabels('layout')[0] || 'Not decided yet';
    const tech = choiceLabels('tech');
    const member = value('is_member');
    return [
      [
        [
          multi ? 'Dates' : 'Date',
          value('event_date') &&
            formatDate(value('event_date')) +
              (multi && value('end_date') ? ` to ${formatDate(value('end_date'))}` : ''),
        ],
        [
          'Hours',
          from && until
            ? `${from} to ${until}${nextDay ? ' the next day' : ''}${length && !multi ? `, ${length}` : ''}`
            : undefined,
        ],
        ['Other dates', alts.join(', ') || undefined],
        [
          'Series',
          ticked('is_series') && value('series_count')
            ? `${value('series_count')} events`
            : undefined,
        ],
      ],
      [
        ['People', value('headcount_estimate')],
        ['Room', choiceLabels('space')[0]],
        ['Layout', layout],
      ],
      [
        ['Name', value('event_title')],
        ['Kind', choiceLabels('event_type')[0]],
        ['Who can come', choiceLabels('audience')[0]],
        ['About it', value('event_description')],
      ],
      [
        ['Help from us', choiceLabels('support_level')[0]],
        ['Kit', tech.join(', ') || 'Nothing extra'],
        ['Microphones', value('mic_count') || undefined],
        ['Own equipment', ticked('own_equipment') ? value('own_equipment_detail') : undefined],
        ['Alcohol', choiceLabels('alcohol')[0]],
        ['Music', choiceLabels('music')[0]],
        ['Smoke or flame', ticked('has_pyro') ? value('pyro_flame_detail') : undefined],
      ],
      [
        [
          'Name',
          [value('contact_first_name'), value('contact_last_name')].filter(Boolean).join(' '),
        ],
        ['Email', value('contact_email')],
        ['Phone', value('contact_phone') || undefined],
        ['Booking as', choiceLabels('org_type')[0]],
        ['Organisation', value('org_name') || undefined],
        [
          'ODDspace member',
          member === 'true'
            ? ['Yes', ...choiceLabels('membership_tier')].join(', ')
            : member === 'false'
              ? 'No'
              : undefined,
        ],
        ['Anything else', value('notes') || undefined],
      ],
    ];
  };

  // Built from text nodes only, never HTML, because every value is the
  // visitor's own typing.
  const renderReview = () => {
    if (!review) return;
    const groups = summaryRows().map((rows, i) => {
      const group = document.createElement('section');
      group.className = 'bk-review-group';
      const head = document.createElement('div');
      head.className = 'bk-review-head';
      const title = document.createElement('h3');
      title.className = 'bk-review-title';
      const stepTitle = numbered[i]?.querySelector('.bk-step-head > span:last-child')?.textContent;
      title.textContent = stepTitle ?? '';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'bk-review-edit';
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

    if (reviewNotes) {
      const w = warnings();
      const notes = [w.shortNotice, w.capacity].filter(Boolean).map((text) => {
        const p = document.createElement('p');
        p.className = 'booking-warning';
        p.textContent = text!;
        return p;
      });
      reviewNotes.replaceChildren(...notes);
      reviewNotes.hidden = notes.length === 0;
    }
  };

  // --- Steps --------------------------------------------------------------

  const isReview = (i: number) => steps[i]?.dataset.step === 'review';

  const primaryLabel = (i: number) => {
    if (isReview(i)) return 'Send enquiry';
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
    setStatus(atReview ? REPLY_PROMISE : '');
    if (focus) target.querySelector<HTMLElement>('.bk-step-head')?.focus({ preventScroll: true });
  };

  backBtn?.addEventListener('click', () => {
    if (current > 0) showStep(current - 1, { back: true });
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
  // the visitor leaves the field. An empty one waits for Next.
  const email = form.querySelector<HTMLInputElement>('input[name="contact_email"]');
  email?.addEventListener('blur', () => {
    const v = email.value.trim();
    const wrap = wrapperFor('contact_email');
    if (!wrap) return;
    if (v !== '' && !EMAIL_RE.test(v)) mark(wrap, 'That email address does not look right.');
    else if (!attempted) unmark(wrap);
  });

  applyConditionals();
  syncEndMin();

  // Sends the whole enquiry. Anything missing takes the visitor to the step
  // it belongs to, with every missing answer marked.
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
    let res: Response | null = null;
    let reply = null as ResponseBody | null;
    try {
      res = await fetch(`${API_BASE}/api/booking-enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      reply = (await res.json().catch(() => null)) as ResponseBody | null;
    } catch {
      res = null;
    } finally {
      window.clearTimeout(timer);
    }

    const tracked = { space: payload.space, event_type: payload.event_type };

    if (res && (res.status === 200 || res.status === 202) && reply?.ok !== false) {
      // 202 means the Worker could not reach Notion and has queued the
      // enquiry to retry. The visitor's side is the same either way.
      trackEvent('booking_enquiry_submit', { ...tracked, queued: res.status === 202 });
      sent = true;
      const ref = submissionId.slice(0, 8).toUpperCase();
      done?.querySelectorAll('[data-done-email]').forEach((el) => {
        el.textContent = payload.contact_email;
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
      // The page says so too, in place of the button.
      const sentNote = document.getElementById('bk-sent');
      const ask = document.querySelector<HTMLElement>('.bk-opener');
      sentNote?.querySelectorAll('[data-sent-ref]').forEach((el) => {
        el.textContent = ref;
      });
      if (sentNote) sentNote.hidden = false;
      if (ask) ask.hidden = true;
      updateSticky();
      return;
    }

    sending = false;
    nextBtn?.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (res?.status === 400 && reply?.errors && Object.keys(reply.errors).length > 0) {
      setStatus(REPLY_PROMISE);
      const refused = byQuestion(reply.errors as Errors);
      if (refused.length > 0) {
        const first = stepIndexOf(refused[0]![0]);
        if (first !== current && first >= 0) showStep(first, { back: true, focus: false });
        showErrors(refused);
      } else {
        setStatus(
          `Something in the enquiry was refused. Check your answers, or email ${FALLBACK_EMAIL}.`,
          true,
        );
      }
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

  const openDialog = (entry: string) => {
    if (dialog.open) return;
    // Where focus goes back to on close. Opened from a link on arrival
    // (/oddspace's card, a shared URL) nothing on the page had focus, so it
    // falls back to the page's own ask: the button, or the sent note.
    const active = document.activeElement;
    returnFocus =
      active instanceof HTMLElement && active !== document.body
        ? active
        : (document.querySelector<HTMLElement>('.bk-opener:not([hidden]) #bk-open') ??
          document.getElementById('bk-sent'));
    // The URL gains #booking-form as its own history entry, so the back
    // button closes the enquiry rather than leaving the page. Arriving with
    // the hash already set, the plain URL goes underneath it first.
    const plain = window.location.pathname + window.location.search;
    if (window.location.hash !== HASH) {
      history.pushState({ bk: true }, '', HASH);
    } else if (!(history.state as { bk?: boolean } | null)?.bk) {
      history.replaceState(null, '', plain);
      history.pushState({ bk: true }, '', HASH);
    }
    dialog.showModal();
    html.classList.add('bk-lock');
    updateSticky();
    if (!opened) trackEvent('booking_enquiry_open', { entry });
    opened = true;
    const focusTarget =
      done && !done.hidden ? done : steps[current]?.querySelector<HTMLElement>('.bk-step-head');
    focusTarget?.focus({ preventScroll: true });
  };

  dialog.addEventListener('close', () => {
    html.classList.remove('bk-lock');
    // Closed by × or Esc: take the #booking-form entry back off the history.
    if (window.location.hash === HASH) {
      if ((history.state as { bk?: boolean } | null)?.bk) history.back();
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    returnFocus?.focus({ preventScroll: true });
    updateSticky();
  });
  dialog
    .querySelectorAll<HTMLElement>('.bk-close, .bk-done-close')
    .forEach((b) => b.addEventListener('click', () => dialog.close()));

  window.addEventListener('popstate', () => {
    if (window.location.hash === HASH) openDialog('history');
    else if (dialog.open) dialog.close();
  });
  window.addEventListener('hashchange', () => {
    if (window.location.hash === HASH && !dialog.open) openDialog('link');
  });

  document.getElementById('bk-open')?.addEventListener('click', () => openDialog('final'));
  document.querySelector('.bk-sticky-cta')?.addEventListener('click', () => openDialog('sticky'));
  const heroCta = document.querySelector<HTMLAnchorElement>(`a[href="${HASH}"]`);
  document.querySelectorAll<HTMLAnchorElement>(`a[href="${HASH}"]`).forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      openDialog(a === heroCta ? 'hero' : 'link');
    });
  });

  // --- The sticky "Get a quote" bar ---------------------------------------

  // Shown once the hero's "Get a quote" has scrolled away and until the
  // final section (with its own button) comes into view. Hidden while the
  // enquiry is open, while the cookie banner is up (consent comes first,
  // and both want the foot of the screen), and after an enquiry is sent.
  const sticky = document.getElementById('bk-sticky');
  const finalSection = root?.closest('section') ?? root;
  const bannerUp = () => document.querySelector('[data-consent-banner].is-visible') !== null;
  const modal: HTMLDialogElement = dialog;
  function updateSticky() {
    if (!sticky) return;
    const heroGone = heroCta
      ? heroCta.getBoundingClientRect().bottom < 0
      : window.scrollY > window.innerHeight;
    const finalNear = finalSection
      ? finalSection.getBoundingClientRect().top < window.innerHeight
      : false;
    const show = heroGone && !finalNear && !modal.open && !bannerUp() && !sent;
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
  // contact-form.ts and work-enquiry-form.ts).
  form.dataset.ready = 'true';
}

export {};
