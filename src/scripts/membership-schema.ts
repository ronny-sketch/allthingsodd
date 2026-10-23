// The ODDspace membership form's rules (2026-10-21): which visit times it
// offers, and what each answer must be before it is sent.
//
// The Worker applies the same rules again in
// ../odd-growth-os/worker/src/membership/slots.ts and schema.ts. This copy is
// the UX; that one is the gate. There is no shared package (same arrangement
// as the booking and Creative Week schemas), so a change to one is made to
// the other in the same pull request, or the form offers a time the Worker
// refuses.
//
// What is asked depends on the visit (redesign of 2026-10-21,
// .design/membership-form): every path asks name, email, what they work on
// and a link to their work; a trial day also needs a phone number (the host
// lets them in); only "ready to join" is asked when to start, how they'd use
// the space, team, studio and how they heard.
//
// Times are Helsinki wall-clock times, whatever the visitor's laptop says:
//   viewing    weekdays, every half hour 10:00–16:30, at least 18 h ahead, 14 days
//   coffee     Mondays 09:00 (Coffee on the House), at least 12 h ahead, 28 days
//   trial day  weekdays from 10:00, at least 40 h ahead, 21 days
// Finnish public holidays are left out.

export { readOutcome, type Outcome } from './submission-outcome';

export const VISITS = [
  {
    value: 'viewing',
    label: 'A 30-minute look round',
    line: 'A weekday between 10:00 and 17:00. We show you round and answer your questions.',
  },
  {
    value: 'coffee',
    label: 'Monday coffee, 09:00',
    line: 'Coffee on the House: free coffee and a DJ, then a look round.',
  },
  {
    value: 'trial_day',
    label: 'A free trial day',
    line: 'Work here for a day. We meet you at 10:00 and let you in.',
  },
  {
    value: 'ready',
    label: "I'm ready to join",
    line: 'Skip the visit. We email you about a start date and the next steps.',
  },
] as const;
export type Visit = (typeof VISITS)[number]['value'];
export type SlotKind = Exclude<Visit, 'ready'>;

export const USES = [
  { value: 'most_weekdays', label: 'Most weekdays' },
  { value: 'few_days', label: 'A couple of days a week' },
  { value: 'now_and_then', label: 'Meeting rooms now and then' },
] as const;

export const STARTS = [
  { value: 'this_month', label: 'This month' },
  { value: 'next_month', label: 'Next month' },
  { value: 'later', label: 'Later this year' },
  { value: 'just_curious', label: 'Just curious' },
] as const;

/** "Just curious" is not a start date for someone ready to join. */
export const READY_STARTS = STARTS.filter((s) => s.value !== 'just_curious');

export const HEARD = [
  { value: 'member_friend', label: 'A member or friend' },
  { value: 'event_here', label: 'An event at ODDspace' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'search', label: 'Search' },
  { value: 'oddfest', label: 'ODDfest or ODDference' },
  { value: 'other', label: 'Somewhere else' },
] as const;

export const MAX_CHOICES = 3;
export const MAX_TEAM = 30;

