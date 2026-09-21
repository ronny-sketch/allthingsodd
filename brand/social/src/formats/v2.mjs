// The signature: what makes a tile ODD at thumbnail size, with the logo removed.
//
//   1. The square is the photograph. A 4:5 post's centre square (135–1215px) is
//      what the profile grid shows, so the photograph fills exactly that and the
//      words live in the two 135px Ink bands above and below. No scrim, ever.
//   2. Type as image. One word or one figure set bigger than the tile and cropped
//      by its edges — the only place anything exceeds the Hero size.
//   3. Through the lobes. The mark as a window: a photograph seen through the
//      three-lobe shape (the pill's parent), on Ink.
//   4. The strike-through. The nav habit used to say what ODD is not.
//   5. The mark, breathing. The steam displacement from the site, as a still.
//   6. Numbered cells and hairline sheets — the catalogue habit, the 2px gap.
//   7. Premise, then point. The first half quiet (40%), the second full.
//
// Everything else is inherited from build.mjs: five sizes, two faces, Ink or
// Paper, real photographs, real copy. Photo credits are placeholders until the
// photographer's name is added — see README.md.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// The mark's path, from the one source the site uses. Never a redrawn copy.
export const MARK = readFileSync(
  join(HERE, '../../../../src/components/primitives/Logo.astro'),
  'utf8',
).match(/ d="([^"]+)"/)[1];

const A = '../../../src/assets';
const CREDIT = 'Photo: ODDfest';

export const css = `
/* 1. The square is the photograph; the words live in the bands. */
.sq { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; overflow: hidden;
  background: var(--color-paper-06) }
.sq img { width: 100%; height: 100%; object-fit: cover; display: block;
  filter: contrast(1.05) saturate(1.1) }
.band { position: absolute; left: 64px; right: 64px; height: 135px; display: flex;
  align-items: center; justify-content: space-between; gap: 32px; z-index: 2 }
.band.top { top: 0 } .band.bot { bottom: 0 }
.band .eyebrow { flex: none }
.band .line { flex: 1 1 auto; min-width: 0; font: 400 46px/1.12 var(--font-display);
  letter-spacing: -0.01em; margin: 0 }
.band .signal { color: #5081b3 } body.paper .band .signal { color: #40618c }

/* 2. Type as image: one word or figure, bigger than the tile. SVG text so the
   centring is exact even when the word is wider than the canvas. */
.loud { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; overflow: hidden }
.loud svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible }
.loud text { font-family: var(--font-display); text-transform: uppercase; fill: currentColor }

/* 3. Through the lobes: the mark as a window. */
.lobes-wrap, .steam-wrap, .alone { position: absolute; top: 135px; left: 0; right: 0; height: 1080px;
  display: grid; place-items: center }
svg.lobes, svg.steam { display: block; height: auto }

/* 4. The strike-through: the line stays loud, the word goes quiet. */
s.strike { text-decoration: line-through; text-decoration-thickness: 0.11em;
  text-decoration-color: var(--color-paper); color: var(--color-paper-40) }

/* 6. Numbered cells and the nine-frame sheet. */
.cells { position: absolute; top: 135px; left: 64px; right: 64px; height: 1080px; display: grid;
  grid-template-rows: repeat(3, 1fr) }
.cells > div { border-top: 1px solid var(--color-paper-12); padding-top: 36px; display: grid;
  grid-template-columns: 110px 1fr; gap: 24px; align-items: start; min-height: 0 }
.cells .num { font: 600 26px/1.7 var(--font-body); letter-spacing: 0.16em; color: var(--color-paper-40) }
.cells .txt { font: 400 46px/1.12 var(--font-display); letter-spacing: -0.01em; margin: 0 }
.sheet { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; display: grid;
  grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2px;
  background: var(--color-paper-12); overflow: hidden }
.sheet img { width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: cover; display: block;
  filter: contrast(1.05) saturate(1.1) }

/* Three tiles, one room: the panorama lives in the square band of a 3× canvas. */
.pano { position: absolute; top: 135px; left: 0; right: 0; height: 1080px; overflow: hidden }
.pano img { width: 100%; height: 100%; object-fit: cover; display: block; filter: contrast(1.05) saturate(1.1) }

/* Stories keep the same devices inside the 9:16 safe area. */
.story-mid { position: absolute; top: 320px; bottom: 320px; left: 0; right: 0; display: grid;
  place-items: center; align-content: center; gap: 48px }
`;

