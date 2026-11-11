// /oddspace/availability.json — which ODDspace rooms are booked, and when,
// read live from the public ODDspace Bookings Google Calendar.
//
// The calendar's ICS feed is public but carries every event's title and
// description, and Google sends it without CORS headers, so the browser
// cannot read it and must not: this route reduces the feed to room + time
// per Helsinki day, nothing else. Who booked, and for what, never leaves
// the Worker. The page's script (src/scripts/oddspace-availability.ts)
// only lays the result out as a month grid.
//
// Shape (v2, 2026-11-11):
//   { v: 2, generated_at: ISO instant, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD',
//     days:   { 'YYYY-MM-DD': [{ space: 'Galleria', time: '12:00–18:00' }] },
//     blocks: [{ start, end, rooms: ['gallery'], hold: false }] }
// `days` is for people: booked rooms only, a day missing from it is free,
// and an evening that runs past midnight lists on the next day as "until
// 04:00". It is unchanged from v1, so the month grid on /oddspace keeps
// working as it did.
// `blocks` is for code: the booking form's calendar and the forms API's
// assessment (odd-growth-os). One entry per event instance that touches
// the window, with Helsinki ISO times (offset included) and the booking
// form's room keys. `hold` is true for a "[TENTATIVE] …" title: someone
// has an offer on it, and a second customer may still ask. Still no
// titles, descriptions or people.

const CALENDAR_ID =
  'c_2b949751536a12e3c8dcbe7b3ffbdd82a49ffad8bebbbb3db05365ca725975f1@group.calendar.google.com';
export const ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
const TZ = 'Europe/Helsinki';
const MONTHS_AHEAD = 6;
const DAY = 86_400_000;

// What the calendar's `location` field says, in the order the words are
// tested: the first match names the room. The oddspace-booking skill writes
// "Teollisuuskatu 9D, Helsinki — <room>"; older entries vary, so this
// matches on the room's name wherever it sits. An event somewhere else
// (a pop-up at another venue) is not a room booking and is left out.
const ROOMS = [
  ['full space', 'Full space'],
  ['galleria + auditorio', 'Galleria + Auditorio'],
  ['galleria', 'Galleria'],
  ['auditorio', 'Auditorio'],
  ['aula', 'Aula'],
  ['2nd floor', '2nd floor'],
  ['co-work', '2nd floor'],
  ['lounge', '2nd floor'],
];
const HERE = ['teollisuuskatu', 'oddspace'];

// The same location text, read as the booking form's room keys
// (booking-enquiry-schema.ts: gallery, aula, auditorium, second_floor),
// plus two that are not form choices:
// - 'all': the whole space, or ODDspace with no recognisable room. It
//   blocks every room until someone writes the room into the event.
// - 'meeting_rooms': the 2nd-floor meeting rooms. Not bookable through the
//   form, so they never block a room it offers.
// Keep in step with odd-growth-os worker/src/booking (the calendar writer
// reads events with the same rules). Tested in order: whole space, meeting
// rooms, then every room named, so "Galleria + Auditorio" is two rooms.
// "Main office space (upstairs)" is the 2nd-floor Event & workshop space
// (one calendar event used it, Oct 2026; the info pack's 2nd floor is that
// open floor).
const ROOM_KEYS = [
  ['galleria', 'gallery'],
  ['gallery', 'gallery'],
  ['auditorio', 'auditorium'],
  ['auditorium', 'auditorium'],
  ['aula', 'aula'],
  ['2nd floor', 'second_floor'],
  ['co-work', 'second_floor'],
  ['lounge', 'second_floor'],
  ['main office', 'second_floor'],
];
const ROOM_ORDER = ['gallery', 'aula', 'auditorium', 'second_floor'];

export function roomsFor(location) {
  const loc = (location ?? '').toLowerCase();
  if (loc.includes('full space')) return ['all'];
  if (loc.includes('meeting room')) return ['meeting_rooms'];
  const found = new Set(ROOM_KEYS.filter(([word]) => loc.includes(word)).map(([, key]) => key));
  if (found.size) return ROOM_ORDER.filter((key) => found.has(key));
  if (!loc || HERE.some((w) => loc.includes(w))) return ['all'];
  return null;
}

export function spaceFor(location) {
  const loc = (location ?? '').toLowerCase();
  for (const [word, name] of ROOMS) if (loc.includes(word)) return name;
  if (!loc || HERE.some((w) => loc.includes(w))) return 'ODDspace';
  return null;
}