const VIEWING_TIMES = Array.from({ length: 14 }, (_, i) => {
  const minutes = 10 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

const RULES: Record<
  SlotKind,
  { horizonDays: number; weekdays: number[]; times: string[]; minLeadHours: number }
> = {
  viewing: { horizonDays: 14, weekdays: [1, 2, 3, 4, 5], times: VIEWING_TIMES, minLeadHours: 18 },
  coffee: { horizonDays: 28, weekdays: [1], times: ['09:00'], minLeadHours: 12 },
  trial_day: { horizonDays: 21, weekdays: [1, 2, 3, 4, 5], times: ['10:00'], minLeadHours: 40 },
};

const HOLIDAYS = new Set([
  '2026-12-06',
  '2026-12-24',
  '2026-12-25',
  '2026-12-26',
  '2027-01-01',
  '2027-01-06',
  '2027-03-26',
  '2027-03-29',
  '2027-05-01',
  '2027-05-06',
  '2027-06-25',
  '2027-06-26',
]);

const DAY_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const part = (fmt: Intl.DateTimeFormat, d: Date, type: string) =>
  fmt.formatToParts(d).find((p) => p.type === type)?.value ?? '';

export const helsinkiDay = (d: Date) =>
  `${part(DAY_FMT, d, 'year')}-${part(DAY_FMT, d, 'month')}-${part(DAY_FMT, d, 'day')}`;
export const helsinkiTime = (d: Date) =>
  `${part(TIME_FMT, d, 'hour')}:${part(TIME_FMT, d, 'minute')}`;

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function isoWeekday(day: string): number {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** "2026-10-28T14:00:00+02:00": a Helsinki wall-clock time with its own offset. */
export function helsinkiSlot(day: string, time: string): string | null {
  for (const offset of ['+02:00', '+03:00']) {
    const iso = `${day}T${time}:00${offset}`;
    const d = new Date(iso);
    if (helsinkiDay(d) === day && helsinkiTime(d) === time) return iso;
  }
  return null;
}

/** Every slot of this kind the form offers now, earliest first. */
export function offeredSlots(kind: SlotKind, now: Date): string[] {
  const rule = RULES[kind];
  const earliest = now.getTime() + rule.minLeadHours * 3_600_000;
  const today = helsinkiDay(now);
  const out: string[] = [];
  for (let i = 0; i <= rule.horizonDays; i++) {
    const day = addDays(today, i);
    if (!rule.weekdays.includes(isoWeekday(day)) || HOLIDAYS.has(day)) continue;
    for (const time of rule.times) {
      const iso = helsinkiSlot(day, time);
      if (iso && new Date(iso).getTime() >= earliest) out.push(iso);
    }
  }
  return out;
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', weekday: 'short' });
const MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', month: 'short' });

/** "Wed 28 Oct": the day heading the time chips sit under. */
export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return `${WEEKDAY.format(d)} ${Number(helsinkiDay(d).slice(8, 10))} ${MONTH.format(d)}`;
};

export interface MembershipPayload {
  submission_id: string;
  locale: 'en' | 'fi';
  source: string;
  hp_field: string;
  name: string;
  email: string;
  phone?: string;
  works_on: string;
  link: string;
  /** use, team, team_size, studio, start and heard: "ready" only. */
  use?: string;
  team?: boolean;
  team_size?: number;
  studio?: boolean;
  start?: string;
  visit: Visit;
  times: string[];
  heard?: string;
  notes?: string;
  newsletter: boolean;
  consent_privacy: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// A web address as people type one: "instagram.com/x" counts. The Worker
// adds the https:// and checks it properly.
const LINK_RE = /^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i;
const PHONE_RE = /^[+()\d\s-]{5,30}$/;

/** Which of the three steps holds a field, for showing an error there. */
export type Step = 'visit' | 'second' | 'about';
export function stepOf(field: string): Step {
  if (field === 'visit') return 'visit';
  if (['times', 'start', 'use', 'team_size', 'studio'].includes(field)) return 'second';
  return 'about';
}

/** Every rule the form checks before sending, keyed by payload field like the Worker's errors. */
export function validateMembership(
  p: MembershipPayload,
  now: Date = new Date(),
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!p.name.trim()) errors.name = 'Tell us your name.';
  if (!p.email.trim()) errors.email = 'We need an email address to reply to.';
  else if (!EMAIL_RE.test(p.email.trim())) errors.email = 'That email address does not look right.';
  if (!p.works_on.trim()) errors.works_on = 'Tell us in a line what you work on.';
  if (!p.link.trim()) errors.link = 'Add a link to your work: a website, portfolio or Instagram.';
  else if (!LINK_RE.test(p.link.trim())) errors.link = "That doesn't look like a web address.";
  const phone = p.phone?.trim() ?? '';
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Use digits, spaces and an optional + only.';
  else if (!phone && p.visit === 'trial_day')
    errors.phone = 'We need a phone number for a trial day, so whoever lets you in can reach you.';
  if (p.visit === 'ready') {
    if (!p.start) errors.start = 'When would you like to start?';
    if (!p.use) errors.use = "Tell us roughly how you'd use the space.";
    if (
      p.team &&
      !(Number.isInteger(p.team_size) && p.team_size! >= 2 && p.team_size! <= MAX_TEAM)
    ) {
      errors.team_size = `How many of you? Between 2 and ${MAX_TEAM}.`;
    }
  }
  if (!p.visit) errors.visit = "Pick how you'd like to see it first.";
  else if (p.visit !== 'ready') {
    if (p.times.length === 0)
      errors.times = p.visit === 'trial_day' ? 'Pick at least one day.' : 'Pick at least one time.';
    else if (p.times.length > MAX_CHOICES) errors.times = `Pick up to ${MAX_CHOICES}.`;
    else {
      const offered = new Set(offeredSlots(p.visit, now));
      if (p.times.some((t) => !offered.has(t)))
        errors.times = 'One of those times is no longer available. Please pick again.';
    }
  }
  if (!p.consent_privacy)
    errors.consent_privacy = 'We can only keep your request if you agree to this.';
  return errors;
}
