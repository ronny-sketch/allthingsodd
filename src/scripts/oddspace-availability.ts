// ODDspace availability grid — fills AvailabilityCalendar.astro from
// /oddspace/availability.json (worker/availability.js). The feed is the
// booking calendar reduced to { space, time } per Helsinki day, so this
// file only lays a month out; it never sees an event name.
//
// One same-origin GET, no storage, no third-party request. A failed fetch
// degrades to a one-line status and the section's CTA, never an empty grid.

interface Block {
  space: string;
  time: string;
}
interface Feed {
  from: string; // 'YYYY-MM-DD', first day covered
  to: string; // 'YYYY-MM-DD', last day covered
  days: Record<string, Block[]>; // booked days only
}

const TZ = 'Europe/Helsinki';
const monthName = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const longDay = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Calendar arithmetic in UTC: 'YYYY-MM-DD' for (y, m, d), overflow allowed. */
const iso = (y: number, m: number, d: number): string =>
  new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

const shiftMonth = (ym: string, by: number): string => {
  const [y, m] = ym.split('-').map(Number);
  return iso(y, m + by, 1).slice(0, 7);
};

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render(
  grid: HTMLElement,
  monthEl: HTMLElement,
  status: HTMLElement,
  feed: Feed,
  ym: string,
  today: string,
): void {
  const [y, m] = ym.split('-').map(Number);
  monthEl.textContent = monthName.format(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  grid.replaceChildren();
  for (let i = 0; i < offset; i++) {
    const pad = el('li', 'avail-day is-pad');
    pad.setAttribute('aria-hidden', 'true');
    grid.append(pad);
  }
  let booked = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = iso(y, m, d);
    const blocks = feed.days[date] ?? [];
    const day = el(
      'li',
      [
        'avail-day',
        blocks.length ? '' : 'is-free',
        date < today ? 'is-past' : '',
        date === today ? 'is-today' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    const num = el('span', 'avail-daynum', String(d));
    num.setAttribute('aria-hidden', 'true');
    day.append(num, el('span', 'avail-daylong', longDay.format(Date.UTC(y, m - 1, d))));
    if (blocks.length) {
      booked++;
      const list = el('ul', 'avail-blocks');
      for (const block of blocks) {
        const item = el('li', 'avail-block');
        item.append(el('b', '', block.space), ` ${block.time}`);
        list.append(item);
      }
      day.append(list);
    }
    grid.append(day);
  }
  status.textContent = booked ? '' : 'Nothing booked this month yet.';
}

async function init(root: HTMLElement): Promise<void> {
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  const monthEl = root.querySelector<HTMLElement>('[data-month]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  if (!grid || !monthEl || !status || !prev || !next) return;

  root.dataset.state = 'loading';
  status.textContent = 'Loading the calendar…';
  let feed: Feed;
  try {
    const res = await fetch(root.dataset.src ?? '/oddspace/availability.json', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(String(res.status));
    feed = (await res.json()) as Feed;
    if (typeof feed?.from !== 'string' || typeof feed?.to !== 'string' || !feed.days)
      throw new Error('shape');
  } catch {
    root.dataset.state = 'error';
    status.textContent =
      'The calendar is not answering right now. Ask us about a date and we will check.';
    return;
  }
  root.dataset.state = 'ready';

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const first = feed.from.slice(0, 7);
  const last = feed.to.slice(0, 7);
  let month = today.slice(0, 7);
  if (month < first) month = first;
  if (month > last) month = last;

  const draw = (): void => {
    render(grid, monthEl, status, feed, month, today);
    prev.disabled = month <= first;
    next.disabled = month >= last;
  };
  prev.addEventListener('click', () => {
    month = shiftMonth(month, -1);
    draw();
  });
  next.addEventListener('click', () => {
    month = shiftMonth(month, 1);
    draw();
  });
  draw();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-availability]')) {
  void init(root);
}
