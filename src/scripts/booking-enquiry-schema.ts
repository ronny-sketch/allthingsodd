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

// "Who can come?" is one question in the form and two fields in the payload
// (event_visibility + event_access), because the spec's two questions
// overlap: a private event is an invited one, and "invite only" is never
// public. Each answer below maps to exactly one pair.
export const AUDIENCE = [
  { value: 'public_free', label: 'Anyone, free', visibility: 'public', access: 'free' },
  {
    value: 'public_ticketed',
    label: 'Anyone, with a ticket',
    visibility: 'public',
    access: 'ticketed',
  },
  { value: 'private', label: 'Invited guests only', visibility: 'private', access: 'invite_only' },
] as const;

export const HEADCOUNT_BANDS = opts([
  ['upto_50', 'Up to 50'],
  ['51_100', '51–100'],
  ['101_199', '101–199'],
  ['200_plus', '200 or more'],
]);

// The form asks for a number and derives the spec's band from it.
export function headcountBand(n: number): (typeof HEADCOUNT_BANDS)[number]['value'] {
  if (n <= 50) return 'upto_50';
  if (n <= 100) return '51_100';
  if (n < 200) return '101_199';
  return '200_plus';
}

export const SPACES = opts([
  ['gallery', 'Gallery'],
  ['aula', 'Aula'],
  ['auditorium', 'Auditorium'],
  ['second_floor', '2nd-floor co-creation space'],
  ['gallery_aula', 'Gallery + Aula'],
  ['auditorium_aula', 'Auditorium + Aula'],
  ['full_triangle', 'Gallery, Aula and Auditorium'],
  ['advise_me', 'Not sure yet'],
]);

// What the space picker says about each room (2026-09-24). Every figure and
// description is taken from the event info pack
// (src/content/pages/oddspace-event-info-pack.json), never estimated.
// `capacity` is the most people inside at once, counting guests, crew and
// performers. For a combination it is the sum of the rooms, because the pack
// says "capacities add up", and the pack also says the combined limits are
// still being confirmed, which is why the combinations show their parts
// rather than a total. tests/functional/booking-enquiry.spec.ts fails if the
// pack stops saying these numbers, so the two cannot drift apart quietly.
export interface SpaceInfo {
  capacity?: number;
  /** Shown under the room name. */
  meta: string;
  blurb: string;
  /** The room's seating cannot be rearranged (the Auditorium's tiers). */
  fixedSeating?: boolean;
}
export const SPACE_INFO: Record<(typeof SPACES)[number]['value'], SpaceInfo> = {
  gallery: {
    capacity: 150,
    meta: '150 people · 320 m²',
    blurb: 'The big room at street level. Openings, launches, concerts, club nights.',
  },
  aula: {
    capacity: 30,
    meta: '30 people',
    blurb: 'Where guests arrive: registration, coats, drinks. Rarely booked on its own.',
  },
  auditorium: {
    capacity: 50,
    meta: '50 seated · fixed tiers',
    blurb: 'Tiered seating, a large screen and sound. Talks, panels, screenings.',
    fixedSeating: true,
  },
  second_floor: {
    capacity: 150,
    meta: '150 people',
    blurb: 'One floor up. Seminars, workshops, away-days and dinners.',
  },
  gallery_aula: {
    capacity: 180,
    meta: '150 + 30 people',
    blurb: 'The Gallery, with the Aula for arrivals and drinks.',
  },
  auditorium_aula: {
    capacity: 80,
    meta: '50 seated + 30 people',
    blurb: 'A talk in the Auditorium, with the Aula for arrivals and drinks.',
    fixedSeating: true,
  },
  full_triangle: {
    capacity: 230,
    meta: '230 people together',
    blurb: 'All three rooms, for a programme that moves between them.',
  },
  advise_me: {
    meta: 'We suggest one',
    blurb: 'Tell us about the event and we will suggest the room that fits.',
  },
};

// Spaces whose seating is fixed. For these the form sends layout "theatre"
// (rows facing the front, which is what tiered seating is) and does not ask.
export const FIXED_SEATING_SPACES = (Object.keys(SPACE_INFO) as (keyof typeof SPACE_INFO)[]).filter(
  (k) => SPACE_INFO[k].fixedSeating,
);

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
  ['basic_infra', 'Basic infrastructure'],
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
  ['livestream', 'Livestream kit'],
  ['recording', 'Recording kit'],
]);

