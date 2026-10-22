// node --test worker/availability.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availability, helsinkiToUtc, spaceFor } from './availability.js';

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
