// The ODDspace booking enquiry: its field values, labels and validation rules
// in one place (2026-09-23). The form markup (BookingEnquiryForm.astro)
// renders its options from here and the submit script
// (booking-enquiry-form.ts) validates against it, so the two cannot drift.
//
// Source of truth for the keys and enum values: the ODDspace booking system
// build spec, v0.1, 22 Sep 2026, "Endpoint contract → Payload". The Worker
// route that receives this (../odd-growth-os, POST /api/booking-enquiry)
// re-validates everything server-side with its own copy of these rules. That
// copy lives in the other repo on purpose, because this site never imports
// Growth OS code (see AGENTS.md, "Growth OS integration"). If you change a
// value here, change it there in the same pull request. The Notion option
// each value lands on is mapped in the Worker, not here.
//
// Two changes from the spec's own enum, both taken from this site's event
// info pack rather than guessed:
// - `space` adds `second_floor`. The info pack lists the 2nd-floor
//   co-creation space as a bookable room for 150 people. The spec's list
//   predates the pack, and the spec says to change the enum if the room
//   answer differs.
// - `full_triangle` is labelled "Gallery, Aula and Auditorium", which is the
//   combination the pack gives a combined capacity for.

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

const opts = <V extends string>(pairs: [V, string][]): Option<V>[] =>
  pairs.map(([value, label]) => ({ value, label }));

export const ORG_TYPES = opts([
  ['company', 'Company'],
  ['association', 'Association or non-profit'],
  ['school', 'School or university'],
  ['artist', 'Artist or collective'],
  ['public_sector', 'Public sector'],
  ['other', 'Something else'],
]);

// The spec leaves the tier values open. These are the two memberships the
// site sells (/oddspace/membership and /oddstudio).
export const MEMBERSHIP_TIERS = opts([
  ['oddspace', 'ODDspace membership'],
  ['full_studio', 'Full studio membership'],
]);

export const EVENT_TYPES = opts([
  ['launch', 'Launch'],
  ['exhibition', 'Exhibition or opening'],
  ['talk', 'Talk or panel'],
  ['workshop', 'Workshop'],
  ['conference', 'Conference or seminar'],
  ['screening', 'Screening'],
  ['concert', 'Concert or performance'],
  ['party', 'Party or club night'],
  ['shoot', 'Photo or video shoot'],
  ['meeting', 'Meeting or away-day'],
  ['community', 'Community gathering'],
  ['other', 'Something else'],
]);

export const EVENT_VISIBILITY = opts([
  ['public', 'Public — anyone can come'],
  ['private', 'Private — guests only'],
]);

export const EVENT_ACCESS = opts([
  ['free', 'Free'],
  ['ticketed', 'Ticketed'],
  ['invite_only', 'Invite only'],
]);

export const HEADCOUNT_BANDS = opts([
  ['upto_50', 'Up to 50'],
  ['51_100', '51–100'],
  ['101_199', '101–199'],
  ['200_plus', '200 or more'],
]);

export const SPACES = opts([
  ['gallery', 'Gallery'],
  ['aula', 'Aula'],
  ['auditorium', 'Auditorium'],
  ['gallery_aula', 'Gallery + Aula'],
  ['auditorium_aula', 'Auditorium + Aula'],
  ['full_triangle', 'Gallery, Aula and Auditorium'],
  ['second_floor', '2nd-floor co-creation space'],
  ['advise_me', 'Not sure yet — advise me'],
]);

export const LAYOUTS = opts([
  ['theatre', 'Theatre — rows of chairs'],
  ['classroom', 'Classroom — tables facing the front'],
  ['cocktail', 'Cocktail — standing'],
  ['cabaret', 'Cabaret — round tables'],
  ['custom', 'Something else'],
  ['not_sure', 'Not sure yet'],
]);