// Every item is offered, the PA included (2026-09-24). The info pack puts
// the PA and one microphone in every booking, so ticking them costs nothing,
// but it tells ODD what to have set up and tested on the day.
export const TECH_OFFERED = TECH;

// Times are picked, never typed, in quarter hours: "14:42" is not a booking
// time. 00:00 to 23:45, as HH:MM strings the datetime helpers already take.
export const QUARTER_HOURS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

export const CATERING = opts([
  ['none', 'None'],
  ['own_food', 'Our own food'],
  ['own_caterer', 'Our own caterer'],
  ['coffee_service', 'Coffee service'],
  ['odd_coordinates', 'ODD arranges it'],
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
  layout?: string;
  layout_custom?: string;
  support_level: string;
  tech: string[];
  mic_count?: number;
  own_equipment: boolean;
  own_equipment_detail?: string;

  catering?: string;
  caterer_name?: string;
  alcohol: string;
  music: string;
  music_past_2200?: string;
  pyro_flame: string;
  pyro_flame_detail?: string;
  media: string[];

  cleaning?: string;
  accessibility_notes?: string;
  budget_band?: string;
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

// A soft warning when the headcount is more than the chosen space holds. It
// never blocks the enquiry: ODD may suggest a different room, and the pack
// says the combined limits are still being confirmed.
export function capacityWarning(space: string, people: number | undefined): string | null {
  if (!people || !(space in SPACE_INFO)) return null;
  const info = SPACE_INFO[space as keyof typeof SPACE_INFO];
  if (!info.capacity || people <= info.capacity) return null;
  const name = SPACES.find((s) => s.value === space)?.label ?? 'That space';
  if (space === 'auditorium') {
    return `The Auditorium seats 50, and its seating is fixed. For ${people} people the Gallery or the 2nd-floor space may suit better. Send it anyway and we will suggest what fits.`;
  }
  const combined = ['gallery_aula', 'auditorium_aula', 'full_triangle'].includes(space);
  const limit = combined
    ? `${name} together take about ${info.capacity} people, and the building is still confirming the combined limit.`
    : `The ${name} holds ${info.capacity} people at once.`;
  return `${limit} Send it anyway and we will suggest what fits ${people}.`;
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
  else if (!e.get_in && getOut <= getIn) e.get_out = 'The end has to be after the start.';
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
  // Layout, catering, cleaning, music after 22:00 and budget are optional
  // (2026-09-24): none of them changes the quote, so they are settled after
  // the booking is confirmed. The Worker applies the same rule. A value that
  // is sent is still checked.
  if (p.layout) oneOf('layout', LAYOUTS, 'Pick a layout, or say you are not sure.');
  if (p.layout === 'custom') req('layout_custom', 'Describe the layout you have in mind.');
  oneOf('support_level', SUPPORT_LEVELS, 'Pick a level of support, or ask us to advise.');
  if (!Array.isArray(p.tech) || !p.tech.every((t) => has(TECH, t))) e.tech = 'Unknown option.';
  if (p.tech?.includes('mics')) intIn('mic_count', 1, LIMITS.maxMics, 'How many microphones?');
  if (typeof p.own_equipment !== 'boolean')
    e.own_equipment = 'Tell us whether you are bringing equipment.';
  if (p.own_equipment === true) req('own_equipment_detail', 'Tell us what you are bringing in.');

  if (p.catering) oneOf('catering', CATERING, 'Tell us about food and drink.');
  if (p.catering === 'own_caterer') req('caterer_name', 'Who is the caterer?');
  oneOf('alcohol', ALCOHOL, 'Will there be alcohol?');
  oneOf('music', MUSIC, 'Will there be music?');
  if (p.music && p.music !== 'none' && p.music_past_2200)
    oneOf('music_past_2200', YES_NO_NOT_SURE, 'Will music carry on past 22:00?');
  oneOf('pyro_flame', YES_NO_NOT_SURE, 'Tell us about smoke, haze or flame.');
  if (p.pyro_flame === 'yes')
    req('pyro_flame_detail', 'Tell us what you have in mind, so we can say what is possible.');
  if (!Array.isArray(p.media) || !p.media.every((m) => has(MEDIA, m))) e.media = 'Unknown option.';

  if (p.cleaning) oneOf('cleaning', CLEANING, 'Who cleans up afterwards?');
  if (p.budget_band)
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
