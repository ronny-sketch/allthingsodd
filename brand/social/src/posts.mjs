// ODD on Instagram — every post format, in six families (README.md is the spec).
//
// The signature, in one line each:
//   1. The square is the photograph: the centre square (135–1215px) is what the
//      profile shows, so the photo fills exactly that and words live in the two
//      135px bands. Nothing sits on a photograph. No scrims.
//   2. Type as image: one word or figure bigger than the tile (SVG text, so the
//      centring is exact when the word is wider than the canvas).
//   3. Through the lobes: the mark as a window. One lobe, three lobes, a stack.
//   4. The strike-through: what ODD is not, then what it is.
//   5. The mark, breathing: the site's steam filter, frozen.
//   6. Numbered cells and hairline sheets: 01–04, nine frames, 2px gaps.
//   7. Premise, then point: the first half quiet (40%), the second full.
//
// Two rules that outrank layout: never a name on a face the source does not
// name (only files or pages that name the person), and every photograph is
// credited — "Photo: ODDfest" here is a placeholder for "ODDfest / name".
//
// Copy is the site's, verbatim or trimmed. Figures are the site's: 274 credited
// for ODDfest 2026, more than 150 acts to five venues, more than 1,000 people
// at Creative Week partner events, €150 / month, €20 / hour. Nothing else.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const A = '../../../src/assets'; // relative to the render page in this folder
const I = 'images';
const CREDIT = 'Photo: ODDfest';

// The mark's path, from the one source the site uses. Never a redrawn copy.
export const MARK = readFileSync(join(ROOT, 'src/components/primitives/Logo.astro'), 'utf8').match(
  / d="([^"]+)"/,
)[1];

// The credits, from the thank-you page's content file, deduplicated and sorted
// the way the page sorts them. The 274 is the page's own figure.
const thankYou = JSON.parse(
  readFileSync(join(ROOT, 'src/content/pages/oddfest-2026.json'), 'utf8'),
);
// A list is either { items } or { subgroups: [{ label, items }] }.
const listed = (l) => l.items ?? (l.subgroups ?? []).flatMap((g) => g.items ?? []);
const seen = new Set();
export const NAMES = thankYou.credits.lists
  .flatMap((l) => listed(l).map((i) => i.name?.trim()))
  .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
  .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
export const CREDITED_TOTAL = 274;

export const MUSIC_2026 = [
  'Valerie June (US)',
  'Föllakzoid (CL)',
  'Paleface & Avanti!',
  'Stacy Epps (US)',
  'Dominga (CL)',
  'Kaukolampi',
  'A. Blomqvist',
  'Gone Future (SE)',
  'Clavert',
  'Electric Elisa',
  'Heith (IT)',
  'Lauer & DENA (DE)',
];

// ---------------------------------------------------------------------------
// Layout — everything a post can be built from. Sizes are the social ladder
// (Hero 104 / Display 72 / Heading 46 / Body 34 / Small 26) except type-as-image.
export const css = `
/* The two bands and the square between them. */
.band { position: absolute; left: 64px; right: 64px; height: 135px; display: flex;
  align-items: center; justify-content: space-between; gap: 32px; z-index: 2 }
.band.top { top: 0 } .band.bot { bottom: 0 }
.band .eyebrow { flex: none }
.band .line { flex: 1 1 auto; min-width: 0; font: 400 46px/1.12 var(--font-display);
  letter-spacing: -0.01em; margin: 0 }
.band .signal { color: #5081b3 } body.paper .band .signal { color: #40618c }
.band .creative { color: #ae6855 } body.paper .band .creative { color: #9a432b }
.sq { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; overflow: hidden;
  background: var(--color-paper-06) }
.sq img { width: 100%; height: 100%; object-fit: cover; display: block; filter: contrast(1.05) saturate(1.1) }
.sq.grey img { filter: grayscale(1) contrast(1.05) }
.sq.inset { left: 64px; right: 64px; top: 199px; height: 952px; background: none }
.sq.small { display: grid; place-items: center; background: none }
.sq.small img { width: 480px; height: 480px }
.sqpad { position: absolute; top: 135px; left: 64px; right: 64px; height: 1080px; display: grid;
  align-content: center; gap: 36px }

/* Type set inside the square (statements, asks). */
.pad { position: absolute; inset: 135px 96px; display: grid; gap: 40px; align-content: center; z-index: 2 }
.pad-story { position: absolute; inset: 320px 96px; display: grid; gap: 40px; align-content: center; z-index: 2 }

/* Type as image. SVG text-anchor centres exactly, even wider than the tile. */
.loud { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; overflow: hidden }
.loud svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible }
.loud text { font-family: var(--font-display); text-transform: uppercase; fill: currentColor }

/* The mark as a window, and the mark breathing. */
.lobes-wrap, .steam-wrap, .alone { position: absolute; top: 135px; left: 0; right: 0; height: 1080px;
  display: grid; place-items: center; overflow: hidden }
.lobes-wrap.stack { grid-auto-rows: max-content; align-content: center; gap: 24px }
.lobes-wrap.one svg { width: 2700px; max-width: none }
svg.lobes, svg.steam { display: block; height: auto }

/* The strike-through: the line stays loud, the word goes quiet. */
s.strike { text-decoration: line-through; text-decoration-thickness: 0.11em;
  text-decoration-color: var(--color-paper); color: var(--color-paper-40) }

/* Numbered cells, the nine-frame sheet, the diptych, the panorama. */
.cells { position: absolute; top: 135px; left: 64px; right: 64px; height: 1080px; display: grid;
  grid-template-rows: repeat(3, 1fr) }
.cells.four { grid-template-rows: repeat(4, 1fr) }
.cells > div { border-top: 1px solid var(--color-paper-12); padding-top: 36px; display: grid;
  grid-template-columns: 110px 1fr; gap: 24px; align-items: start; min-height: 0 }
.cells.four > div { padding-top: 28px }
.cells .num { font: 600 26px/1.7 var(--font-body); letter-spacing: 0.16em; color: var(--color-paper-40) }
.cells .txt { font: 400 46px/1.12 var(--font-display); letter-spacing: -0.01em; margin: 0 }
.cells .txt small { display: block; font: 400 34px/1.4 var(--font-body); color: var(--color-paper-60);
  margin-top: 10px; text-transform: none }
.sheet, .dip { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; display: grid; gap: 2px;
  background: var(--color-paper-12); overflow: hidden }
.sheet { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr) }
.dip { grid-template-columns: 1fr 1fr }
.sheet img, .dip img { width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: cover; display: block;
  filter: contrast(1.05) saturate(1.1) }
.pano { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; overflow: hidden }
.pano img { width: 100%; height: 100%; object-fit: cover; display: block; filter: contrast(1.05) saturate(1.1) }

/* Names, lineups, partners: Forta at the Body size — the documented reuse. */
.wall { position: absolute; top: 135px; left: 64px; right: 64px; height: 1080px; overflow: hidden;
  font-family: var(--font-display); font-size: 26px; line-height: 1.5; text-transform: uppercase;
  letter-spacing: 0.01em; color: var(--color-paper-60); margin: 0 }
.lineup-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px }
.lineup-list li { font-family: var(--font-display); font-size: 54px; line-height: 1.12;
  letter-spacing: -0.01em; text-transform: uppercase }
.partner-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px;
  background: rgb(14 9 11 / 12%); border: 1px solid rgb(14 9 11 / 12%) }
.partner-grid img { background: #e2dfde; padding: 34px 28px; height: 112px; min-width: 0; object-fit: contain; width: 100% }

/* The pill — the site's one button shape. */
.pill-mock { justify-self: start; display: inline-block; padding: 26px 52px; border-radius: 999px;
  background: var(--color-paper); color: var(--color-bg); font: 600 28px/1 var(--font-body);
  letter-spacing: 0.05em; text-transform: uppercase }

/* Stories: the same devices inside the 9:16 safe area (320px top and bottom). */
.story-mid { position: absolute; top: 320px; bottom: 320px; left: 0; right: 0; display: grid;
  place-items: center; align-content: center; gap: 48px }
.story-sq { position: absolute; top: 320px; height: 1280px; left: 0; right: 0; overflow: hidden }
.story-sq img { width: 100%; height: 100%; object-fit: cover; display: block; filter: contrast(1.05) saturate(1.1) }
.band.stop { top: 185px } .band.sbot { bottom: 185px }
`;