// Package names only. What each package includes has not been published, so
// the form does not describe them. The quote explains the one that fits.
export const SUPPORT_LEVELS = opts([
  ['raw', 'Raw — just the room'],
  ['basic_infra', 'Basic infra'],
  ['standard', 'Standard'],
  ['premium', 'Premium'],
  ['turnkey', 'Turnkey — we run it with you'],
  ['advise_me', 'Not sure — advise me'],
]);

export const TECH = opts([
  ['projector', 'Projector'],
  ['screen', 'Screen'],
  ['pa', 'PA system'],
  ['mics', 'Microphones'],
  ['livestream', 'Livestream'],
  ['recording', 'Recording'],
]);

export const CATERING = opts([
  ['none', 'No food or drink'],
  ['own_food', 'We bring our own food'],
  ['own_caterer', 'We bring our own caterer'],
  ['coffee_service', 'Coffee service'],
  ['odd_coordinates', 'We would like ODD to arrange it'],
]);

export const ALCOHOL = opts([
  ['none', 'No alcohol'],
  ['served', 'Served free to guests'],
  ['sold', 'Sold to guests'],
]);

export const MUSIC = opts([
  ['none', 'No music'],
  ['background', 'Background music'],
  ['live', 'Live music'],
  ['dj', 'DJ'],
]);

export const YES_NO_NOT_SURE = opts([
  ['no', 'No'],
  ['yes', 'Yes'],
  ['not_sure', 'Not sure'],
]);

export const MEDIA = opts([
  ['photography', 'Photography'],
  ['filming', 'Filming'],
  ['livestream', 'Livestream'],
  ['recording', 'Audio recording'],
]);

export const CLEANING = opts([
  ['self', 'We clean up ourselves'],
  ['via_odd', 'Book a cleaner through ODD'],
]);

export const BUDGET_BANDS = opts([
  ['under_1000', 'Under €1,000'],
  ['1000_2500', '€1,000–2,500'],
  ['2500_5000', '€2,500–5,000'],
  ['over_5000', 'Over €5,000'],
  ['no_answer', 'Rather not say'],
]);

// Text limits. Generous enough for a real answer, small enough that a bot
// cannot use the form to post an essay into Notion. Notion's own limit is
// 2,000 characters per rich-text chunk, and the Worker splits longer text
// into chunks.
export const LIMITS = {
  short: 200,
  long: 4000,
  maxHeadcount: 2000,
  maxSeries: 100,
  maxMics: 20,
} as const;

// The shape the Worker receives. Keys and value spellings are the spec's.
export interface BookingPayload {
  submission_id: string;
  submitted_at: string;
  locale: 'fi' | 'en';
  source: string;
  hp_field: string;

  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone?: string;
  org_name?: string;
  org_type: string;
  is_member: boolean;
  membership_tier?: string;
  consent_privacy: boolean;

  event_title: string;
  event_description: string;
  event_type: string;
  event_visibility: string;
  event_access: string;
  get_in: string;
  get_out: string;
  alt_date_1?: string;
  alt_date_2?: string;
  headcount_band: string;
  headcount_estimate?: number;
  is_series: boolean;
  series_count?: number;

  space: string;
  layout: string;
  layout_custom?: string;
  support_level: string;
  tech: string[];
  mic_count?: number;
  own_equipment: boolean;
  own_equipment_detail?: string;

  catering: string;
  caterer_name?: string;
  alcohol: string;
  music: string;
  music_past_2200?: string;
  pyro_flame: string;
  pyro_flame_detail?: string;
  media: string[];

  cleaning: string;
  accessibility_notes?: string;
  budget_band: string;
  referral_source?: string;
  notes?: string;
}

export type FieldErrors = Partial<Record<keyof BookingPayload, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const has = (list: Option[], v: unknown) =>
  typeof v === 'string' && list.some((o) => o.value === v);

