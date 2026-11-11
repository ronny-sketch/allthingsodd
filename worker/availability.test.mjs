// node --test worker/availability.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availability, helsinkiIso, helsinkiToUtc, roomsFor, spaceFor } from './availability.js';

// Thu 22 Oct 2026, 12:00 Helsinki: the window is Oct 2026 – Apr 2027.
const NOW = helsinkiToUtc(2026, 10, 22, 12, 0);

const ICS = `BEGIN:VCALENDAR
X-WR-TIMEZONE:Europe/Helsinki
BEGIN:VEVENT
DTSTART:20261031T180000Z
DTEND:20261101T020000Z
UID:halloween
SUMMARY:ODDgallery Halloween
LOCATION:Teollisuuskatu 9D\\, Helsinki — Galleria
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTSTART:20261031T100000Z
DTEND:20261031T160000Z
UID:sale
SUMMARY:Sample sale
LOCATION:Teollisuuskatu 9D\\, Helsinki — Aula
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20260907T090000
DTEND;TZID=Europe/Helsinki:20260907T100000
RRULE:FREQ=WEEKLY;BYDAY=MO
EXDATE;TZID=Europe/Helsinki:20261019T090000
UID:coffee
SUMMARY:Coffee on the House
LOCATION:ODDspace aula entrance\\, Teollisuuskatu 9D
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20261005T090000
DTEND;TZID=Europe/Helsinki:20261005T100000
RECURRENCE-ID;TZID=Europe/Helsinki:20261005T090000
UID:coffee
SUMMARY:Coffee on the House @ Roots
LOCATION:Roots Helsinki\\, Eurantie 8\\, 00550 Helsinki
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261116
DTEND;VALUE=DATE:20261118
UID:summit
SUMMARY:Private Event: GovTech Summit
LOCATION:Teollisuuskatu 9D\\, Helsinki — Full space (Galleria + 2nd floor co-wo
 rk)
END:VEVENT
BEGIN:VEVENT
DTSTART:20261029T170000Z
DTEND:20261029T220000Z
UID:noroom
SUMMARY:Halloween Perfume Club
END:VEVENT
BEGIN:VEVENT
DTSTART:20261023T160000Z
DTEND:20261023T210000Z
UID:cancelled
SUMMARY:dinner
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
DTSTART:20260926T090000Z
DTEND:20260926T120000Z
UID:past
SUMMARY:ONE DAY CHOIR
LOCATION:Teollisuuskatu 9D\\, Helsinki — Galleria
END:VEVENT
BEGIN:VEVENT
DTSTART:20270526T090000Z
DTEND:20270526T120000Z
UID:far
SUMMARY:Exhibition
LOCATION:Teollisuuskatu 9D\\, Helsinki — Galleria
END:VEVENT
END:VCALENDAR
`;

test('names the room from the location, and nothing else', () => {
  assert.equal(spaceFor('Teollisuuskatu 9D, Helsinki — Galleria'), 'Galleria');
  assert.equal(spaceFor('Teollisuuskatu 9D, Helsinki — 2nd floor co-work / lounge'), '2nd floor');
  assert.equal(spaceFor('ODDspace, Teollisuuskatu 9D, 00510 Helsinki'), 'ODDspace');
  assert.equal(spaceFor(undefined), 'ODDspace');
  assert.equal(spaceFor('Roots Helsinki, Eurantie 8, 00550 Helsinki'), null);
});

test('Helsinki wall clock → instant, either side of the DST change', () => {
  assert.equal(helsinkiToUtc(2026, 10, 24, 12, 0), Date.UTC(2026, 9, 24, 9, 0)); // UTC+3
  assert.equal(helsinkiToUtc(2026, 10, 26, 12, 0), Date.UTC(2026, 9, 26, 10, 0)); // UTC+2
});