// ---------------------------------------------------------------------------
// Helpers. Every helper returns the HTML for one device.
const q = (quiet, full) => `${quiet ? `<span class="quiet">${quiet}</span> ` : ''}${full}`;
const top = (eyebrow, right = CREDIT, cls = '') =>
  `<div class="band top"><p class="eyebrow ${cls}">${eyebrow}</p>${right ? `<p class="eyebrow">${right}</p>` : ''}</div>`;
const bot = (quiet, full) => `<div class="band bot"><p class="line">${q(quiet, full)}</p></div>`;

// 1 — the square photograph; `pos` anchors both the crop and the zoom.
const sq = ({ img, pos = 'center', zoom = 1, grey = false, inset = false, small = false }) =>
  `<div class="sq${grey ? ' grey' : ''}${inset ? ' inset' : ''}${small ? ' small' : ''}">
     <img src="${img}" style="object-position:${pos};transform:scale(${zoom});transform-origin:${pos}" alt=""></div>`;
const photo = ({ eyebrow, credit = CREDIT, cls = '', quiet, line, ...rest }) =>
  top(eyebrow, credit, cls) + sq(rest) + bot(quiet, line);

// 2 — one word or figure, bigger than the tile, exactly centred.
const loud = (word, size, dx = 0) => `
  <div class="loud"><svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <text x="${540 + dx}" y="540" text-anchor="middle" dominant-baseline="central"
      font-size="${size}" letter-spacing="${-0.04 * size}">${word}</text></svg></div>`;

// 3 — the mark as a window. `pos` is an SVG preserveAspectRatio alignment.
let lobeId = 0;
// `shift` (viewBox units) slides the photograph left so an off-centre subject
// lands in the middle lobe; the image then covers a wider box from x = -shift.
const lobes = (img, width, pos = 'xMidYMid', shift = 0) => {
  const id = `lb${++lobeId}`;
  return `<svg class="lobes" viewBox="0 0 434.41 137.892" width="${width}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${id}"><path d="${MARK}"/></clipPath></defs>
    <image href="${img}" x="${-shift}" width="${434.41 + shift}" height="137.892"
      preserveAspectRatio="${shift ? 'xMinYMid' : pos} slice" clip-path="url(#${id})"/>
  </svg>`;
};

// 5 — the site's steam filter, frozen on one frame.
const steam = (width, fill) => `
  <svg class="steam" viewBox="-60 -60 554 258" width="${width}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="st" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="n1"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="2" seed="3" result="n2"/>
      <feComposite in="n1" in2="n2" operator="arithmetic" k1="0" k2="0.6" k3="0.6" k4="0" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs>
    <path d="${MARK}" fill="${fill}" filter="url(#st)"/></svg>`;

// 4 — the strike, as a Hero statement with a quiet explanation and an optional pill.
const strike = (eyebrow, struck, answer, small, pill) => `
  <div class="pad">
    <p class="eyebrow">${eyebrow}</p>
    <p class="t-hero"><s class="strike">${struck}</s><br>${answer}</p>
    ${small ? `<p class="t-body muted" style="max-width:26ch">${small}</p>` : ''}
    ${pill ? `<span class="pill-mock">${pill}</span>` : ''}
  </div>`;

// 6 — numbered cells.
const cells = (eyebrow, rows) => `
  ${top(eyebrow, '')}
  <div class="cells${rows.length === 4 ? ' four' : ''}">${rows
    .map((r, i) => `<div><span class="num">0${i + 1}</span><p class="txt">${r}</p></div>`)
    .join('')}</div>`;

export { sq, top, bot, q, loud, lobes, steam, strike, cells, photo, CREDIT, A, I };