// Device 1 — the square photograph with an eyebrow + credit above and one line below.
const sq = ({
  img,
  pos = 'center',
  zoom = 1,
  eyebrow,
  quiet,
  line,
  credit = CREDIT,
  eyebrowClass = '',
}) => `
  <div class="band top"><p class="eyebrow ${eyebrowClass}">${eyebrow}</p><p class="eyebrow">${credit}</p></div>
  <div class="sq"><img src="${img}" style="object-position:${pos};transform:scale(${zoom});transform-origin:${pos}" alt=""></div>
  <div class="band bot"><p class="line">${quiet ? `<span class="quiet">${quiet}</span> ` : ''}${line}</p></div>`;

// Device 2 — one word or figure, bigger than the tile, exactly centred.
const loud = (word, size, dx = 0) => `
  <div class="loud"><svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <text x="${540 + dx}" y="540" text-anchor="middle" dominant-baseline="central"
      font-size="${size}" letter-spacing="${-0.04 * size}">${word}</text>
  </svg></div>`;

// Device 3 — the mark as a window over a photograph.
const lobes = (img, width, pos = 'xMidYMid') => `
  <svg class="lobes" viewBox="0 0 434.41 137.892" width="${width}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="lb"><path d="${MARK}"/></clipPath></defs>
    <image href="${img}" width="434.41" height="137.892" preserveAspectRatio="${pos} slice" clip-path="url(#lb)"/>
  </svg>`;

// Device 5 — the site's steam filter, frozen on one frame.
const steam = (width, fill) => `
  <svg class="steam" viewBox="-60 -60 554 258" width="${width}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="st" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="n1"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="2" seed="3" result="n2"/>
      <feComposite in="n1" in2="n2" operator="arithmetic" k1="0" k2="0.6" k3="0.6" k4="0" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs>
    <path d="${MARK}" fill="${fill}" filter="url(#st)"/>
  </svg>`;