// --- time ---------------------------------------------------------------

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** Helsinki wall-clock parts of an instant. */
function local(ms) {
  const p = Object.fromEntries(partsFmt.formatToParts(ms).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** An instant as Helsinki ISO time with its offset: 2026-12-04T20:00:00+02:00. */
export function helsinkiIso(ms) {
  const l = local(ms);
  const wall = Date.UTC(
    Number(l.date.slice(0, 4)),
    Number(l.date.slice(5, 7)) - 1,
    Number(l.date.slice(8, 10)),
    Number(l.time.slice(0, 2)),
    Number(l.time.slice(3, 5)),
  );
  const offset = Math.round((wall - Math.floor(ms / 60_000) * 60_000) / 60_000);
  const sign = offset < 0 ? '-' : '+';
  const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${l.date}T${l.time}:00${sign}${hh}:${mm}`;
}

/** The instant at a Helsinki wall-clock time. */
export function helsinkiToUtc(y, mo, d, h = 0, mi = 0) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const l = local(guess);
  const asUtc = Date.UTC(
    Number(l.date.slice(0, 4)),
    Number(l.date.slice(5, 7)) - 1,
    Number(l.date.slice(8, 10)),
    Number(l.time.slice(0, 2)),
    Number(l.time.slice(3, 5)),
  );
  return guess - (asUtc - guess);
}

/** An ICS date or date-time value → [ms, allDay]. Floating = Helsinki. */
export function parseStamp(value, params = '') {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (h === undefined) return [helsinkiToUtc(+y, +mo, +d), true];
  if (z) return [Date.UTC(+y, +mo - 1, +d, +h, +mi), false];
  // TZID=Europe/Helsinki, or no TZID at all (X-WR-TIMEZONE is Helsinki).
  // ponytail: any other TZID is read as Helsinki too; add a zone table if
  // a foreign-zone event ever lands on this calendar.
  void params;
  return [helsinkiToUtc(+y, +mo, +d, +h, +mi), false];
}

// --- ICS ----------------------------------------------------------------

/** VEVENT blocks → [{ props: [[name, params, value]] }], lines unfolded. */
export function vevents(text) {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const out = [];
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0];
    const props = [];
    for (const line of body.split('\n')) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const [name, ...params] = line.slice(0, i).split(';');
      props.push([name.toUpperCase(), params.join(';'), line.slice(i + 1)]);
    }
    out.push(props);
  }
  return out;
}

const first = (props, name) => props.find(([n]) => n === name);

const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Every instance start (ms) of one VEVENT inside [from, to). */
function starts(props, start, from, to) {
  const rrule = first(props, 'RRULE')?.[2];
  if (!rrule) return start < to ? [start] : [];
  const rule = Object.fromEntries(rrule.split(';').map((kv) => kv.split('=')));
  // ponytail: WEEKLY (and DAILY as its degenerate case) is all this
  // calendar uses; a MONTHLY/YEARLY series shows only its first date.
  // Bring in rrule.js if the team ever books "every first Friday".
  if (rule.FREQ !== 'WEEKLY' && rule.FREQ !== 'DAILY') return [start];
  const stepDays = (rule.FREQ === 'DAILY' ? 1 : 7) * Number(rule.INTERVAL ?? 1);
  const until = rule.UNTIL ? parseStamp(rule.UNTIL)?.[0] : Infinity;
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  // Repeat on the Helsinki wall clock, not in UTC: a 09:00 Monday stays
  // 09:00 across the DST change.
  const l = local(start);
  const [y, mo, d] = l.date.split('-').map(Number);
  const [h, mi] = l.time.split(':').map(Number);
  const at = (dayOffset) => helsinkiToUtc(y, mo, d + dayOffset, h, mi);
  const startDow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const days = (
    rule.FREQ === 'WEEKLY' && rule.BYDAY
      ? rule.BYDAY.split(',').map((w) => BYDAY[w] ?? startDow)
      : [startDow]
  ).sort((a, b) => a - b);
  const out = [];
  for (let n = 0; at(n * stepDays) <= until && at(n * stepDays) < to; n++) {
    for (const dow of days) {
      const t = at(n * stepDays + ((dow - startDow + 7) % 7));
      if (t < start || t > until || t >= to || out.length >= count) continue;
      out.push(t);
    }
    if (out.length >= count) break;
  }
  return out.filter((t) => t >= from - 2 * DAY); // a booking may run into the window
}

/** The feed → { v, generated_at, from, to, days, blocks }. `now` is the instant the window opens from. */
export function availability(text, now = Date.now()) {
  const today = local(now).date;
  const [y, mo] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const from = helsinkiToUtc(y, mo, 1);
  const to = helsinkiToUtc(y, mo + MONTHS_AHEAD + 1, 1);
  const fromDay = local(from).date;
  const toDay = local(to - DAY).date;

  const events = vevents(text);
  // An overridden instance (RECURRENCE-ID) replaces the series' own; so
  // does an EXDATE. Keyed by UID + instance start.
  const skip = new Set();
  for (const props of events) {
    const uid = first(props, 'UID')?.[2];
    const rid = first(props, 'RECURRENCE-ID');
    if (rid) skip.add(`${uid}@${parseStamp(rid[2], rid[1])?.[0]}`);
    for (const [, params, value] of props.filter(([n]) => n === 'EXDATE'))
      for (const v of value.split(',')) skip.add(`${uid}@${parseStamp(v, params)?.[0]}`);
  }

  const days = {};
  const blocks = [];
  for (const props of events) {
    if (first(props, 'STATUS')?.[2] === 'CANCELLED') continue;
    const location = first(props, 'LOCATION')?.[2].replace(/\\,/g, ',');
    const space = spaceFor(location);
    if (!space) continue;
    const rooms = roomsFor(location) ?? ['all'];
    // Read for the flag only; the title itself never leaves this function.
    const hold = /^\s*\[tentative\]/i.test(first(props, 'SUMMARY')?.[2] ?? '');
    const dtstart = first(props, 'DTSTART');
    if (!dtstart) continue;
    const parsed = parseStamp(dtstart[2], dtstart[1]);
    if (!parsed) continue;
    const [start, allDay] = parsed;
    const dtend = first(props, 'DTEND');
    const end = dtend ? (parseStamp(dtend[2], dtend[1])?.[0] ?? start) : start + (allDay ? DAY : 0);
    const length = Math.max(end - start, 0);
    const uid = first(props, 'UID')?.[2];
    const isOverride = Boolean(first(props, 'RECURRENCE-ID'));
    for (const s of starts(props, start, from, to)) {
      if (!isOverride && skip.has(`${uid}@${s}`)) continue;
      const e = s + length;
      if (e <= from || s >= to) continue;
      blocks.push({ start: helsinkiIso(s), end: helsinkiIso(e), rooms, hold, _s: s, _e: e });
      // One line per Helsinki day the booking touches. The last minute,
      // not the end instant, decides the last day: a block ending at
      // midnight stays on its own day.
      const firstDay = local(s).date;
      const lastDay = local(Math.max(e - 60_000, s)).date;
      for (let day = firstDay; day <= lastDay; day = nextDay(day)) {
        if (day < fromDay || day > toDay) continue;
        let time;
        if (allDay) time = 'All day';
        else if (firstDay === lastDay) time = `${local(s).time}–${local(e).time}`;
        else if (day === firstDay) time = `from ${local(s).time}`;
        else if (day === lastDay) time = `until ${local(e).time}`;
        else time = 'All day';
        (days[day] ??= []).push({ space, time, _s: s });
      }
    }
  }
  for (const day of Object.keys(days)) {
    days[day].sort((a, b) => a._s - b._s);
    for (const row of days[day]) delete row._s;
  }
  blocks.sort((a, b) => a._s - b._s || a._e - b._e);
  for (const block of blocks) {
    delete block._s;
    delete block._e;
  }
  return {
    v: 2,
    generated_at: new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    from: fromDay,
    to: toDay,
    days,
    blocks,
  };
}

/** 'YYYY-MM-DD' → the day after, by calendar date (DST-proof). */
function nextDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

export async function handleAvailability() {
  let text;
  try {
    // ponytail: the edge caches the ICS for two minutes (ten before the
    // booking form read it, 2026-11-11), so the calendar is read at most
    // thirty times an hour however busy the page gets. Add caches.default
    // on this route's own response if that is ever too many.
    const res = await fetch(ICS_URL, { cf: { cacheTtl: 120, cacheEverything: true } });
    if (!res.ok) throw new Error(`calendar ${res.status}`);
    text = await res.text();
  } catch {
    return new Response(JSON.stringify({ error: 'calendar unavailable' }), {
      status: 502,
      headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
    });
  }
  return new Response(JSON.stringify(availability(text)), {
    headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=120' },
  });
}