// ---------------------------------------------------------------------------
export const posts = [
  // ── A · People ─────────────────────────────────────────────────────────────
  {
    n: 1,
    kind: 'Three tiles, one room',
    family: 'People',
    wide: 3,
    why: 'The top row of the profile is one photograph. Posted c, b, a so it lands in order.',
    alt: 'A full room at the ODDspace opening in Vallila, people on sofas and chairs in daylight, seen across three tiles.',
    caption:
      'Workspace, studios, events and community under one roof. ODDspace opening night, Vallila. Photo: ODDfest / photographer.',
    html: `
      <div class="pano"><img src="${A}/oddspace/opening-full-house.jpg" style="object-position:center 68%" alt=""></div>
      <div class="band top" style="right:auto;width:952px"><p class="eyebrow">ODDspace · opening night · Vallila</p></div>
      <div class="band bot" style="right:auto;width:952px"><p class="line">${q('Workspace, studios, events and community', 'under one roof.')}</p></div>
      <div class="band top" style="left:2224px;justify-content:flex-end"><p class="eyebrow">${CREDIT}</p></div>`,
  },
  {
    n: 2,
    kind: 'Through the lobes',
    family: 'People',
    why: 'The mark as a window. The photograph is the room; the shape is ours.',
    alt: 'Faces in an audience, smiling and listening, seen through the three-lobe ODD mark on a dark ground.',
    caption:
      'People can work independently, host things and cross paths with others working on very different things. ODDspace, Vallila. Photo: ODDfest / photographer.',
    html: `${top('ODDspace · opening night')}
      <div class="lobes-wrap">${lobes(`${A}/oddspace/opening-audience-close.jpg`, 1000)}</div>
      ${bot('Cross paths with others', 'working on very different things.')}`,
  },
  {
    n: 3,
    kind: 'The room, mid-move',
    family: 'People',
    why: 'Performer and audience in one frame, at eye level.',
    alt: 'A dancer in a silver dress bends low in a crowd at Vanha Ylioppilastalo, the audience watching close by.',
    caption:
      'The room, mid-move. Vanha Ylioppilastalo, ODDfest 2026. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddfest-2026/dance-worlds-crowd.jpg`,
      pos: 'center 40%',
      eyebrow: 'ODDfest 2026 · Vanha Ylioppilastalo',
      quiet: 'The room,',
      line: 'mid-move.',
    }),
  },
  {
    n: 4,
    kind: 'The maker',
    family: 'People',
    why: 'Somebody making something, mid-stroke. The act is named because the file names it; no face is.',
    alt: 'A hooded artist paints a black-ink canvas on an easel beside a DJ set-up, in cold blue light.',
    caption:
      'Bring what you do best. Valiobeats, live painting, ODDfest 2026. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddfest-2026/valiobeats-live-painting.jpg`,
      pos: 'center 42%',
      eyebrow: 'ODDfest 2026 · Valiobeats · live painting',
      line: 'Bring what you do best.',
    }),
  },
  {
    n: 5,
    kind: 'Talks',
    family: 'People',
    why: 'A speaker, named because the source names her, in the square.',
    alt: 'Salomé Daoudi speaks into a microphone in front of a bright projection screen, the image halftoned.',
    caption: 'Salomé Daoudi (DK), Talks, ODDfest 2026. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddfest-2026/salome-daoudi-talk.jpg`,
      pos: '36% 55%',
      zoom: 1.2,
      eyebrow: 'ODDfest 2026 · Talks',
      line: 'Salomé Daoudi (DK)',
    }),
  },
  {
    n: 6,
    kind: 'ODDference, experienced',
    family: 'People',
    why: 'Signal marks the business side; the photograph proves the line. Named because the file names her.',
    alt: 'Elisabet Lahti in a white karate gi, fists raised, in front of a pink-lit screen at ODDference.',
    caption:
      'Don’t just hear the argument. Experience it. Elisabet Lahti at ODDference 2026. ODDference 2027: Helsinki, dates not announced. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddfest-2026/oddference-elisabet-lahti.jpg`,
      pos: '62% 82%',
      zoom: 1.45,
      eyebrow: 'ODDference 2026 · Elisabet Lahti',
      cls: 'signal',
      quiet: 'Don’t just hear the argument.',
      line: 'Experience it.',
    }),
  },
  {
    n: 7,
    kind: 'Named portrait',
    family: 'People',
    why: 'The portrait series: greyscale, the name in Forta, the role quiet. Only portraits given to us as portraits.',
    alt: 'Black-and-white portrait of Galit Ariel in a hat and patterned jacket.',
    caption: 'Galit Ariel, Techno-Futurist & Author. Spoke at ODDference 2026.',
    html: photo({
      img: `${A}/speakers/galit-ariel.png`,
      pos: 'center 20%',
      grey: true,
      eyebrow: 'ODDference 2026 · past speaker',
      credit: '',
      cls: 'signal',
      quiet: 'Techno-Futurist & Author',
      line: 'Galit Ariel',
    }),
  },
  {
    n: 8,
    kind: 'Named portrait',
    family: 'People',
    why: 'The same portrait layout, so a row of speakers reads as one series.',
    alt: 'Black-and-white portrait of Perttu Pölönen.',
    caption: 'Perttu Pölönen, Futurist, Inventor & Author. Spoke at ODDference 2026.',
    html: photo({
      img: `${A}/speakers/perttu-polonen.png`,
      pos: 'center 20%',
      grey: true,
      eyebrow: 'ODDference 2026 · past speaker',
      credit: '',
      cls: 'signal',
      quiet: 'Futurist, Inventor & Author',
      line: 'Perttu Pölönen',
    }),
  },
  {
    n: 9,
    kind: 'Two people, mid-sentence',
    family: 'People',
    why: 'The actual product of ODD: a conversation. Nobody is named.',
    alt: 'Two people at a table in a grand hall, one blindfolded, the other leaning in to whisper.',
    caption:
      'Two people, mid-sentence. Vanha Ylioppilastalo, ODDfest 2026. Photo: ODDfest / photographer.',
    html: photo({
      img: `${I}/workshop-room.jpg`,
      pos: '55% 45%',
      zoom: 1.15,
      eyebrow: 'ODDfest 2026 · Vanha Ylioppilastalo',
      quiet: 'Two people,',
      line: 'mid-sentence.',
    }),
  },
  {
    n: 10,
    kind: 'The crew',
    family: 'People',
    why: 'The people who make it, working. Hands on the decks, not a stage seen from the back.',
    alt: 'Two DJs at a wooden booth by the windows at the ODDspace opening, one adjusting the mixer.',
    caption: 'Made by its hosts. ODDspace opening night, Vallila. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddspace/opening-djs.jpg`,
      pos: 'center 55%',
      eyebrow: 'ODDspace · opening night',
      line: 'Made by its hosts.',
    }),
  },
  {
    n: 11,
    kind: 'The whole room in one frame',
    family: 'People',
    why: 'Everyone who made it, on one stage. Nobody is named; all of them are thanked.',
    alt: 'A large group of people on a stage in a red-seated cinema under a screen that reads 2026 Launch.',
    caption: 'You are the heroes of ODD. ODDfest 2026 launch. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/about/oddfest-2026-launch-group.jpg`,
      pos: 'center 40%',
      eyebrow: 'ODDfest 2026 · the launch',
      quiet: 'You are',
      line: 'the heroes of ODD.',
    }),
  },
  {
    n: 12,
    kind: 'The name wall',
    family: 'People',
    why: 'The credits as texture: alphabetical, one size, nobody bigger than anybody else. The remainder is computed.',
    alt: 'A dense wall of names in capitals, the people and organisations who made ODDfest 2026, alphabetically.',
    caption: `${CREDITED_TOTAL} people, artists, collectives and organisations made ODDfest 2026. All of them, alphabetically, at allthingsodd.co/oddfest-2026.`,
    html: `${top('ODDfest 2026 · who made it', '')}
      <p class="wall">${NAMES.join(' · ')}</p>
      <div class="band bot"><p class="eyebrow">…and the rest, alphabetically, on allthingsodd.co</p></div>`,
  },

  // ── B · Evidence ───────────────────────────────────────────────────────────
  {
    n: 13,
    kind: 'The loud figure',
    family: 'Evidence',
    why: 'Type as image. The figure is bigger than the tile; the sentence it belongs to sits in the band.',
    alt: 'The number 274 in huge rounded capitals, cropped by the tile edges, on a near-black ground.',
    caption:
      '274 people, artists, collectives and organisations made ODDfest 2026. Together. All of them, alphabetically, at allthingsodd.co/oddfest-2026.',
    html: `${top('ODDfest 2026 · who made it', '')}${loud('274', 760)}${bot('People, artists, collectives and organisations.', 'Together.')}`,
  },
  {
    n: 14,
    kind: 'The loud figure',
    family: 'Evidence',
    why: 'The figure series: same device, the next number the site stands behind.',
    alt: 'The number 150 with a plus sign, huge, cropped by the tile edges.',
    caption: 'ODDfest 2026 brought more than 150 acts to five venues. allthingsodd.co/oddfest',
    html: `${top('ODDfest 2026', '')}${loud('150+', 590, -10)}${bot('More than 150 acts,', 'five venues.')}`,
  },
  {
    n: 15,
    kind: 'The loud figure',
    family: 'Evidence',
    why: 'The third figure. Three loud tiles across a quarter read as one habit.',
    alt: 'The figure 1,000 with a plus sign, huge, cropped by the tile edges.',
    caption:
      'In 2026, Creative Week brought more than 1,000 people to partner events across Helsinki. allthingsodd.co/oddfest',
    html: `${top('Creative Week 2026', '')}${loud('1,000+', 360, -6)}${bot('More than a thousand people', 'at partner events across Helsinki.')}`,
  },
  {
    n: 16,
    kind: 'Nine frames',
    family: 'Evidence',
    why: 'The contact sheet as a tile: one night, nine frames, the ground showing through 2px gaps.',
    alt: 'Nine photographs of dancers on a fog-covered stage in purple light, arranged in a three-by-three grid.',
    caption:
      'Club Theatre took over the main hall: dancers, DJs, actors, models and visual artists building one night in real time, directed by Tyre. Vanha Ylioppilastalo, ODDfest 2026. Photos: ODDfest / photographer.',
    html: `${top('ODDfest 2026 · Vanha Ylioppilastalo', 'Photos: ODDfest')}
      <div class="sheet">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<img src="${I}/ballroom-0${i}.jpg" alt="">`).join('')}</div>
      ${bot('Club Theatre took over the main hall.', 'Directed by Tyre.')}`,
  },
  {
    n: 17,
    kind: 'Hands',
    family: 'Evidence',
    why: 'Close enough to see the strings. The square is the photograph; nothing sits on it.',
    alt: 'Hands on the strings of a harp, lit green and gold, close up.',
    caption: 'Somebody’s hands, somebody’s night. ODDfest 2026. Photo: ODDfest / photographer.',
    html: photo({
      img: `${I}/harp-singer.jpg`,
      pos: '38% center',
      eyebrow: 'ODDfest 2026 · Music',
      quiet: 'Somebody’s hands,',
      line: 'somebody’s night.',
    }),
  },
  {
    n: 18,
    kind: 'The detail that says the room',
    family: 'Evidence',
    why: 'A pop filter and a coil of cable say “studio” faster than a wide shot.',
    alt: 'Two pop filters and coiled microphone cables in front of a deep blue curtain.',
    caption:
      'A room built for making sound — recording, co-writing, production. Run with TUNEMENT. From €20 / hour for members, €30 without. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddstudio/microphone-detail.jpg`,
      pos: 'center 45%',
      eyebrow: 'ODDstudio · run with TUNEMENT',
      line: 'A room built for making sound.',
    }),
  },
  {
    n: 19,
    kind: 'Then / now',
    family: 'Evidence',
    why: 'Two editions side by side with a hairline between them. The photographs do the arguing.',
    alt: 'Two photographs side by side: a sunny terrace crowd in 2025, and a dancer among the audience in a hall in 2026.',
    caption:
      'ODDfest 2025, Lasipalatsi. ODDfest 2026, Vanha Ylioppilastalo. Photos: ODDfest / photographers.',
    html: `<div class="band top"><p class="eyebrow">ODDfest 2025</p><p class="eyebrow">ODDfest 2026</p></div>
      <div class="dip">
        <img src="${A}/about/oddfest-2025-terrace-crowd.jpg" style="object-position:55% center" alt="">
        <img src="${A}/oddfest-2026/dance-worlds-crowd.jpg" style="object-position:45% 40%" alt="">
      </div>
      ${bot('Then.', 'Now.')}`,
  },
  {
    n: 20,
    kind: 'The quiet tile',
    family: 'Evidence',
    why: 'Negative space makes the loud tiles louder. One small photograph, one humble line.',
    alt: 'A small photograph of a person seen from behind, arms raised, against a white wall dotted with confetti, centred on a large dark ground.',
    caption:
      'We do not claim to represent the creative field. ODDfest 2026. Photo: ODDfest / photographer.',
    html: `${top('ODDfest 2026')}${sq({ img: `${A}/about/oddfest-2026-confetti.jpg`, pos: 'center 30%', small: true })}${bot('We do not claim', 'to represent the creative field.')}`,
  },
  {
    n: 21,
    kind: 'Archive',
    family: 'Evidence',
    why: 'The archive series is greyscale, so a 2025 frame reads as history next to 2026 colour.',
    alt: 'Black-and-white photograph of people sharing a long table on a sunny terrace, ODDfest 2025.',
    caption:
      'ODD began with the first ODDfest, in 2025. Lasipalatsi, Helsinki. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/about/oddfest-2025-shared-table.jpg`,
      pos: 'center 55%',
      grey: true,
      eyebrow: 'Archive · ODDfest 2025 · Lasipalatsi',
      quiet: 'ODD began with',
      line: 'the first ODDfest, 2025.',
    }),
  },
  {
    n: 22,
    kind: 'Archive',
    family: 'Evidence',
    why: 'Second frame of the archive series.',
    alt: 'Black-and-white still of a hooded figure in smoke and stage light, from the ODDfest 2025 aftermovie.',
    caption: 'Two years in, this is what has already happened. ODDfest 2025. Still: ODDfest.',
    html: photo({
      img: `${A}/cases/oddfest-2025-aftermovie-still.jpg`,
      pos: '40% center',
      grey: true,
      eyebrow: 'Archive · ODDfest 2025',
      credit: 'Still: ODDfest',
      quiet: 'Two years in,',
      line: 'this is what has already happened.',
    }),
  },
  {
    n: 23,
    kind: 'Through one lobe',
    family: 'Evidence',
    why: 'The mark bigger than the tile: one lobe fills the square and the others bleed off. A crop only ODD can make. Named because the file names her.',
    alt: 'Valerie June on stage with a guitar, seen through one giant lobe of the ODD mark that fills the tile.',
    caption: 'Valerie June (US), ODDfest 2026. Photo: ODDfest / photographer.',
    html: `${top('ODDfest 2026 · Music')}
      <div class="lobes-wrap one">${lobes(`${A}/cases/oddfest-2026-valerie-june.jpg`, 2700, 'xMidYMid', 95)}</div>
      ${bot('', 'Valerie June (US)')}`,
  },
  {
    n: 24,
    kind: 'Three nights, stacked',
    family: 'Evidence',
    why: 'Three windows, three nights. The stack is the argument: different events, one week.',
    alt: 'Three ODD marks stacked vertically, each a window onto a different night: a purple stage, a harp, a dancer in a crowd.',
    caption:
      'The point is not that these events look alike. It is that, for one week, they become easier to discover together. ODDfest 2026. Photos: ODDfest / photographers.',
    html: `${top('ODDfest 2026 · three nights', 'Photos: ODDfest')}
      <div class="lobes-wrap stack">
        ${lobes(`${I}/ballroom-05.jpg`, 1000, 'xMidYMid')}
        ${lobes(`${I}/harp-singer.jpg`, 1000, 'xMidYMid')}
        ${lobes(`${A}/oddfest-2026/dance-worlds-crowd.jpg`, 1000, 'xMidYMid')}
      </div>
      ${bot('Not that they look alike.', 'That they are easier to find together.')}`,
  },

  // ── C · Programme ──────────────────────────────────────────────────────────
  {
    n: 25,
    kind: 'Numbered',
    family: 'Programme',
    ground: 'paper',
    why: 'The catalogue habit: 01–03, hairlines, the ground showing through.',
    alt: 'Three numbered lines on a light ground explaining how ODDfest works.',
    caption:
      'How ODDfest works. You create the event, in your own way. We build the shared identity, programme, communications, PR and map around the week. For a few days, independent work across Helsinki becomes easier to find as one whole. allthingsodd.co/oddfest',
    html: cells('How ODDfest works', [
      'You create the event, in your own way.',
      'We build the shared identity, programme and communications around the week.',
      'For a few days, independent work across Helsinki becomes easier to find as one whole.',
    ]),
  },
  ...[
    {
      n: 26,
      img: 'oddtheatre-vanha-ylioppilastalo.jpg',
      pos: 'center 45%',
      eyebrow: 'ODDfest 2026 · Vanha Ylioppilastalo',
      quiet: 'ODDtheatre.',
      line: 'Directed by Tyre.',
      alt: 'A performer in a dark dress on a fog-covered stage under purple light.',
      caption:
        'ODDtheatre. Club Theatre took over the main hall: dancers, DJs, actors, models and visual artists building one night in real time, directed by Tyre. Among them the House of Xclusive Lanvin, contemporary circus group Nuua, Wanda O’rly and Maryisonacid.',
    },
    {
      n: 27,
      img: 'creative-x-tech-maria01.jpg',
      pos: 'center 40%',
      eyebrow: 'Creative Week 2026 · Maria 01',
      quiet: 'People who usually build',
      line: 'in separate circles.',
      alt: 'A panel of speakers seated on a stage in front of a dark screen at Maria 01.',
      caption:
        'Creative × Tech: Ecosystem Convergence. Founders, artists, hackers, designers, musicians and cultural operators in one room — people who usually build in separate circles. Talks, fireside chats and participatory programme opened the week.',
    },
    {
      n: 28,
      img: 'smell-the-art-bio-rex.jpg',
      pos: 'center',
      eyebrow: 'ODDfest 2026 · Bio Rex',
      quiet: 'An exhibition',
      line: 'for two senses.',
      alt: 'Visitors in a dim gallery lean towards artworks at Bio Rex.',
      caption:
        'Smell the Art. An exhibition for two senses: artworks paired with chosen fragrances, so scent could deepen, disrupt or extend what the eye saw. Created by Katia Los and Adriana Knispel.',
    },
    {
      n: 29,
      img: 'soiree-of-serendipity.jpg',
      pos: 'center 40%',
      eyebrow: 'Creative Week 2026 · Taidehalli',
      quiet: 'An evening on',
      line: 'the soul of tomorrow.',
      alt: 'A crowd in evening dress talking in the bright hall of Taidehalli.',
      caption:
        'Soirée of Serendipity. An invitation-only evening on the soul of tomorrow — what a good life in the future is made of. Around 300 leaders, entrepreneurs, artists and thinkers from business, culture and society.',
    },
    {
      n: 30,
      img: 'hanaholmen-oodi-panel.jpg',
      pos: 'center 40%',
      eyebrow: 'ODDfest 2026 · Oodi · with Hanaholmen',
      quiet: '',
      line: 'Decoration, product or societal structure?',
      alt: 'Panellists seated in a row at Oodi library, an audience in the foreground.',
      caption:
        'Decoration, product or societal structure? A public panel, in Swedish, on where culture’s value lies as funding tightens — with voices from the Kordelin Foundation, Kulturanalys Norden, Way Out West and Espoo Theatre. With Hanaholmen and Nordic Culture Point.',
    },
    {
      n: 31,
      img: 'oddgames-tavastia.jpg',
      pos: 'center',
      eyebrow: 'ODDfest 2026 · Tavastia',
      quiet: 'Tavastia,',
      line: 'as a playground.',
      alt: 'People play and watch at a table of screens and controllers under stage light at Tavastia.',
      caption:
        'ODDgames transformed Tavastia into a multi-layered playground where games, creativity and new technology came together. With Espoo Game LAB, Odd Latent and Super Bario.',
    },
    {
      n: 32,
      img: 'creative-capital-gathering.jpg',
      pos: '60% 40%',
      eyebrow: 'Creative Week 2026 · Amos Rex',
      quiet: 'What does it mean to invest',
      line: 'in the creative industries?',
      alt: 'A speaker at a microphone in front of a screen reading Creative Capital Gathering.',
      caption:
        'Creative Capital Gathering. Investors, foundations, funds and angels around one question: what does it really mean to invest in the creative industries? A conversation rather than a pitch session.',
    },
    {
      n: 33,
      img: 'odd-deep-space-kamppi-chapel.jpg',
      pos: 'center 45%',
      eyebrow: 'ODDfest 2026 · Kamppi Chapel',
      quiet: 'Kamppi Chapel,',
      line: 'as a dreamlike satellite.',
      alt: 'People in motion, blurred, inside the pale wooden curve of Kamppi Chapel.',
      caption:
        'ODD Deep Space transformed Kamppi Chapel into a dreamlike satellite where body, mind and urgent questions about the future came together through movement, sound and experimental formats.',
    },
  ].map(({ img, ...h }) => ({
    kind: 'One event, one line',
    family: 'Programme',
    why: 'The highlights series: eight events, one layout, the host’s own words in the caption.',
    ...h,
    html: photo({
      img: `${A}/examples/${img}`,
      pos: h.pos,
      eyebrow: h.eyebrow,
      quiet: h.quiet,
      line: h.line,
    }),
  })),
  {
    n: 34,
    kind: 'Lineup card',
    family: 'Programme',
    why: 'Names in Forta, one category a tile. The list is the picture.',
    alt: 'A list of twelve music acts in rounded capitals on a dark ground.',
    caption: `ODDfest 2026 · Music. ${MUSIC_2026.join(' · ')}.`,
    html: `${top('ODDfest 2026 · Music', '')}
      <div class="sqpad"><ul class="lineup-list">${MUSIC_2026.map((m) => `<li>${m}</li>`).join('')}</ul></div>`,
  },
  {
    n: 35,
    kind: 'Thank the partners',
    family: 'Programme',
    ground: 'paper',
    why: 'Monochrome, equal size, named. Nobody’s logo is bigger than anybody else’s.',
    alt: 'Eight partner logos in a hairline grid on a light ground.',
    caption: 'ODDfest 2026 was made with these organisations, and with 274 people. Thank you.',
    html: `${top('ODDfest 2026 · made with', '')}
      <div class="sqpad"><div class="partner-grid">${[
        'moomin',
        'genelec',
        'holvi',
        'tiketti',
        'suomenkulttuurirahasto',
        'kauppakamari',
        'lasipalatsikortteli',
        'dottir',
      ]
        .map((l) => `<img src="${I}/logo-${l}.svg" alt="">`)
        .join('')}</div></div>`,
  },
  {
    n: 36,
    kind: 'The question',
    family: 'Programme',
    why: 'The one ODDference is built on, with the honest line about what is not announced.',
    alt: 'A question in large rounded capitals on a dark ground: what can business learn from creative expertise?',
    caption:
      'ODDference is built on one question: what can business and the rest of society learn from creative expertise? Helsinki, 2027. Dates not announced.',
    html: `
      <div class="pad">
        <p class="eyebrow signal">ODDference 2027 · Helsinki</p>
        <p class="t-display">${q('What can business and the rest of society learn', 'from creative expertise?')}</p>
        <p class="t-body muted">Dates not announced.</p>
      </div>`,
  },

  // ── D · Voice ──────────────────────────────────────────────────────────────
  {
    n: 37,
    kind: 'The strike-through',
    family: 'Voice',
    why: 'The nav habit, used to say what ODD is not. The line stays loud, the word goes quiet.',
    alt: 'The words A festival crossed out, then A week, in large rounded capitals.',
    caption:
      'ODDfest doesn’t produce the events for you. It brings independently made events together so they’re easier to discover, reach wider audiences and become part of one bigger citywide week.',
    html: strike(
      'ODDfest',
      'A festival.',
      'A week.',
      'Independently made events across Helsinki, brought together into one shared programme.',
    ),
  },
  {
    n: 38,
    kind: 'The honest strike',
    family: 'Voice',
    ground: 'paper',
    why: 'The banned phrase, crossed out. Saying what is undecided is the ask.',
    alt: 'The words Coming soon crossed out, then Not announced yet, on a light ground, with a button.',
    caption:
      'ODDfest 2027 dates are not fixed. We are collecting event ideas now, before they are — the best moment to bring one. allthingsodd.co/oddfest',
    html: strike(
      'ODDfest 2027',
      'Coming soon.',
      'Not announced yet.',
      'The dates are not fixed. Ideas are being collected now — the best moment to bring one.',
      'Submit an event idea',
    ),
  },
  {
    n: 39,
    kind: 'The strike-through',
    family: 'Voice',
    why: 'What ODDspace actually is.',
    alt: 'The word Networking crossed out, then Lunch, in large rounded capitals.',
    caption:
      'Come here to work. Meet people. Host events. Create something. ODDspace, Teollisuuskatu 9D, Vallila.',
    html: strike(
      'ODDspace',
      'Networking.',
      'Lunch.',
      'Come here to work. Meet people. Host events. Create something.',
    ),
  },
  {
    n: 40,
    kind: 'The strike-through',
    family: 'Voice',
    ground: 'paper',
    why: 'The word ODD refuses, and what it says instead.',
    alt: 'The word Curated crossed out, then Made by its hosts, on a light ground.',
    caption:
      'ODDfest doesn’t produce the events for you. Artists, collectives, venues, organisations, communities and companies make and produce their own.',
    html: strike(
      'ODDfest',
      'Curated.',
      'Made by its hosts.',
      'Artists, collectives, venues, organisations, communities and companies make and produce their own.',
    ),
  },
  {
    n: 41,
    kind: 'The strike-through',
    family: 'Voice',
    why: 'The adjective, replaced by the place.',
    alt: 'The word World-class crossed out, then Helsinki, in large rounded capitals.',
    caption: 'One shared week, made by Helsinki’s creative communities.',
    html: strike(
      'ODDfest',
      'World-class.',
      'Helsinki.',
      'One shared week, made by Helsinki’s creative communities.',
    ),
  },
  {
    n: 42,
    kind: 'The mark, breathing',
    family: 'Voice',
    why: 'The site’s steam filter, frozen on one frame. The living layer, in a still. Once an edition.',
    alt: 'The ODD mark, its edges softly rippled as if seen through steam, on a dark ground.',
    caption: 'Stay ODD.',
    html: `<div class="steam-wrap">${steam(1060, '#e2dfde')}</div>${bot('', 'Stay ODD.')}`,
  },
  {
    n: 43,
    kind: 'Statement',
    family: 'Voice',
    why: 'The thesis, in the site’s own words, premise quiet and point full.',
    alt: 'A statement in large rounded capitals: Finland has creative talent. What’s missing are the structures that help it grow, connect and last.',
    caption:
      'Finland has creative talent. What’s missing are the structures that help it grow, connect and last. That is why ODD exists.',
    html: `
      <div class="pad">
        <p class="eyebrow">Why ODD</p>
        <p class="t-display">${q('Finland has creative talent.', 'What’s missing are the structures that help it grow, connect and last.')}</p>
      </div>`,
  },
  {
    n: 44,
    kind: 'Statement',
    family: 'Voice',
    ground: 'paper',
    why: 'The ODDspace argument, on Paper because ODDspace inverts.',
    alt: 'A statement on a light ground: Creative work needs more than moments.',
    caption:
      'Creative work needs more than moments. Great things happen in projects, events, commissions and productions. But when they end, people disperse, momentum fades and the next thing often starts from scratch. ODDspace exists to give creative work somewhere to keep going.',
    html: `
      <div class="pad">
        <p class="eyebrow">Why ODDspace</p>
        <p class="t-hero">${q('Creative work needs', 'more than moments.')}</p>
        <p class="t-body muted" style="max-width:28ch">Somewhere to keep going between projects.</p>
      </div>`,
  },
  {
    n: 45,
    kind: 'Quote',
    family: 'Voice',
    why: 'Attributed, verbatim, from the thank-you page.',
    alt: 'A quotation in rounded capitals about heroes being ordinary individuals who persevere, attributed to Christopher Reeve.',
    caption: 'For everyone who showed up, stayed late and made ODDfest 2026 real. Thank you.',
    html: `
      <div class="pad">
        <p class="eyebrow">ODDfest 2026 · thank you</p>
        <p class="t-display">${q('“A hero is an ordinary individual who finds the strength to', 'persevere and endure in spite of overwhelming obstacles.”')}</p>
        <p class="eyebrow">— Christopher Reeve</p>
      </div>`,
  },

  // ── E · Invitation ─────────────────────────────────────────────────────────
  {
    n: 46,
    kind: 'The pill, alone',
    family: 'Invitation',
    why: 'The odd one out: the only round thing on a square grid, and nothing else on the tile.',
    alt: 'A single light pill-shaped button reading Submit an event idea, centred on a dark empty tile.',
    caption: 'That is the whole post. allthingsodd.co/oddfest',
    html: `<div class="alone"><span class="pill-mock" style="justify-self:center">Submit an event idea</span></div>`,
  },
  {
    n: 47,
    kind: 'Open call',
    family: 'Invitation',
    ground: 'paper',
    why: 'The call is permanent content, not an interruption.',
    alt: 'A question on a light ground, What would you put in the week?, with a button.',
    caption:
      'An exhibition, a performance, a workshop, a screening, a dinner, an open studio, a club night, a conversation — or a format nobody has tried yet. If it belongs in Helsinki’s creative life, it belongs in the week. allthingsodd.co/oddfest',
    html: `
      <div class="pad">
        <p class="eyebrow">Open call · ODDfest 2027</p>
        <p class="t-hero">What would you put in the week?</p>
        <p class="t-body muted" style="max-width:28ch">An exhibition, a performance, a workshop, a screening, a dinner, an open studio, a club night — or a format nobody has tried yet.</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>`,
  },
  {
    n: 48,
    kind: 'The low bar',
    family: 'Invitation',
    why: 'The line that lowers the threshold. The whole ask in one sentence.',
    alt: 'A statement in rounded capitals: An idea still at the notes-on-your-phone stage is a fine thing to send, with a button.',
    caption:
      'An idea still at the notes-on-your-phone stage is a fine thing to send. Sending it commits you to nothing, and we would far rather hear it early than hear it finished and too late. allthingsodd.co/oddfest',
    html: `
      <div class="pad">
        <p class="eyebrow">ODDfest 2027</p>
        <p class="t-display">${q('An idea still at the notes-on-your-phone stage', 'is a fine thing to send.')}</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>`,
  },
  {
    n: 49,
    kind: 'Membership',
    family: 'Invitation',
    ground: 'paper',
    why: 'The ODDspace ask, with the price from the site and the honest note.',
    alt: 'On a light ground: One membership. The whole space, except the studio. €150 a month, rolling admission. A button reading Apply.',
    caption:
      'One membership. The whole space, except the studio. €150 / month, one flat rate — no tiers. Accepted on a rolling basis as space becomes available. allthingsodd.co/oddspace',
    html: `
      <div class="pad">
        <p class="eyebrow">ODDspace · membership</p>
        <p class="t-display">${q('One membership.', 'The whole space, except the studio.')}</p>
        <p class="t-body muted">€150 / month · rolling admission — pilot phase</p>
        <span class="pill-mock">Apply</span>
      </div>`,
  },

  // ── F · Place ──────────────────────────────────────────────────────────────
  {
    n: 50,
    kind: 'Lunch, on Paper',
    family: 'Place',
    ground: 'paper',
    why: 'ODDspace inverts the whole palette; the most ordinary photograph gets the light ground.',
    alt: 'People eating lunch together at a wooden table in a bright room with a pink patterned curtain.',
    caption: 'Talks, sets, lunches, work. ODDspace, Vallila. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddspace/everyday-lunch.jpg`,
      pos: 'center 58%',
      eyebrow: 'ODDspace · Vallila · an ordinary day',
      quiet: 'Talks, sets, lunches,',
      line: 'work.',
    }),
  },
  {
    n: 51,
    kind: 'A talk at ODDspace',
    family: 'Place',
    why: 'The everyday programme: a small room, a microphone, people who came.',
    alt: 'A woman speaks into a microphone on a sofa panel while people listen, in a sunlit room.',
    caption:
      'The space is a pilot for something larger, and the people using it help shape what it becomes. ODDspace, Vallila. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddspace/opening-panel.jpg`,
      pos: '40% center',
      eyebrow: 'ODDspace · a talk',
      quiet: 'A pilot for something larger.',
      line: 'The people using it help shape it.',
    }),
  },
  {
    n: 52,
    kind: 'The studio',
    family: 'Place',
    why: 'ODDstudio as a series: the room, the instruments, the monitoring.',
    alt: 'Guitars, a keyboard, percussion and an electronic drum kit lined up in front of blue curtains.',
    caption:
      'Guitars, keys, electronic drums and percussion. ODDstudio, run with TUNEMENT — recording, co-writing, production. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddstudio/instruments-lineup.jpg`,
      pos: 'center',
      eyebrow: 'ODDstudio · run with TUNEMENT',
      quiet: 'Guitars, keys,',
      line: 'electronic drums and percussion.',
    }),
  },
  {
    n: 53,
    kind: 'The studio',
    family: 'Place',
    why: 'Second frame of the studio series.',
    alt: 'A studio desk with monitors and Genelec speakers between blue curtains.',
    caption:
      'Genelec monitoring and a mic locker. ODDstudio is booked separately from membership — from €20 / hour for members, €30 without. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddstudio/desk-monitors.jpg`,
      pos: 'center',
      eyebrow: 'ODDstudio · run with TUNEMENT',
      quiet: 'Genelec monitoring',
      line: 'and a mic locker.',
    }),
  },
  {
    n: 54,
    kind: 'The room',
    family: 'Place',
    ground: 'paper',
    why: 'The rooms series, on Paper: what each one is for, in the site’s words.',
    alt: 'An empty tiered auditorium with grey seats and a row of pillars, in daylight.',
    caption:
      'The auditorium. Tiered seating for talks, screenings, presentations, workshops and smaller events. Member rate €100 for a half day; you do not need to be a member to ask. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddspace/auditorium-tiered.jpg`,
      pos: 'center',
      eyebrow: 'ODDspace · the auditorium',
      quiet: 'Tiered seating for talks, screenings,',
      line: 'presentations and workshops.',
    }),
  },
  {
    n: 55,
    kind: 'The room',
    family: 'Place',
    ground: 'paper',
    why: 'Second room. Same layout, so the rooms read as one series.',
    alt: 'An empty white gallery floor with pillars and large windows.',
    caption:
      'The gallery floor. For exhibitions, launches, workshops, talks, shoots, gatherings, performances and organisational events. Member rate €200 for a full day. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddspace/gallery-floor.jpg`,
      pos: 'center',
      eyebrow: 'ODDspace · the gallery floor',
      quiet: 'For exhibitions, launches,',
      line: 'talks and performances.',
    }),
  },
  {
    n: 56,
    kind: 'The building',
    family: 'Place',
    ground: 'paper',
    why: 'Where it is. The address is the eyebrow.',
    alt: 'The brick exterior of the ODDspace building in Vallila under a pale sky.',
    caption:
      'A year-round home for creative work. ODDspace, Teollisuuskatu 9D, Vallila, Helsinki. Photo: ODDfest / photographer.',
    html: photo({
      img: `${A}/oddspace/exterior-building.jpg`,
      pos: 'center 40%',
      eyebrow: 'ODDspace · Teollisuuskatu 9D, Vallila',
      quiet: 'A year-round home',
      line: 'for creative work.',
    }),
  },
  {
    n: 57,
    kind: 'The weekly',
    family: 'Place',
    ground: 'paper',
    why: 'What is on, as numbered cells. Four things that actually recur.',
    alt: 'Four numbered lines on a light ground: Coffee on the House, ODDbachata, One Day Choir Helsinki, Birds Nest Ambient Festival.',
    caption:
      'What’s happening at ODDspace. Coffee on the House: morning coffee, a deep house DJ and whoever turns up — free, no membership needed. ODDbachata: class, practice and a social night. One Day Choir Helsinki: a choir that exists for one afternoon. Birds Nest Ambient Festival: an evening and night of ambient music across the space. allthingsodd.co/oddspace',
    html: cells('ODDspace · what’s on', [
      'Coffee on the House<small>Morning coffee, a deep house DJ and whoever turns up.</small>',
      'ODDbachata<small>Class and practice, then a social night that runs late.</small>',
      'One Day Choir Helsinki<small>A choir that exists for one afternoon.</small>',
      'Birds Nest Ambient Festival<small>Ambient music across the space, late afternoon to the early hours.</small>',
    ]),
  },
  {
    n: 58,
    kind: 'Repost frame',
    family: 'People',
    why: 'The host’s own picture keeps its own edges; ODD only frames and credits it.',
    alt: 'A photograph of a hooded artist painting, inset with a margin inside a dark tile, labelled as made by a host.',
    caption: 'Made by a host. Reposted with permission — @handle. Photo: the host.',
    html: `<div class="band top"><p class="eyebrow">Made by a host</p><p class="eyebrow">@handle</p></div>
      ${sq({ img: `${I}/live-painting.jpg`, pos: 'center 40%', inset: true })}
      <div class="band bot"><p class="eyebrow">Reposted with permission</p></div>`,
  },
  {
    n: 59,
    kind: 'Two sides',
    family: 'Voice',
    ground: 'paper',
    why: 'Creative in Amber, business in Signal, creative first. As two numbered cells.',
    alt: 'Two numbered cells on a light ground: for creatives, work, create and connect; for business, get closer to creative expertise.',
    caption:
      'ODD brings two worlds together — creative and cultural people, and businesses that want to work with them. For creatives: work, create and connect with other creatives. For business: get closer to creative expertise and the people behind it.',
    html: `${top('ODD brings two worlds together', '')}
      <div class="cells" style="grid-template-rows:repeat(2,1fr)">
        <div><span class="num creative">01</span><p class="txt"><span class="creative" style="display:block;font:600 26px/1.7 var(--font-body);letter-spacing:.16em">For creatives</span>Work, create and connect with other creatives.</p></div>
        <div><span class="num signal">02</span><p class="txt"><span class="signal" style="display:block;font:600 26px/1.7 var(--font-body);letter-spacing:.16em">For business</span>Get closer to creative expertise and the people behind it.</p></div>
      </div>`,
  },
];