export const posts = [
  {
    n: 21,
    kind: 'The loud figure',
    family: 'Evidence',
    why: 'Type as image. The figure is bigger than the tile; the sentence it belongs to sits in the band.',
    caption:
      '274 people, artists, collectives and organisations made ODDfest 2026. Together. All of them, alphabetically, at allthingsodd.co/oddfest-2026.',
    html: `
      <div class="band top"><p class="eyebrow">ODDfest 2026 · who made it</p></div>
      ${loud('274', 760)}
      <div class="band bot"><p class="line"><span class="quiet">People, artists, collectives and organisations.</span> Together.</p></div>`,
  },
  {
    n: 22,
    kind: 'Through the lobes',
    family: 'People',
    why: 'The mark as a window. The photograph is the room; the shape is ours.',
    caption:
      'People can work independently, host things and cross paths with others working on very different things. ODDspace, Vallila. Photo: ODDfest / photographer.',
    html: `
      <div class="band top"><p class="eyebrow">ODDspace · opening night</p><p class="eyebrow">${CREDIT}</p></div>
      <div class="lobes-wrap">${lobes(`${A}/oddspace/opening-audience-close.jpg`, 1000)}</div>
      <div class="band bot"><p class="line"><span class="quiet">Cross paths with others</span> working on very different things.</p></div>`,
  },
  {
    n: 23,
    kind: 'The strike-through',
    family: 'Voice',
    why: 'The nav habit, used to say what ODD is not. The line stays loud, the word goes quiet.',
    caption:
      'ODDfest doesn’t produce the events for you. It brings independently made events together so they’re easier to discover, reach wider audiences and become part of one bigger citywide week.',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">ODDfest</p>
        <p class="t-hero"><s class="strike">A festival.</s><br>A week.</p>
        <p class="t-body muted" style="max-width:26ch">Independently made events across Helsinki, brought together into one shared programme.</p>
      </div>`,
  },
  {
    n: 24,
    kind: 'The honest strike',
    family: 'Invitation',
    ground: 'paper',
    why: 'The banned phrase, crossed out. Saying what is undecided is the ask.',
    caption:
      'ODDfest 2027 dates are not fixed. We are collecting event ideas now, before they are — which is the best moment to bring one. An idea still at the notes-on-your-phone stage is a fine thing to send. allthingsodd.co/oddfest',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">ODDfest 2027</p>
        <p class="t-hero"><s class="strike">Coming soon.</s><br>Not announced yet.</p>
        <p class="t-body muted" style="max-width:26ch">The dates are not fixed. Ideas are being collected now — the best moment to bring one.</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>`,
  },
  {
    n: 25,
    kind: 'Three tiles, one room',
    family: 'People',
    wide: 3,
    why: 'A panorama across the top row of the profile. Posted c, b, a so it lands in order.',
    caption:
      'Workspace, studios, events and community under one roof. ODDspace opening night, Vallila. Photo: ODDfest / photographer.',
    html: `
      <div class="pano"><img src="${A}/oddspace/opening-full-house.jpg" style="object-position:center 68%" alt=""></div>
      <div class="band top" style="right:auto;width:952px"><p class="eyebrow">ODDspace · opening night · Vallila</p></div>
      <div class="band bot" style="right:auto;width:952px"><p class="line"><span class="quiet">Workspace, studios, events and community</span> under one roof.</p></div>
      <div class="band top" style="left:2224px;justify-content:flex-end"><p class="eyebrow">${CREDIT}</p></div>`,
  },
  {
    n: 26,
    kind: 'Nine frames',
    family: 'Evidence',
    why: 'The contact sheet as a tile: one night, nine frames, the ground showing through 2px gaps.',
    caption:
      'Club Theatre took over the main hall: dancers, DJs, actors, models and visual artists building one night in real time, directed by Tyre. Vanha Ylioppilastalo, ODDfest 2026. Photos: ODDfest / photographer.',
    html: `
      <div class="band top"><p class="eyebrow">ODDfest 2026 · Vanha Ylioppilastalo</p><p class="eyebrow">Photos: ODDfest</p></div>
      <div class="sheet">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<img src="images/ballroom-0${i}.jpg" alt="">`).join('')}</div>
      <div class="band bot"><p class="line"><span class="quiet">Club Theatre took over the main hall.</span> Directed by Tyre.</p></div>`,
  },
  {
    n: 27,
    kind: 'Hands',
    family: 'Evidence',
    why: 'Close enough to see the strings. The square is the photograph; nothing sits on it.',
    caption: 'Somebody’s hands, somebody’s night. ODDfest 2026. Photo: ODDfest / photographer.',
    html: sq({
      img: 'images/harp-singer.jpg',
      pos: '38% center',
      eyebrow: 'ODDfest 2026 · Music',
      quiet: 'Somebody’s hands,',
      line: 'somebody’s night.',
    }),
  },
  {
    n: 28,
    kind: 'The room, mid-move',
    family: 'People',
    why: 'The audience and the performer in one frame, at eye level.',
    caption:
      'You are the heroes of ODD. Vanha Ylioppilastalo, ODDfest 2026. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddfest-2026/dance-worlds-crowd.jpg`,
      pos: 'center 40%',
      eyebrow: 'ODDfest 2026 · Vanha Ylioppilastalo',
      quiet: 'You are',
      line: 'the heroes of ODD.',
    }),
  },
  {
    n: 29,
    kind: 'The maker',
    family: 'People',
    why: 'Somebody making something, mid-stroke. The act is named because the file names it; no face is.',
    caption:
      'Bring what you do best. Valiobeats, live painting, ODDfest 2026. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddfest-2026/valiobeats-live-painting.jpg`,
      pos: 'center 42%',
      eyebrow: 'ODDfest 2026 · Valiobeats · live painting',
      line: 'Bring what you do best.',
    }),
  },
  {
    n: 30,
    kind: 'Lunch, on Paper',
    family: 'Place',
    ground: 'paper',
    why: 'ODDspace inverts the whole palette; the most ordinary photograph gets the light ground.',
    caption: 'Talks, sets, lunches, work. ODDspace, Vallila. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddspace/everyday-lunch.jpg`,
      pos: 'center 58%',
      eyebrow: 'ODDspace · Vallila · an ordinary day',
      quiet: 'Talks, sets, lunches,',
      line: 'work.',
    }),
  },
  {
    n: 31,
    kind: 'The studio',
    family: 'Place',
    why: 'A detail says the room. The price lives in the caption, from the site.',
    caption:
      'A room built for making sound — recording, co-writing, production. Run with TUNEMENT. From €20 / hour for members, €30 without. allthingsodd.co/oddspace. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddstudio/microphone-detail.jpg`,
      pos: 'center 45%',
      eyebrow: 'ODDstudio · run with TUNEMENT',
      line: 'A room built for making sound.',
    }),
  },
  {
    n: 32,
    kind: 'ODDference, experienced',
    family: 'Programme',
    why: 'Signal marks the business side; the photograph proves the line. Named because the file names her.',
    caption:
      'Don’t just hear the argument. Experience it. Elisabet Lahti at ODDference 2026. ODDference 2027: Helsinki, dates not announced. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddfest-2026/oddference-elisabet-lahti.jpg`,
      pos: '62% 82%',
      zoom: 1.45,
      eyebrow: 'ODDference 2026 · Elisabet Lahti',
      eyebrowClass: 'signal',
      quiet: 'Don’t just hear the argument.',
      line: 'Experience it.',
    }),
  },
  {
    n: 33,
    kind: 'Numbered',
    family: 'Programme',
    ground: 'paper',
    why: 'The catalogue habit: 01–03, hairlines, the ground showing through.',
    caption:
      'How ODDfest works. You create the event, in your own way. We build the shared identity, programme, communications, PR and map around the week. For a few days, independent work across Helsinki becomes easier to find as one whole. allthingsodd.co/oddfest',
    html: `
      <div class="band top"><p class="eyebrow">How ODDfest works</p></div>
      <div class="cells">
        <div><span class="num">01</span><p class="txt">You create the event, in your own way.</p></div>
        <div><span class="num">02</span><p class="txt">We build the shared identity, programme and communications around the week.</p></div>
        <div><span class="num">03</span><p class="txt">For a few days, independent work across Helsinki becomes easier to find as one whole.</p></div>
      </div>`,
  },
  {
    n: 34,
    kind: 'The mark, breathing',
    family: 'Voice',
    why: 'The site’s steam filter, frozen on one frame. The living layer, in a still.',
    caption: 'Stay ODD.',
    html: `
      <div class="steam-wrap">${steam(1060, '#e2dfde')}</div>
      <div class="band bot"><p class="line">Stay ODD.</p></div>`,
  },
  {
    n: 35,
    kind: 'The pill, alone',
    family: 'Invitation',
    why: 'The odd one out: the only round thing on a square grid, and nothing else on the tile.',
    caption: 'That is the whole post. allthingsodd.co/oddfest',
    html: `<div class="alone"><span class="pill-mock" style="justify-self:center">Submit an event idea</span></div>`,
  },
  {
    n: 36,
    kind: 'Talks',
    family: 'People',
    why: 'A speaker, named because the source names her, in the square.',
    caption: 'Salomé Daoudi (DK), Talks, ODDfest 2026. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddfest-2026/salome-daoudi-talk.jpg`,
      pos: '36% 55%',
      zoom: 1.2,
      eyebrow: 'ODDfest 2026 · Talks',
      line: 'Salomé Daoudi (DK)',
    }),
  },
  {
    n: 37,
    kind: 'A talk at ODDspace',
    family: 'Place',
    why: 'The everyday programme: a small room, a microphone, people who came.',
    caption:
      'The space is a pilot for something larger, and the people using it help shape what it becomes. ODDspace, Vallila. Photo: ODDfest / photographer.',
    html: sq({
      img: `${A}/oddspace/opening-panel.jpg`,
      pos: '40% center',
      eyebrow: 'ODDspace · a talk',
      quiet: 'A pilot for something larger.',
      line: 'The people using it help shape it.',
    }),
  },
];

export const stories = [
  {
    n: 4,
    kind: 'The honest strike',
    ground: 'paper',
    html: `
      <div class="pad-story flow-center">
        <p class="eyebrow">ODDfest 2027</p>
        <p class="t-hero"><s class="strike">Coming soon.</s><br>Not announced yet.</p>
        <p class="t-body muted">The dates are not fixed. Ideas are being collected now.</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>`,
  },
  {
    n: 5,
    kind: 'Through the lobes',
    html: `
      <div class="story-mid">
        ${lobes(`${A}/about/oddfest-2025-terrace-crowd.jpg`, 900)}
        <p class="eyebrow">Last night · ${CREDIT}</p>
      </div>`,
  },
];

export const reels = [
  {
    n: 1,
    kind: 'Reel cover · the loud word',
    html: `
      ${loud('FEST', 530, -17)}
      <div class="band bot"><p class="eyebrow">Reel · ODDfest 2026</p></div>`,
  },
  {
    n: 2,
    kind: 'Reel cover · the square',
    html: sq({
      img: 'images/theatre-purple.jpg',
      eyebrow: 'Reel · ODDtheatre',
      line: 'One hall, one night, in real time.',
    }),
  },
];