test('the feed becomes room + time per Helsinki day, titles dropped', () => {
  const { from, to, days } = availability(ICS, NOW);
  assert.equal(from, '2026-10-01');
  assert.equal(to, '2027-04-30');
  assert.ok(!JSON.stringify(days).includes('Halloween'));

  // Two rooms on the 31st, in time order; the party runs on into the 1st.
  assert.deepEqual(days['2026-10-31'], [
    { space: 'Aula', time: '12:00–18:00' },
    { space: 'Galleria', time: 'from 20:00' },
  ]);
  assert.deepEqual(days['2026-11-01'], [{ space: 'Galleria', time: 'until 04:00' }]);

  // Weekly Mondays: expanded on the Helsinki clock (still 09:00 after the
  // DST change), the EXDATE Monday gone, the moved-to-Roots Monday gone
  // too (the override is off-site), the rest present.
  assert.deepEqual(days['2026-10-12'], [{ space: 'Aula', time: '09:00–10:00' }]);
  assert.deepEqual(days['2026-10-26'], [{ space: 'Aula', time: '09:00–10:00' }]);
  assert.equal(days['2026-10-19'], undefined);
  assert.equal(days['2026-10-05'], undefined);
  assert.deepEqual(days['2027-04-26'], [{ space: 'Aula', time: '09:00–10:00' }]);

  // All-day over two days (DTEND exclusive), the room read off a folded line;
  // the Monday coffee sits after it, in time order.
  assert.deepEqual(days['2026-11-16'], [
    { space: 'Full space', time: 'All day' },
    { space: 'Aula', time: '09:00–10:00' },
  ]);
  assert.deepEqual(days['2026-11-17'], [{ space: 'Full space', time: 'All day' }]);
  assert.equal(days['2026-11-18'], undefined);

  // No location = somewhere in ODDspace; cancelled = free.
  assert.deepEqual(days['2026-10-29'], [{ space: 'ODDspace', time: '19:00–00:00' }]);
  assert.equal(days['2026-10-23'], undefined);

  // Outside the window.
  assert.equal(days['2026-09-26'], undefined);
  assert.equal(days['2027-05-26'], undefined);
});

// --- v2: blocks (2026-11-11) ---------------------------------------------

test('reads the room keys the booking form uses, from every location the calendar has used', () => {
  const cases = [
    ['Teollisuuskatu 9D, Helsinki — Galleria', ['gallery']],
    ['Teollisuuskatu 9D - Galleria', ['gallery']],
    ['Galleria, ODDspace', ['gallery']],
    ['Teollisuuskatu 9D, Helsinki — Auditorio', ['auditorium']],
    ['Teollisuuskatu 9D, Helsinki — Aula', ['aula']],
    ['ODDspace aula entrance, Teollisuuskatu 9D', ['aula']],
    ['Teollisuuskatu 9D, Helsinki — 2nd floor co-work / lounge', ['second_floor']],
    ['Teollisuuskatu 9D, Helsinki — 2nd floor co-work/lounge', ['second_floor']],
    ['2nd floor, ODDspace', ['second_floor']],
    [
      'ODDspace, Teollisuuskatu 9D, Helsinki — 2nd floor main office space (upstairs)',
      ['second_floor'],
    ],
    ['Teollisuuskatu 9D, Helsinki — 2nd floor meeting rooms (2)', ['meeting_rooms']],
    ['Teollisuuskatu 9D, Helsinki — Galleria + Auditorio', ['gallery', 'auditorium']],
    ['Teollisuuskatu 9D, Helsinki — Auditorio + Galleria', ['gallery', 'auditorium']],
    [
      'Teollisuuskatu 9D, Helsinki — Full space (Galleria + 2nd floor co-work / lounge + Auditorio)',
      ['all'],
    ],
    ['Teollisuuskatu 9D, Helsinki — ODDspace', ['all']],
    ['ODDspace, Teollisuuskatu 9D, 00510 Helsinki, Finland', ['all']],
    ['Teollisuuskatu 9D, Helsinki (meeting point)', ['all']],
    ['', ['all']],
    [undefined, ['all']],
    ['Roots Helsinki, Eurantie 8, 00550 Helsinki', null],
    ['flät no 14, Viides linja 14, 00530 Helsinki', null],
  ];
  for (const [location, rooms] of cases)
    assert.deepEqual(roomsFor(location), rooms, String(location));
});

test('Helsinki ISO times carry the offset of their own date', () => {
  assert.equal(helsinkiIso(Date.UTC(2026, 9, 24, 9, 0)), '2026-10-24T12:00:00+03:00');
  assert.equal(helsinkiIso(Date.UTC(2026, 9, 26, 10, 0)), '2026-10-26T12:00:00+02:00');
  assert.equal(helsinkiIso(Date.UTC(2026, 11, 31, 22, 0)), '2027-01-01T00:00:00+02:00');
});

