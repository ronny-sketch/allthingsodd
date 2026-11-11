// Live availability for the booking form (calendar-availability plan, Stage
// 2, 2026-11-11). Reads the `blocks` of /oddspace/availability.json (feed
// v2, worker/availability.js) and answers three questions for the rooms the
// visitor has ticked: what state is each day in, which start hours are
// taken, and does the chosen time clash with anything.
//
// The clash rule is ODD's, decided by Fernando on 10 Nov 2026:
// - Rooms are the form's keys (gallery, aula, auditorium, second_floor). A
//   block can also be `all` (the whole space, or a calendar event with no
//   recognisable room) or `meeting_rooms` (never clashes with anything the
//   form offers).
// - The Gallery and the Aula are separate rooms: one does not block the
//   other.
// - Two events in the same room need an hour between them (BUFFER_MINUTES).
// - A `[TENTATIVE]` event is a hold: someone has an offer. The form shows it
//   as "On hold" and still lets a second visitor ask; only a firm booking
//   refuses the hours.
// - "Not sure yet" never clashes; it only shows what is booked.
//
// Keep in step with odd-growth-os worker/src/booking (the assessment and the
// calendar writer apply the same rule to the same feed). The form warns and
// blocks; the Worker has the last word when it writes to the calendar.
//
// Pure functions only: no DOM, no fetch. booking-enquiry-form.ts draws the
// calendar; tests/functional/booking-calendar.spec.ts covers both.
import { helsinkiLocalToISO } from './booking-enquiry-schema';

export const BUFFER_MINUTES = 60;
/** The hours a day is judged on: "booked" means nothing free from 08:00 to 23:00. */
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 23;
/** Refetch the feed when it is older than this (it is cached two minutes at the edge). */
export const MAX_AGE_MS = 2 * 60_000;

const BUFFER_MS = BUFFER_MINUTES * 60_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface Block {
  /** Instants, ms. */
  s: number;
  e: number;
  rooms: string[];
  hold: boolean;
}
export interface Feed {
  from: string;
  to: string;
  blocks: Block[];
}

/** The feed, or null when it is not a v2 feed: unknown is never shown as free. */
export function parseFeed(raw: unknown): Feed | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (f.v !== 2 || typeof f.from !== 'string' || typeof f.to !== 'string') return null;
  if (!DATE_RE.test(f.from) || !DATE_RE.test(f.to) || !Array.isArray(f.blocks)) return null;
  const blocks: Block[] = [];
  for (const b of f.blocks as unknown[]) {
    if (!b || typeof b !== 'object') return null;
    const { start, end, rooms, hold } = b as Record<string, unknown>;
    const s = typeof start === 'string' ? Date.parse(start) : NaN;
    const e = typeof end === 'string' ? Date.parse(end) : NaN;
    if (!(s <= e) || !Array.isArray(rooms) || typeof hold !== 'boolean') return null;
    if (!rooms.every((r) => typeof r === 'string')) return null;
    blocks.push({ s, e, rooms: rooms as string[], hold });
  }
  return { from: f.from, to: f.to, blocks };
}

// --- Helsinki calendar ------------------------------------------------------

/** 'YYYY-MM-DD' plus n days, by calendar date. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The instant at a Helsinki wall-clock hour of a date (24 = the next midnight). */
export function at(date: string, hour: number): number {
  const day = hour >= 24 ? addDays(date, 1) : date;
  const h = hour >= 24 ? hour - 24 : hour;
  return Date.parse(helsinkiLocalToISO(`${day}T${String(h).padStart(2, '0')}:00`) ?? '');
}

const PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
function parts(ms: number) {
  const p = Object.fromEntries(PARTS.formatToParts(ms).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export const helsinkiDate = (ms: number) => parts(ms).date;
export const helsinkiClock = (ms: number) => parts(ms).time;

// --- The clash rule ---------------------------------------------------------

/** The rooms that can clash: "Not sure yet" (advise_me) is not a room. */
export const realRooms = (rooms: string[]) => rooms.filter((r) => r !== 'advise_me');

const sharesRoom = (b: Block, rooms: string[]) =>
  b.rooms.includes('all') || b.rooms.some((r) => rooms.includes(r));

/** A block's reach, with the hour kept free on either side. */
const reach = (b: Block) => ({ s: b.s - BUFFER_MS, e: b.e + BUFFER_MS });

/** Blocks the request [startMs, endMs) runs into, for these rooms. */
export function clashes(
  feed: Feed,
  startMs: number,
  endMs: number,
  rooms: string[],
): { firm: Block[]; hold: Block[] } {
  const q = realRooms(rooms);
  const firm: Block[] = [];
  const hold: Block[] = [];
  if (q.length === 0) return { firm, hold };
  for (const b of feed.blocks) {
    const r = reach(b);
    if (startMs < r.e && r.s < endMs && sharesRoom(b, q)) (b.hold ? hold : firm).push(b);
  }
  return { firm, hold };
}

export type DayState = 'free' | 'hold' | 'partly' | 'booked' | 'some' | 'unknown';

/** Inside the feed's window, so the calendar actually knows. */
export const known = (feed: Feed, date: string) => date >= feed.from && date <= feed.to;

/**
 * One day, for these rooms, judged on the hours people book (08:00–23:00).
 * "partly": firm bookings, but at least one whole hour free in those hours.
 * "booked": none. "hold": only holds. "some": the visitor has not chosen a
 * room, and something is on in those hours. "unknown": past the feed's
 * window, checked by hand.
 *
 * Only the label is judged on 08:00–23:00 (design review, 11 Nov 2026): a
 * club night ending at 04:00, or the hour kept free before a booking that
 * starts at midnight, no longer marks a day that is free all day. The day
 * panel still lists those hours, and startTaken() and outcome() still refuse
 * them, so nothing that clashes gets through.
 */
export function dayState(feed: Feed, date: string, rooms: string[]): DayState {
  if (!known(feed, date)) return 'unknown';
  const o0 = at(date, OPEN_HOUR);
  const o1 = at(date, CLOSE_HOUR);
  const q = realRooms(rooms);
  if (q.length === 0) {
    const any = feed.blocks.some(
      (b) => b.s < o1 && o0 < b.e && !(b.rooms.length === 1 && b.rooms[0] === 'meeting_rooms'),
    );
    return any ? 'some' : 'free';
  }
  const { firm, hold } = clashes(feed, o0, o1, q);
  if (firm.length === 0) return hold.length ? 'hold' : 'free';
  const only = { ...feed, blocks: firm };
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    if (clashes(only, at(date, h), at(date, h + 1), q).firm.length === 0) return 'partly';
  }
  return 'booked';
}

/** Starting at this hour would put the event inside a firm booking (with its gap). */
export function startTaken(feed: Feed, date: string, hour: number, rooms: string[]): boolean {
  const q = realRooms(rooms);
  if (q.length === 0 || !known(feed, date)) return false;
  const t = at(date, hour);
  return feed.blocks.some((b) => {
    if (b.hold || !sharesRoom(b, q)) return false;
    const r = reach(b);
    return r.s <= t && t < r.e;
  });
}

export interface DayLine {
  rooms: string[];
  hold: boolean;
  /** Helsinki "HH:MM" with the gap applied, or null where it runs past the day. */
  from: string | null;
  until: string | null;
}

/**
 * What is taken on a day, in the order it happens: for the chosen rooms, or
 * every room when none is chosen. Times include the hour kept between
 * events, because that is what the visitor cannot have. Periods for the same
 * rooms that overlap or touch once those hours are added read as one line
 * ("booked from 13:00", not "13:00–19:00" and "from 17:00").
 */
export function dayLines(feed: Feed, date: string, rooms: string[]): DayLine[] {
  if (!known(feed, date)) return [];
  const d0 = at(date, 0);
  const d1 = at(date, 24);
  const q = realRooms(rooms);
  const spans: { rooms: string[]; hold: boolean; s: number; e: number }[] = [];
  for (const b of [...feed.blocks].sort((a, z) => a.s - z.s)) {
    const r = reach(b);
    if (!(r.s < d1 && d0 < r.e)) continue;
    let shown: string[];
    if (q.length === 0) {
      shown = b.rooms.filter((x) => x !== 'meeting_rooms');
      if (shown.length === 0) continue;
    } else if (b.rooms.includes('all')) {
      shown = ['all'];
    } else {
      shown = b.rooms.filter((x) => q.includes(x));
      if (shown.length === 0) continue;
    }
    const key = shown.join('+');
    const same = spans.find((x) => x.hold === b.hold && x.rooms.join('+') === key && r.s <= x.e);
    if (same) same.e = Math.max(same.e, r.e);
    else spans.push({ rooms: shown, hold: b.hold, s: r.s, e: r.e });
  }
  return spans.map((x) => ({
    rooms: x.rooms,
    hold: x.hold,
    from: x.s <= d0 ? null : helsinkiClock(x.s),
    until: x.e >= d1 ? null : helsinkiClock(x.e),
  }));
}

export type Outcome = 'free' | 'hold' | 'firm' | 'unknown' | 'unchecked';

/**
 * The visitor's whole time, against the feed. "unknown": it runs past the
 * feed's window. "unchecked": no room chosen ("Not sure yet").
 */
export function outcome(
  feed: Feed,
  startMs: number,
  endMs: number,
  rooms: string[],
): { kind: Outcome; firstFirm?: Block } {
  if (realRooms(rooms).length === 0) return { kind: 'unchecked' };
  if (
    !known(feed, helsinkiDate(startMs)) ||
    !known(feed, helsinkiDate(Math.max(startMs, endMs - 1)))
  )
    return { kind: 'unknown' };
  const { firm, hold } = clashes(feed, startMs, endMs, rooms);
  if (firm.length) return { kind: 'firm', firstFirm: firm.sort((a, z) => a.s - z.s)[0] };
  return { kind: hold.length ? 'hold' : 'free' };
}