// "YYYY-MM-DDTHH:mm" as typed into a datetime-local field, read as
// Europe/Helsinki wall-clock time, to an ISO 8601 string with the correct
// offset (+02:00 or +03:00 depending on daylight saving). The event happens
// in Helsinki whatever time zone the visitor's laptop is set to.
export function helsinkiLocalToISO(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (instant: number) => {
    const part = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Helsinki',
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(instant))
      .find((p) => p.type === 'timeZoneName')?.value;
    const om = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ?? '');
    if (!om) return 0;
    const sign = om[1] === '-' ? -1 : 1;
    return sign * (Number(om[2]) * 60 + Number(om[3] ?? 0));
  };
  // Two passes, so a time close to a daylight-saving switch still lands on
  // the right offset.
  let offset = offsetAt(asUtc - offsetAt(asUtc) * 60000);
  offset = offsetAt(asUtc - offset * 60000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Monday to Friday between now and the event. Finnish public holidays are not
// subtracted, so this can overstate by a day or two around holidays. It only
// drives a warning, never a refusal.
export function workingDaysUntil(target: Date, now: Date): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  while (day < end) {
    day.setDate(day.getDate() + 1);
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// Lead times from the event info pack ("How booking works"): 5 working days
// for a simple booking, 14 days for anything with production or over 100
// guests. Returns the warning to show, or null.
export function shortNoticeWarning(
  p: Pick<BookingPayload, 'get_in' | 'headcount_band' | 'support_level' | 'own_equipment'>,
  now: Date,
): string | null {
  const start = new Date(p.get_in);
  if (Number.isNaN(start.getTime()) || start <= now) return null;
  const production =
    ['standard', 'premium', 'turnkey'].includes(p.support_level) ||
    p.own_equipment ||
    p.headcount_band === '101_199' ||
    p.headcount_band === '200_plus';
  const calendarDays = (start.getTime() - now.getTime()) / 86_400_000;
  if (workingDaysUntil(start, now) < 5) {
    return 'That is less than 5 working days away, which is our usual minimum. Send it anyway and we will tell you honestly whether it can work.';
  }
  if (production && calendarDays < 14) {
    return 'Events with production or more than 100 guests need 14 days. Send it anyway and we will tell you honestly whether it can work.';
  }
  return null;
}

// Every rule the form enforces. The Worker applies the same rules again,
// because nothing a browser sends can be trusted.
export function validateBooking(p: BookingPayload, now: Date = new Date()): FieldErrors {
  const e: FieldErrors = {};
  const req = (k: keyof BookingPayload, msg: string) => {
    const v = p[k];
    if (typeof v !== 'string' || v.trim() === '') e[k] = msg;
  };
  const maxLen = (k: keyof BookingPayload, n: number) => {
    const v = p[k];
    if (typeof v === 'string' && v.length > n) e[k] = `Keep this under ${n} characters.`;
  };
  const oneOf = (k: keyof BookingPayload, list: Option[], msg: string) => {
    if (!has(list, p[k])) e[k] = msg;
  };
  const intIn = (k: keyof BookingPayload, min: number, max: number, msg: string) => {
    const v = p[k];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) e[k] = msg;
  };

  req('contact_first_name', 'Tell us your first name.');
  req('contact_last_name', 'Tell us your last name.');
  req('contact_email', 'We need an email address to reply to.');
  if (!e.contact_email && !EMAIL_RE.test(p.contact_email.trim()))
    e.contact_email = 'That email address does not look right.';
  if (p.contact_phone && !/^[+()\d\s-]{5,30}$/.test(p.contact_phone.trim()))
    e.contact_phone = 'Use digits, spaces and an optional + only.';
  oneOf('org_type', ORG_TYPES, 'Pick the closest match.');
  if (typeof p.is_member !== 'boolean') e.is_member = 'Tell us whether you are a member.';
  if (p.is_member === true)
    oneOf('membership_tier', MEMBERSHIP_TIERS, 'Which membership do you have?');
  if (p.consent_privacy !== true)
    e.consent_privacy = 'We can only store your enquiry if you agree to this.';

  req('event_title', 'Give the event a working title. It can change later.');
  req('event_description', 'Tell us a little about what you are planning.');
  oneOf('event_type', EVENT_TYPES, 'Pick the closest type.');
  oneOf('event_visibility', EVENT_VISIBILITY, 'Is it public or private?');
  oneOf('event_access', EVENT_ACCESS, 'How do guests get in?');

  const getIn = new Date(p.get_in);
  const getOut = new Date(p.get_out);
  if (!p.get_in || Number.isNaN(getIn.getTime())) e.get_in = 'When do you need the space from?';
  else if (getIn <= now) e.get_in = 'Pick a time in the future.';
  if (!p.get_out || Number.isNaN(getOut.getTime()))
    e.get_out = 'When will you be out of the space?';
  else if (!e.get_in && getOut <= getIn) e.get_out = 'Get-out has to be after get-in.';
  else if (!e.get_in && getOut.getTime() - getIn.getTime() > 7 * 86_400_000)
    e.get_out = 'For more than a week, send the first day and tell us the rest in the notes.';

  for (const k of ['alt_date_1', 'alt_date_2'] as const) {
    const v = p[k];
    if (!v) continue;
    if (!DATE_RE.test(v) || Number.isNaN(new Date(v).getTime())) e[k] = 'Use a real date.';
    else if (new Date(`${v}T23:59:59`) < now) e[k] = 'Pick a date in the future.';
  }

  oneOf('headcount_band', HEADCOUNT_BANDS, 'Roughly how many people?');
  if (p.headcount_estimate !== undefined)
    intIn('headcount_estimate', 1, LIMITS.maxHeadcount, 'Use a whole number.');
  if (typeof p.is_series !== 'boolean') e.is_series = 'Is this a one-off or a series?';
  if (p.is_series === true)
    intIn('series_count', 2, LIMITS.maxSeries, 'How many events in the series? At least 2.');

  oneOf('space', SPACES, 'Pick a space, or ask us to advise.');
  oneOf('layout', LAYOUTS, 'Pick a layout, or say you are not sure.');
  if (p.layout === 'custom') req('layout_custom', 'Describe the layout you have in mind.');
  oneOf('support_level', SUPPORT_LEVELS, 'Pick a level of support, or ask us to advise.');
  if (!Array.isArray(p.tech) || !p.tech.every((t) => has(TECH, t))) e.tech = 'Unknown option.';
  if (p.tech?.includes('mics')) intIn('mic_count', 1, LIMITS.maxMics, 'How many microphones?');
  if (typeof p.own_equipment !== 'boolean')
    e.own_equipment = 'Tell us whether you are bringing equipment.';
  if (p.own_equipment === true) req('own_equipment_detail', 'Tell us what you are bringing in.');

  oneOf('catering', CATERING, 'Pick one.');
  if (p.catering === 'own_caterer') req('caterer_name', 'Who is the caterer?');
  oneOf('alcohol', ALCOHOL, 'Pick one.');
  oneOf('music', MUSIC, 'Pick one.');
  if (p.music && p.music !== 'none')
    oneOf('music_past_2200', YES_NO_NOT_SURE, 'Will music carry on past 22:00?');
  oneOf('pyro_flame', YES_NO_NOT_SURE, 'Pick one.');
  if (p.pyro_flame === 'yes') req('pyro_flame_detail', 'Tell us what you have in mind.');
  if (!Array.isArray(p.media) || !p.media.every((m) => has(MEDIA, m))) e.media = 'Unknown option.';

  oneOf('cleaning', CLEANING, 'Pick one.');
  oneOf('budget_band', BUDGET_BANDS, 'Pick a range, or say you would rather not.');

  for (const k of [
    'contact_first_name',
    'contact_last_name',
    'contact_email',
    'org_name',
    'event_title',
    'layout_custom',
    'caterer_name',
    'referral_source',
  ] as const)
    maxLen(k, LIMITS.short);
  for (const k of [
    'event_description',
    'own_equipment_detail',
    'pyro_flame_detail',
    'accessibility_notes',
    'notes',
  ] as const)
    maxLen(k, LIMITS.long);

  return e;
}