test('v2 adds a version, a timestamp and blocks, and keeps days as they were', () => {
  const feed = availability(ICS, NOW);
  assert.equal(feed.v, 2);
  assert.equal(feed.generated_at, '2026-10-22T09:00:00Z');
  assert.deepEqual(Object.keys(feed), ['v', 'generated_at', 'from', 'to', 'days', 'blocks']);
  const find = (start) => feed.blocks.filter((b) => b.start === start);

  // A party past midnight is one block, with its real end.
  assert.deepEqual(find('2026-10-31T20:00:00+02:00'), [
    {
      start: '2026-10-31T20:00:00+02:00',
      end: '2026-11-01T04:00:00+02:00',
      rooms: ['gallery'],
      hold: false,
    },
  ]);
  // All day over two days: midnight to midnight, Helsinki; the whole space.
  assert.deepEqual(find('2026-11-16T00:00:00+02:00'), [
    {
      start: '2026-11-16T00:00:00+02:00',
      end: '2026-11-18T00:00:00+02:00',
      rooms: ['all'],
      hold: false,
    },
  ]);
  // No location at all blocks every room.
  assert.deepEqual(find('2026-10-29T19:00:00+02:00')[0].rooms, ['all']);
  // Weekly coffee in the aula entrance, either side of the DST change.
  assert.equal(find('2026-10-12T09:00:00+03:00')[0].end, '2026-10-12T10:00:00+03:00');
  assert.equal(find('2026-10-26T09:00:00+02:00')[0].rooms[0], 'aula');
  // Gone: the EXDATE Monday, the Monday moved to Roots, cancelled, past, too far.
  assert.equal(find('2026-10-19T09:00:00+03:00').length, 0);
  assert.equal(find('2026-10-05T09:00:00+03:00').length, 0);
  assert.equal(feed.blocks.filter((b) => b.start.startsWith('2026-10-23')).length, 0);
  assert.equal(feed.blocks.filter((b) => b.start.startsWith('2026-09')).length, 0);
  assert.equal(feed.blocks.filter((b) => b.start.startsWith('2027-05')).length, 0);
  // Sorted by start.
  const starts = feed.blocks.map((b) => Date.parse(b.start));
  assert.deepEqual(
    starts,
    [...starts].sort((a, b) => a - b),
  );
});

const ICS_V2 = `BEGIN:VCALENDAR
X-WR-TIMEZONE:Europe/Helsinki
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20261204T160000
DTEND;TZID=Europe/Helsinki:20261204T220000
UID:hold
SUMMARY:[TENTATIVE] Maija Meikäläinen birthday
DESCRIPTION:Contact maija@example.com\, +358 40 123 4567
ORGANIZER;CN=Pekka Organiser:mailto:pekka@example.com
ATTENDEE;CN=Liisa Guest:mailto:liisa@example.com
LOCATION:Teollisuuskatu 9D\, Helsinki — Galleria + Auditorio
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20261205T100000
DTEND;TZID=Europe/Helsinki:20261205T120000
UID:tentative-lower
SUMMARY: [Tentative] Board meeting
LOCATION:Teollisuuskatu 9D\, Helsinki — 2nd floor meeting rooms (2)
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20261205T200000
DTEND;TZID=Europe/Helsinki:20261206T030000
UID:late
SUMMARY:Tentative plans for a club night
LOCATION:Teollisuuskatu 9D\, Helsinki — Aula
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20261206T090000
DTEND;TZID=Europe/Helsinki:20261206T110000
UID:elsewhere
SUMMARY:Pop-up somewhere else
LOCATION:Roots Helsinki\, Eurantie 8\, 00550 Helsinki
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Helsinki:20260930T180000
DTEND;TZID=Europe/Helsinki:20261001T020000
UID:into-window
SUMMARY:Runs into the window
LOCATION:Teollisuuskatu 9D\, Helsinki — Galleria
END:VEVENT
END:VCALENDAR
`;

test('holds, combined rooms, meeting rooms, other venues, and a booking that runs into the window', () => {
  const { blocks } = availability(ICS_V2, NOW);
  assert.deepEqual(blocks, [
    // Starts the day before the window opens; still blocks the 1st.
    {
      start: '2026-09-30T18:00:00+03:00',
      end: '2026-10-01T02:00:00+03:00',
      rooms: ['gallery'],
      hold: false,
    },
    {
      start: '2026-12-04T16:00:00+02:00',
      end: '2026-12-04T22:00:00+02:00',
      rooms: ['gallery', 'auditorium'],
      hold: true,
    },
    {
      start: '2026-12-05T10:00:00+02:00',
      end: '2026-12-05T12:00:00+02:00',
      rooms: ['meeting_rooms'],
      hold: true,
    },
    // "Tentative" inside a title is not a hold; only the [TENTATIVE] prefix is.
    {
      start: '2026-12-05T20:00:00+02:00',
      end: '2026-12-06T03:00:00+02:00',
      rooms: ['aula'],
      hold: false,
    },
  ]);
});

test('no title, description, organiser, attendee or contact detail leaves the Worker', () => {
  const out = JSON.stringify(availability(ICS_V2, NOW)) + JSON.stringify(availability(ICS, NOW));
  for (const secret of [
    'Maija',
    'Meikäläinen',
    'birthday',
    'maija@example.com',
    '358',
    'Pekka',
    'pekka@',
    'Liisa',
    'Board meeting',
    'club night',
    'Pop-up',
    'Runs into',
    'TENTATIVE',
    'Tentative',
    'Halloween',
    'Perfume',
    'GovTech',
    'Coffee',
    'Roots',
    'Teollisuuskatu',
    'CHOIR',
  ])
    assert.ok(!out.includes(secret), `leaked: ${secret}`);
});
