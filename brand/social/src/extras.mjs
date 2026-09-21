// Beyond the single tile: stories (9:16), two carousels, two reel covers and the
// six highlight covers. Same devices, same rules as posts.mjs.
import {
  A,
  I,
  CREDIT,
  NAMES,
  CREDITED_TOTAL,
  q,
  top,
  bot,
  sq,
  loud,
  lobes,
  strike,
  photo,
} from './posts.mjs';

/** A story is a message, not a poster: one line each, inside the 320px safe area. */
export const stories = [
  {
    n: 1,
    kind: 'Doors',
    alt: 'A crowd with raised hands under green light; above it, Tonight, Vanha Ylioppilastalo; below it, Doors at 19.',
    html: `
      <div class="band stop"><p class="eyebrow">Tonight · Vanha Ylioppilastalo</p><p class="eyebrow">${CREDIT}</p></div>
      <div class="story-sq"><img src="${I}/crowd-hands.jpg" style="object-position:center 40%" alt=""></div>
      <div class="band sbot"><p class="line">Doors at 19.</p></div>`,
  },
  {
    n: 2,
    kind: 'Ask',
    ground: 'paper',
    alt: 'On a light ground: Open call. What should happen next? Tell us — the sticker is right there.',
    html: `
      <div class="pad-story">
        <p class="eyebrow">Open call</p>
        <p class="t-hero">What should happen next?</p>
        <p class="t-body muted">Tell us — the sticker is right there.</p>
      </div>`,
  },
  {
    n: 3,
    kind: 'Credit',
    alt: 'Last night. Made by a host, with ten collectives. Photo: ODDfest.',
    html: `
      <div class="pad-story">
        <p class="eyebrow">Last night</p>
        <p class="t-display">${q('Made by', '@handle, with ten collectives.')}</p>
        <p class="t-small muted">${CREDIT}</p>
      </div>`,
  },
  {
    n: 4,
    kind: 'The honest strike',
    ground: 'paper',
    alt: 'Coming soon, crossed out; Not announced yet. The dates are not fixed. A button: Submit an event idea.',
    html: `
      <div class="pad-story">
        <p class="eyebrow">ODDfest 2027</p>
        <p class="t-hero"><s class="strike">Coming soon.</s><br>Not announced yet.</p>
        <p class="t-body muted">The dates are not fixed. Ideas are being collected now.</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>`,
  },
  {
    n: 5,
    kind: 'Through the lobes',
    alt: 'A sunny terrace crowd seen through the ODD mark; below it, Last night.',
    html: `
      <div class="story-mid">
        ${lobes(`${A}/about/oddfest-2025-terrace-crowd.jpg`, 900)}
        <p class="eyebrow">Last night · ${CREDIT}</p>
      </div>`,
  },
];

/** Carousel 1 — one night. Frame 1 states, 2–4 show, 5 asks. Every frame stands alone. */
const night = [
  {
    n: 1,
    alt: 'ODDtheatre. Club Theatre took over the main hall. Swipe.',
    html: `
      <div class="pad">
        <p class="eyebrow">One night · ODDtheatre · Vanha Ylioppilastalo</p>
        <p class="t-hero">${q('Club Theatre took over', 'the main hall.')}</p>
        <p class="eyebrow">Swipe →</p>
      </div>`,
  },
  ...[2, 3, 4].map((i) => ({
    n: i,
    alt: 'A dancer on a fog-covered stage in purple light.',
    html: photo({
      img: `${I}/ballroom-0${[5, 2, 9][i - 2]}.jpg`,
      pos: 'center 40%',
      eyebrow: `ODDtheatre · ${i - 1} / 3`,
      quiet: ['Dancers, DJs, actors,', 'One night,', 'Directed by Tyre.'][i - 2],
      line: ['models and visual artists.', 'in real time.', 'Vanha Ylioppilastalo.'][i - 2],
    }),
  })),
  {
    n: 5,
    ground: 'paper',
    alt: 'Bring the thing only you would make. Submit an event idea.',
    html: `
      <div class="pad">
        <p class="eyebrow">ODDfest 2027</p>
        <p class="t-display">${q('Bring the thing', 'only you would make.')}</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>`,
  },
];

/** Carousel 2 — the credits, all of them, as many frames as it takes. */
const PER_FRAME = 95;
const frames = [];
for (let i = 0; i < NAMES.length; i += PER_FRAME) frames.push(NAMES.slice(i, i + PER_FRAME));
const credits = frames.map((names, i) => ({
  n: i + 1,
  alt: `Names ${names[0]} to ${names[names.length - 1]}, alphabetically, of the people who made ODDfest 2026.`,
  html: `${top(`ODDfest 2026 · who made it · ${i + 1} / ${frames.length}`, '')}
    <p class="wall">${names.join(' · ')}</p>
    <div class="band bot"><p class="eyebrow">${i === frames.length - 1 ? `All ${CREDITED_TOTAL}. Thank you.` : 'Swipe →'}</p></div>`,
}));

export const carousels = [
  { name: 'carousel', frames: night },
  { name: 'credits', frames: credits },
];

/** Reel covers: a still in the grid's own language, so a video does not punch a hole in the profile. */
export const reels = [
  {
    n: 1,
    kind: 'The loud word',
    alt: 'The word FEST in huge rounded capitals, cropped by the tile edges; below, Reel, ODDfest 2026.',
    html: `${loud('FEST', 530, -17)}<div class="band bot"><p class="eyebrow">Reel · ODDfest 2026</p></div>`,
  },
  {
    n: 2,
    kind: 'The square',
    alt: 'A performer in a dark dress on a fog-covered stage under purple light; below, One hall, one night, in real time.',
    html: photo({
      img: `${I}/theatre-purple.jpg`,
      eyebrow: 'Reel · ODDtheatre',
      line: 'One hall, one night, in real time.',
    }),
  },
];

/** Highlight covers: the lockup suffix alone, the way the rails carry it. */
export const highlights = ['FEST', 'FERENCE', 'SPACE', 'STUDIO', 'ARCHIVE', 'OPEN CALLS'];

export const highlightCss = `
.hl { position: absolute; inset: 0; display: grid; place-items: center }
.hl span { font-family: var(--font-display); font-size: 150px; letter-spacing: 0.02em;
  text-transform: uppercase; text-align: center; padding: 0 60px; line-height: 1 }
.hl.small span { font-size: 104px }
`;

// keep the imports honest — sq and strike are here for future frames
void sq;
void strike;
void bot;
