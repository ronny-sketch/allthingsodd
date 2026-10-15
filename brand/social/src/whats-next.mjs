// The week's posts: four "what's next" carousels and one three-frame post for
// the All Things ODD launch week, October 2026 — sixth pass, 9 Oct: news from
// ODD, after Uusi Juttu, with more hands in it.
//
// The model (Ronny, 9 Oct): every other frame a photograph, every other frame
// text on Ink. A photograph always carries a heading; the text frame after it
// explains. These are news, so they read like a media account's carousel
// (Uusi Juttu is the reference: cover with the headline, then one idea a
// frame in the same bottom-left column, an ask, the brand card).
//
// What is ODD's about it:
//   1. The cover is the site's hero — the dateline in Forta, one fact a line, over the
//      Forta title put through the website's warp (src/scripts/warping-text.ts:
//      per-word blur thresholded to blobs, then displaced by three drifting
//      radial gradients). Reproduced here as static SVG filters so Playwright
//      renders one frozen instant; `t` is the instant. The photographer is
//      credited up the right edge, the way a magazine does it.
//   2. Photo frames keep the pass-4 gesture: Forta, Paper, bottom left, a few
//      words, under a soft Ink gradient. Once a carousel the photograph is seen
//      through one lobe of the mark (the window) — any of the three lobes, and
//      the whole mark across three frames in the three-part post.
//   3. Text frames are Ink and use the whole frame: the lead at the top, the
//      explanation at the bottom, the same 64px left edge as the headings, no
//      mark (Ronny, 11 Oct: no logo in every empty space; text should use the
//      frame, not half of it). Four kinds, so no two text frames in a carousel
//      look alike: the explainer (Forta lead + two short paragraphs), the Q&A (a
//      Forta question, the site's own FAQ answer), the number (a 200px Forta
//      figure) and the list (Forta lines).
//   4. Every carousel ends with the Paper card, which is the ask: the product,
//      date and offer, the mark filled with a photograph, "Read more at:" and
//      the address. Only the vision carousel's card carries the mission.
//
// Lines are the site's words, verbatim or trimmed; facts from allthingsodd.co
// on 9 Oct 2026. `alt` is the alt text. Credits are "ODDfest / name" from
// src/components/sections/photo-credits.json; a null is unknown. NOTES.md in
// the export folder lists them per frame for Aki's captions.
// `flag` on a frame = what a person must check before it is posted; `hook` on a
// LinkedIn carousel = the draft first line of the post. canvas.mjs puts both in
// the canvas notes; a photo frame with a null credit is flagged on its own.
//
//   node build.mjs --only=oddfest-whats,oddference-whats,oddspace-whats,odd-vision,odd-in-three \
//     --out=~/Projects/AI/exports/odd-social/2026-10-whats-next
//
// Eighth pass, 15 Oct — Aki's final templates (Canva, 14 Oct) carried back in.
// What he changed, and what every set now does:
//   - Every heading and lead is Forta, the brand's display face, in caps: the
//     text frame's lead too (it was Gabarito SemiBold). Gabarito is the body only.
//   - Text frames are one kind by default: a Forta lead that makes a claim, then
//     two short paragraphs, the substance and a kicker line. No bold phrase.
//   - Photo headings are reasons, written to the reader and parallel across the
//     carousel ("Host a club night." / "Host a performance." / "Host a workshop.");
//     a heading may sit at the top (`at: 'top'`), a photo may go black and white
//     (`bw`) so mixed light reads as one set.
//   - The cover's dateline is Forta, one fact a line; the title fills the
//     column (sized to fit) and has no full stop.
//   - The card is the ask, on Instagram too: the product and date, the offer,
//     the mark filled with a photo, "Read more at:" and the page's address, all
//     in Forta at a size a phone can read. No "Link in bio." frame.
//   - Each carousel can bring two stories (1080×1920): a teaser line that turns
//     ("ODDfest is coming back." / "Just not in the same shape.") and the ask
//     ("Want to take part? See more ↓"), with room below for the shared post.
//   - The profile grid crops 4:5 posts to 3:4 at the sides (since Jan 2025), not
//     to a square, so headings sit 80px from the edge; the 148px band is gone.
import { A, I, MARK } from './posts.mjs';

export const css = `
.ph { position: absolute; inset: 0; overflow: hidden; background: var(--color-bg); color: var(--color-paper) }
.ph > img { width: 100%; height: 100%; object-fit: cover; display: block }
.ph.bw > img { filter: grayscale(1) contrast(1.06) }
.ph .scrim { position: absolute; inset: 0; background: linear-gradient(to top, rgb(14 9 11 / 64%), rgb(14 9 11 / 0%) 44%) }
.ph .scrim.top { background: linear-gradient(to bottom, rgb(14 9 11 / 64%), rgb(14 9 11 / 0%) 44%) }
/* The gesture: Forta, Paper, bottom left (or top left), two balanced lines. The grid's 3:4 crop takes ~34px a side, never the top or bottom. */
.ph .words { position: absolute; left: 64px; right: 64px; bottom: 80px; margin: 0 }
.ph .words.top { top: 80px; bottom: auto }
.ph .point { font: 400 80px/1.02 var(--font-display); letter-spacing: -0.015em; margin: 0; max-width: 760px; text-wrap: balance }
.ph .point.long { font: 400 60px/1.06 var(--font-display); letter-spacing: -0.01em; max-width: none }
/* The window: the mark at 2800px wide with one lobe centred in the frame, lifted so the heading lands on Ink below it. */
.ph .window { position: absolute; inset: 0; overflow: hidden }
.ph .window svg { position: absolute; top: 44%; transform: translateY(-50%); display: block; height: auto; max-width: none }

/* The cover: the site's hero. A flat Ink veil, the dateline, the warped title, centred; the photographer up the right edge. */
.cover .veil { position: absolute; inset: 0; background: rgb(14 9 11 / 52%) }
.cover .head { position: absolute; left: 64px; right: 64px; top: 50%; transform: translateY(-50%); text-align: center }
.cover .dateline { font: 400 42px/1.45 var(--font-display); letter-spacing: 0.16em; color: var(--color-paper); margin: 0 0 48px }
.cover h1 { font: 400 104px/0.98 var(--font-display); letter-spacing: -0.02em; margin: 0; filter: url(#wd) } /* size set per title, see fit() */
.cover h1 span { display: inline-block }
.cover .credit { position: absolute; right: 40px; bottom: 148px; margin: 0; writing-mode: vertical-rl; transform: rotate(180deg);
  font: 400 22px/1 var(--font-body); letter-spacing: 0.04em; color: var(--color-paper-60) }
/* Variant B: the mark filled with the cover photograph on Paper, the title in Ink under it (body.paper flips the palette).
   Variant C: no photograph, the title alone on Ink at 128px, on a 984px column (no credit to clear). */
.cover .mk { display: block; width: 952px; height: auto; margin: 0 auto 64px }
.cover-c .head { left: 48px; right: 48px } .cover-c h1 { font-size: 128px }
/* On Paper the window needs no scrim: the heading already sits on the ground. */
.paper .ph.win .scrim { display: none }

/* The text frame: Ink, the whole frame. A Forta lead at the top, the body at the bottom (a blank line between paragraphs), the same 64px left edge as the headings; nothing else. */
.tx { position: absolute; inset: 0; background: var(--color-bg); color: var(--color-paper) }
.tx .top { position: absolute; left: 64px; right: 96px; top: 148px; display: grid; gap: 28px }
.tx .bottom { position: absolute; left: 64px; right: 96px; bottom: 148px; display: grid; gap: 69px }
.tx p { margin: 0; font: 400 50px/1.38 var(--font-body); color: var(--color-paper-80); max-width: 920px }
.tx .lead, .tx .q { font: 400 66px/1.12 var(--font-display); letter-spacing: -0.01em; color: var(--color-paper); max-width: 880px; text-wrap: balance }
.tx .sub { font: 600 50px/1.3 var(--font-body); color: var(--color-paper) }
.tx p b { font-weight: inherit; color: inherit } /* no bold phrase (Aki, 14 Oct): <b> left in older copy reads plain */
.tx .big { font: 400 200px/0.95 var(--font-display); letter-spacing: -0.03em; color: var(--color-paper) }
.tx .list { display: grid; gap: 0 }
.tx .list p { font: 400 54px/1.1 var(--font-display); letter-spacing: -0.01em; color: var(--color-paper); max-width: none; text-wrap: balance }
.tx .list .sp { height: 24px }
.tx .url { font: 600 50px/1.3 var(--font-body); color: var(--color-paper) }

/* The three-part post: one 3240px render, the mark across it with a lobe a frame, cut into a, b, c. */
.three { position: absolute; inset: 0; overflow: hidden; background: var(--color-bg); color: var(--color-paper) }
.three svg { position: absolute; top: 44%; transform: translateY(-50%); display: block; height: auto; max-width: none }
.three .point { position: absolute; bottom: 80px; margin: 0; font: 400 80px/1.02 var(--font-display); letter-spacing: -0.015em }

/* The card is the ask: the product, date and offer, the mark filled with a photo, where to read more. One centred stack, Forta, readable on a phone. */
.card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 96px;
  padding: 96px 64px; text-align: center; background: var(--color-paper); color: var(--color-bg) }
.card p { margin: 0; font: 400 52px/1.36 var(--font-display); max-width: 952px; text-wrap: balance }
.card p span { display: block }
.card svg { width: 132px; height: auto; fill: currentColor; flex: none }
.card svg.filled { width: 760px }

/* Stories, 1080×1920. Instagram's bars cover ~250px at the top and the bottom, so nothing goes there.
   The teaser: a line top left that turns bottom right. The ask: a question and "See more", centred high, the lower half left for the shared post. */
.st .veil { position: absolute; inset: 0; background: linear-gradient(rgb(14 9 11 / 56%), rgb(14 9 11 / 0%) 30% 70%, rgb(14 9 11 / 56%)) }
.st.ask .veil { background: rgb(14 9 11 / 36%) }
.st .point { position: absolute; margin: 0; font: 400 80px/1.1 var(--font-display); letter-spacing: -0.015em; max-width: 760px; text-wrap: balance }
.st .p-top { left: 64px; top: 250px }
.st .p-bottom { right: 64px; bottom: 250px; text-align: right }
.st .box { position: absolute; left: 64px; right: 64px; top: 560px; display: grid; justify-items: center; gap: 88px; text-align: center }
.st .box .point { position: static; font-size: 88px; max-width: 700px }
.st .box svg { width: 36px; height: 88px; margin-top: -64px; fill: none; stroke: currentColor; stroke-width: 4 }
`;

// ── The warp, frozen. Same maths as warping-text.ts at one instant t: the map is
// three radial gradients orbiting the title box; each word's blur follows its
// own phase and is thresholded back to a hard edge.
// `p` pads the map with neutral grey on every side: where a filter region runs past the map, the
// displacement reads garbage and paints a ghost of the first line above the title (C's 128px showed it).
export const warp = (title, t, fs = 104, H = 600, W = 952, p = 0) => {
  const cx = (k, f = 0.4) => p + W / 2 + Math.cos(t * 0.75 + k * 2.09) * f * W;
  const cy = (k, f = 0.4) => p + H / 2 + Math.sin(t * 0.75 + k * 2.09) * f * H;
  const grad = (id, x, y, r, c) =>
    `<radialGradient id="${id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const fill = (id) => `<rect width="100%" height="100%" fill="url(#${id})"/>`;
  const map = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * p}" height="${H + 2 * p}"><defs>${grad('a', cx(0), cy(0), W * 0.5, 'white')}${grad('b', cx(1), cy(1), W * 0.5, 'white')}${grad('c', cx(2, 0.2), cy(2, 0.2), W * 0.3, 'black')}</defs><rect width="100%" height="100%" fill="rgb(127,127,127)"/>${fill('a')}${fill('b')}${fill('c')}</svg>`;
  const words = title.split(' ');
  const blurs = words.map((_, i) => {
    // Capped at fs × 0.035: the site's extreme (0.05) closes Forta's counters on a frozen frame.
    const sd = Math.min(
      (Math.cos((i * Math.PI) / 2 + t) * 0.5 + 0.5) * fs * 0.05,
      fs * 0.035,
    ).toFixed(2);
    return `<filter id="wb${i}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${sd}"/><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -10"/></filter>`;
  });
  const defs = `<svg width="0" height="0" style="position:absolute"><defs>${blurs.join('')}<filter id="wd" x="-10%" y="-20%" width="120%" height="140%" primitiveUnits="userSpaceOnUse"><feImage href="data:image/svg+xml;base64,${Buffer.from(map).toString('base64')}" x="${-p}" y="${-p}" width="${W + 2 * p}" height="${H + 2 * p}" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="${(W * 0.04).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>`;
  const h1 = words.map((w, i) => `<span style="filter:url(#wb${i})">${w}</span>`).join(' ');
  return { defs, h1 };
};

// The cover in three variants. A: the photograph under an Ink veil (the site's hero).
// B: the mark filled with the photograph, on Paper. C: the title alone, bigger.
// cover() returns A and remembers its arguments, so variant() can redraw it as B or C.
const COVERS = new Map();
const pic = ({ img, pos = 'center', zoom = 1, blur = 0 }) =>
  `<img src="${img}" style="object-position:${pos};transform:scale(${zoom});transform-origin:${pos}${blur ? `;filter:blur(${blur}px)` : ''}" alt="">`;
const br = (s) => s.replaceAll('\n', '<br>');

// How many lines `text` takes at `fs` px in a `W` px column, by character count.
// ponytail: 0.62 em a character is Forta 1's caps average; canvas.mjs render catches what still overflows.
const lines = (text, fs, W) => {
  const per = Math.floor(W / (fs * 0.62));
  let n = 0,
    count = 1;
  for (const w of text.split(' ')) {
    n = n ? n + 1 + w.length : w.length;
    if (n > per) (count++, (n = w.length));
  }
  return count;
};
// The title fills the column: the largest size up to 128px that sets it in three lines or fewer.
export const fit = (title, W = 952) => {
  for (let fs = 128; fs > 72; fs -= 2) if (lines(title, fs, W) <= 3) return fs;
  return 72;
};

export const coverHtml = (
  { img, pos = 'center', zoom = 1, dateline, title, t = 1, credit },
  v = 'a',
) => {
  const T = title.replace(/\.$/, '').toUpperCase(); // a title, not a sentence: no full stop
  const fs = v === 'c' ? 128 : fit(T);
  const { defs, h1 } = v === 'c' ? warp(T, t, 128, 900, 984, 160) : warp(T, t, fs);
  const photo = v === 'a' ? `${pic({ img, pos, zoom })}<div class="veil"></div>` : '';
  const mk =
    v === 'b'
      ? `<svg viewBox="0 0 434.41 137.892" class="mk" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="ck"><path d="${MARK}"/></clipPath></defs><image href="${img}" width="434.41" height="137.892" preserveAspectRatio="xMidYMid slice" clip-path="url(#ck)"/></svg>`
      : '';
  return `<div class="ph cover${v === 'a' ? '' : ` cover-${v}`}">${photo}${defs}<div class="head">${mk}<p class="dateline">${dateline.split(' · ').join('<br>')}</p><h1 style="font-size:${fs}px">${h1}</h1></div>${credit && v !== 'c' ? `<p class="credit">Photo: ${credit}</p>` : ''}</div>`;
};
const cover = (args) => {
  const html = coverHtml(args);
  COVERS.set(html, args);
  return html;
};

// ── The mark as a window. The three lobes' x-extents in the mark's own
// viewBox, measured 9 Oct 2026 (the necks between them sit at 161.4 and 292.4).
const LOBES = [
  [0, 161.4],
  [161.4, 292.4],
  [292.4, 434.41],
];
const CLIP = `<defs><clipPath id="win"><path d="${MARK}"/></clipPath></defs>`;
const inLobe = (img, lobe) => {
  const [x0, x1] = LOBES[lobe];
  return `<image href="${img}" x="${x0}" width="${(x1 - x0).toFixed(2)}" height="137.892" preserveAspectRatio="xMidYMid slice" clip-path="url(#win)"/>`;
};
const window = (img, lobe = 0, width = 2800) => {
  const s = width / 434.41,
    [x0, x1] = LOBES[lobe];
  const left = 540 - ((x0 + x1) / 2) * s;
  return `<div class="window"><svg viewBox="0 0 434.41 137.892" width="${width}" style="left:${left.toFixed(0)}px" xmlns="http://www.w3.org/2000/svg">${CLIP}${inLobe(img, lobe)}</svg></div>`;
};

// A heading is 80px in two lines; one that needs three goes `long`: 60px across the column.
const ph = ({
  img,
  win,
  lobe = 0,
  pos,
  zoom,
  point,
  long = lines(strip(point), 80, 760) > 2,
  at,
  bw,
}) =>
  `<div class="ph${win ? ' win' : ''}${bw ? ' bw' : ''}">${win ? window(win, lobe) : pic({ img, pos, zoom })}<div class="scrim${at === 'top' ? ' top' : ''}"></div><div class="words${at === 'top' ? ' top' : ''}"><p class="point${long ? ' long' : ''}">${point}</p></div></div>`;

// Stories (1080×1920). The teaser turns a line in two: top left, then bottom right.
const tease = ({ top, bottom, ...p }) =>
  `<div class="ph st">${pic(p)}<div class="veil"></div><p class="point p-top">${top}</p><p class="point p-bottom">${bottom}</p></div>`;
// The ask: the photo blurred to a ground, a question, where to look. The lower half stays free for the shared post.
const ARROW = '<svg viewBox="0 0 36 88"><path d="M18 0v84M4 70l14 14 14-14"/></svg>';
const ask = ({ q, more = 'See more', ...p }) =>
  `<div class="ph st ask">${pic({ zoom: 1.12, blur: 18, ...p })}<div class="veil"></div><div class="box"><p class="point">${q}</p><p class="point">${more}</p>${ARROW}</div></div>`;

// The three-part post: the necks land at x = 1120 and 2120, so each 1080px frame holds one lobe (the O loses 112px at the left edge).
// `single` lays the whole mark across one 1.91:1 image for LinkedIn, the names centred under each lobe.
const three = (panels, single = false) => {
  const W = single ? 2400 : 3316,
    s = W / 434.41;
  const left = single ? 90 : 1120 - LOBES[1][0] * s;
  const at = (i) =>
    single
      ? `left:${(left + ((LOBES[i][0] + LOBES[i][1]) / 2) * s).toFixed(0)}px;transform:translateX(-50%)`
      : `left:${64 + i * 1080}px`;
  return `<div class="three"><svg viewBox="0 0 434.41 137.892" width="${W}" style="left:${left.toFixed(0)}px" xmlns="http://www.w3.org/2000/svg">${CLIP}${panels.map((p, i) => inLobe(p.img, i)).join('')}</svg>${panels.map((p, i) => `<p class="point" style="${at(i)}">${p.point}</p>`).join('')}</div>`;
};

// `url` (LinkedIn only) prints the address on the frame: there is no link in bio there, the link goes in the post.
const wrap = (top, bottom, url) =>
  `<div class="tx"><div class="top">${top}</div><div class="bottom">${bottom}${url ? `<p class="url">${url}</p>` : ''}</div></div>`;
// A blank line in a body starts a new paragraph: the substance, then the kicker.
const paras = (s) =>
  s
    .split('\n\n')
    .map((p) => `<p>${br(p)}</p>`)
    .join('');
const tx = ({ lead, body, url }) => wrap(`<p class="lead">${br(lead)}</p>`, paras(body), url);
const qa = ({ q, a, url }) => wrap(`<p class="q">${br(q)}</p>`, paras(a), url);
const num = ({ big, lead, body, url }) =>
  wrap(`<p class="big">${big}</p><p class="sub">${lead}</p>`, paras(body), url);
// The list: a quiet line to start, then the items in Forta; '' leaves a breath before the last one.
const list = ({ lead, items }) =>
  wrap(
    `<p>${lead}</p>`,
    `<div class="list">${items.map((i) => (i ? `<p>${i}</p>` : '<div class="sp"></div>')).join('')}</div>`,
  );

const MISSION =
  'ODD exists to build better conditions for creative work — and to bring creative and cultural fields closer to business and wider society.';
// The card is the ask: `top` (or the older `line`) is the product, date and offer, one fact a line
// (' · ' or '\n'); then the mark; then `more` and the page's address.
// Each line is its own block so a long one balances instead of leaving a word alone; '' is a blank line.
const card = ({ top, line = '', fill, url = 'allthingsodd.co', more = 'Read more at:' }) => `
  <div class="card"><p>${(top ?? line)
    .replaceAll(' · ', '\n')
    .split('\n')
    .map((l) => `<span>${l || '&nbsp;'}</span>`)
    .join('')}</p>
    <svg viewBox="0 0 434.41 137.892" class="${fill ? 'filled' : ''}" xmlns="http://www.w3.org/2000/svg">${fill ? `<defs><clipPath id="cm"><path d="${MARK}"/></clipPath></defs><image href="${fill}" width="434.41" height="137.892" preserveAspectRatio="xMidYMid slice" clip-path="url(#cm)"/>` : `<path d="${MARK}"/>`}</svg>
    <p>${more}<span style="font-size:${Math.min(52, Math.floor(952 / (url.length * 0.66)))}px">${url}</span></p></div>`; // an address can't wrap: a long one steps down

const by = (name) => (name ? `ODDfest / ${name}` : null);
const num1 = (frames) => frames.map((f, i) => ({ n: i + 1, ...f }));
function strip(s) {
  return s.replace(/<[^>]+>/g, '');
}

// ── The three news carousels, as Aki finalised them in Canva on 14 Oct 2026 (IG ODDfest,
// ODDference, ODDspace in All Things ODD › 01 Marketing › 02 Instagram). Words are his,
// in house style ("Blind Bird", "1 December"); photos are his where the repo has them,
// stand-ins flagged where it doesn't (the posted Canva version keeps his photo).
const DATES =
  'Dates: 19–25 April 2027, as the site says (Ronny chose it 12 Oct). The event-idea form on /oddfest still says “runs 19–26 April”: fix on the site.';
const NAMES2026 =
  '2026 naming: the site calls the five-venue programme ODDfest 2026 and the partner events Creative Week 2026. Both names kept as the site has them.';
const BLIND =
  'Blind Bird: the site says until 1 December 2026 or sold out; the ticket backend’s sales end has been 1 November. Make them agree before posting.';
const STANDIN = (what) =>
  `Stand-in photo: Aki’s Canva version uses ${what}, which isn’t in the repo. Post from Canva, or swap the file in.`;

// ODDfest 2027: a new shape. The week explained, three reasons to host, the ask.
const festCover = `${A}/about/oddfest-2026-tavastia-crowd.jpg`;
const oddfest = num1([
  {
    alt: 'A packed crowd with hands in the air under red light at Tavastia. Helsinki’s creative week, 19–25 April 2027: a new shape for ODDfest. Photo: Julius Töyrylä.',
    flag: DATES,
    credit: by('Julius Töyrylä'),
    html: cover({
      img: festCover,
      pos: 'center 40%',
      dateline: 'Helsinki’s creative week · 19–25 April 2027',
      title: 'A new shape for ODDfest',
      t: 1.0,
      credit: 'Julius Töyrylä',
    }),
  },
  {
    alt: 'Text on Ink. In 2027, ODDfest becomes a week of independently made events across Helsinki. Artists, collectives, venues, organisations, communities and companies are invited to create and produce their own events. ODD brings them together into one shared week.',
    credit: null,
    html: tx({
      lead: 'In 2027, ODDfest becomes a week of independently made events across Helsinki.',
      body: 'Artists, collectives, venues, organisations, communities and companies are invited to create and produce their own events. ODD brings them together into one shared week.',
    }),
  },
  {
    alt: 'Dancers on a fog-covered ballroom floor at Vanha Ylioppilastalo under purple light. Host a club night.',
    credit: by('Ricardo Azevedo e Silva'),
    html: ph({
      img: `${A}/examples/oddtheatre-vanha-ylioppilastalo.jpg`,
      pos: 'center 55%',
      point: 'Host a club night.',
    }),
  },
  {
    alt: 'Text on Ink. Start with what you do best… An exhibition. A performance. A workshop. A screening. A dinner. An open studio. A club night. A conversation. Or something nobody has tried yet.',
    credit: null,
    html: list({
      lead: 'Start with what you do best…',
      items: [
        'An exhibition. A performance.',
        'A workshop. A screening.',
        'A dinner. An open studio.',
        'A club night. A conversation.',
        '',
        'Or something nobody has tried yet.',
      ],
    }),
  },
  {
    alt: 'Two aerial performers hang from a single pole under warm light, seen through the first lobe of the ODD mark. Host a performance.',
    credit: by('@flyingwhalefv'),
    html: ph({ win: `${A}/oddfest-2026/aerial-duo.jpg`, lobe: 0, point: 'Host a performance.' }),
  },
  {
    alt: 'Text on Ink. Different events. Different people. One shared week. Different venues, disciplines, scenes and audiences become part of the same week, giving people more reasons to move between them and discover something they weren’t even looking for.',
    credit: null,
    html: tx({
      lead: 'Different events. Different people. One shared week.',
      body: 'Different venues, disciplines, scenes and audiences become part of the same week, giving people more reasons to move between them and discover something they weren’t even looking for.',
    }),
  },
  {
    alt: 'Two people lead a session in a warm, curtained room while others listen. Host a workshop.',
    flag: STANDIN('a blindfolded participant at a workshop'),
    credit: by('Veikka Muukkonen'),
    html: ph({
      img: `${A}/about/oddfest-2026-workshop.jpg`,
      pos: 'center 45%',
      point: 'Host a workshop.',
    }),
  },
  {
    alt: 'Text on Ink. Each event stays on its own terms. Together, they become ODDfest. A shared programme, identity and map connect what’s happening across the city. Come do your thing.',
    credit: null,
    html: tx({
      lead: 'Each event stays on its own terms.\nTogether, they become ODDfest.',
      body: 'A shared programme, identity and map connect what’s happening across the city. Come do your thing.',
    }),
  },
  {
    alt: 'A Paper card: ODDfest 2027, 19–25 April. The ODD mark filled with the Tavastia crowd photo. Read more at: allthingsodd.co/oddfest',
    flag: DATES,
    credit: by('Julius Töyrylä'),
    html: card({
      top: 'ODDfest 2027\n19–25 April',
      fill: festCover,
      url: 'allthingsodd.co/oddfest',
    }),
  },
]);

// ODDference 2027: a different kind of business conference. Three reasons, the mystery, the offer.
const ferCover = `${A}/oddfest-2026/blomqvist-piano-beams.jpg`;
const ferSeats = `${I}/oddference-audience-seats.jpg`; // the Bio Rex audience: LinkedIn and the three-part post
const ferCard = `${A}/mosaic/13-55344942531.jpg`;
const oddference = num1([
  {
    alt: 'A pianist under beams of stage light. ODDference, 22–23 April 2027, Tanssin talo, Helsinki: a different kind of business conference. Photo: @flyingwhalefv.',
    flag: 'Credit: the site has no credit for blomqvist-piano-beams; @flyingwhalefv shot the rest of that folder. Check before posting.',
    credit: by('@flyingwhalefv'),
    html: cover({
      img: ferCover,
      dateline: 'ODDference · 22–23 April 2027 · Tanssin talo, Helsinki',
      title: 'A different kind of business conference',
      t: 1.9,
      credit: '@flyingwhalefv',
    }),
  },
  {
    alt: 'Text on Ink. In 2027, we’re taking ODDference further. ODDference moves to Tanssin talo and sharpens the idea: a business conference shaped by creative expertise, both on stage and in how the whole experience is built. Fewer, stronger sessions. More deliberate encounters. And more of the conference you simply have to experience in the room.',
    credit: null,
    html: tx({
      lead: 'In 2027, we’re taking ODDference further.',
      body: 'ODDference moves to Tanssin talo and sharpens the idea: a business conference shaped by creative expertise, both on stage and in how the whole experience is built.\n\nFewer, stronger sessions. More deliberate encounters. And more of the conference you simply have to experience in the room.',
    }),
  },
  {
    alt: 'A musician in a red jacket and sunglasses plays the flute through streaks of coloured light. Learn from people outside your field.',
    credit: by('Remu Shemeikka'),
    html: ph({
      img: `${A}/mosaic/46-54584504120.jpg`,
      point: 'Learn from people outside your field.',
    }),
  },
  {
    alt: 'Text on Ink. Creative expertise is useful far beyond the creative industries. Artists, designers, filmmakers, musicians and game makers work with attention, experience, narrative, behaviour, meaning and participation for a living. ODDference brings that expertise into conversations about organisations, business, brands, technology and leadership.',
    credit: null,
    html: tx({
      lead: 'Creative expertise is useful far beyond the creative industries.',
      body: 'Artists, designers, filmmakers, musicians and game makers work with attention, experience, narrative, behaviour, meaning and participation for a living.\n\nODDference brings that expertise into conversations about organisations, business, brands, technology and leadership.',
    }),
  },
  {
    alt: 'Silhouettes of people moving through warm orange light. Meet people outside your usual circles.',
    credit: by('Yoanna Rönnqvist'),
    html: ph({
      img: `${A}/mosaic/67-55338542944.jpg`,
      point: 'Meet people outside your usual circles.',
    }),
  },
  {
    alt: 'Text on Ink. The people in the room are part of the programme. Creative practitioners, business leaders, founders, institutions, researchers and policymakers rarely meet in the same professional setting. ODDference is built to create those encounters.',
    credit: null,
    html: tx({
      lead: 'The people in the room are part of the programme.',
      body: 'Creative practitioners, business leaders, founders, institutions, researchers and policymakers rarely meet in the same professional setting.\n\nODDference is built to create those encounters.',
    }),
  },
  {
    alt: 'Black and white: a dark stage with bars of light and the words “Debate in the dark” projected above it. Experience a conference that doesn’t feel like one.',
    credit: by('Sebastian Hiemann'),
    html: ph({
      img: `${A}/mosaic/61-54612738051.jpg`,
      bw: true,
      point: 'Experience a conference that doesn’t feel like one.',
    }),
  },
  {
    alt: 'Text on Ink. Some things are better left unexplained. ODDference will be more than what happens on stage. Some parts of the event are designed to be discovered in the moment. We could tell you what to expect. But that would defeat the point.',
    credit: null,
    html: tx({
      lead: 'Some things are better left unexplained.',
      body: 'ODDference will be more than what happens on stage. Some parts of the event are designed to be discovered in the moment.\n\nWe could tell you what to expect. But that would defeat the point.',
    }),
  },
  {
    alt: 'A Paper card: ODDference 2027, 22–23 April. Blind Bird tickets now available, €299 + VAT until 1 December or sold out. The ODD mark filled with a photo of people around wooden sculptures. Read more at: allthingsodd.co/oddference',
    flag: BLIND,
    credit: by('Julius Töyrylä'),
    html: card({
      top: 'ODDference 2027, 22–23 April\n\nBlind Bird tickets now available\n€299 + VAT until 1&nbsp;December or sold out',
      fill: ferCard,
      url: 'allthingsodd.co/oddference',
    }),
  },
]);

// ODDspace: a year-round home for creative work. Membership, hosting, the pilot, the ask.
const spaceCover = `${A}/oddspace/opening-full-house.jpg`;
const oddspace = num1([
  {
    alt: 'A full room at ODDspace in Vallila, someone in an ODDfest 2025 T-shirt in front. ODDspace, Teollisuuskatu 9D, Vallila: a year-round home for creative work. Photo: Remu Shemeikka.',
    credit: by('Remu Shemeikka'),
    html: cover({
      img: `${A}/programs/oddspace-card.jpg`,
      dateline: 'ODDspace · Teollisuuskatu 9D, Vallila',
      title: 'A year-round home for creative work',
      t: 1.3,
      credit: 'Remu Shemeikka',
    }),
  },
  {
    alt: 'Text on Ink. Creative work needs more than events. It needs places where people can work, meet, make things and build relationships throughout the year. ODDspace is our way to co-create that kind of communal place in Helsinki.',
    credit: null,
    html: tx({
      lead: 'Creative work needs more than events.',
      body: 'It needs places where people can work, meet, make things and build relationships throughout the year.\n\nODDspace is our way to co-create that kind of communal place in Helsinki.',
    }),
  },
  {
    alt: 'Black and white: a full room of people seated under the beams at ODDspace. Make it your home base.',
    credit: by('Remu Shemeikka'),
    html: ph({
      img: `${A}/oddspace/opening-crowd-dj.jpg`,
      at: 'top',
      bw: true,
      point: 'Make it your home base.',
    }),
  },
  {
    alt: 'Text on Ink. Work here like it’s your own. For €150 a month, members get 24/7 access to the coworking space, shared facilities and meeting rooms, plus member rates on event spaces. One membership. No tiers. No long-term commitment.',
    flag: 'Price: check with Ronny that €150 a month is still current before posting.',
    credit: null,
    html: tx({
      lead: 'Work here like it’s your own.',
      body: 'For €150 a month, members get 24/7 access to the coworking space, shared facilities and meeting rooms, plus member rates on event spaces.\n\nOne membership. No tiers. No long-term commitment.',
    }),
  },
  {
    alt: 'Black and white: the empty gallery floor at ODDspace, pillars and open ceiling. Bring your event here.',
    flag: STANDIN('a dark dance floor full of people'),
    credit: null,
    html: ph({
      img: `${A}/oddspace/gallery-floor.jpg`,
      at: 'top',
      bw: true,
      point: 'Bring your event here.',
    }),
  },
  {
    alt: 'Text on Ink. You don’t need to be a member to host events here. The gallery and auditorium are available for exhibitions, workshops, performances, talks, gatherings and other events. Tell us what you want to do and when. We’ll figure out the rest with you.',
    credit: null,
    html: tx({
      lead: 'You don’t need to be a member to host events here.',
      body: 'The gallery and auditorium are available for exhibitions, workshops, performances, talks, gatherings and other events.\n\nTell us what you want to do and when. We’ll figure out the rest with you.',
    }),
  },
  {
    alt: 'People kneel on the floor painting together on large sheets of paper. Join the people building it.',
    credit: by('Remu Shemeikka'),
    html: ph({
      img: `${A}/oddspace/opening-painting-floor.jpg`,
      at: 'top',
      point: 'Join the people building it.',
    }),
  },
  {
    alt: 'Text on Ink. This is the pilot. The ambition is bigger. We’re working towards a permanent home for Helsinki’s creative industries — a place where artists, creative professionals, companies and institutions can work, meet and build things together. Think Maria 01, but built around the creative economy.',
    credit: null,
    html: tx({
      lead: 'This is the pilot.\nThe ambition is bigger.',
      body: 'We’re working towards a permanent home for Helsinki’s creative industries — a place where artists, creative professionals, companies and institutions can work, meet and build things together.\n\nThink Maria 01, but built around the creative economy.',
    }),
  },
  {
    alt: 'A Paper card: Work here. Host events. Come build with us. The ODD mark filled with the ODDspace opening photo. Teollisuuskatu 9D, Vallila. allthingsodd.co/oddspace',
    credit: by('Remu Shemeikka'),
    html: card({
      top: 'Work here.\nHost events.\nCome build with us.',
      fill: spaceCover,
      more: 'Teollisuuskatu 9D, Vallila',
      url: 'allthingsodd.co/oddspace',
    }),
  },
]);

// Stories (1080×1920), shared alongside each post: the teaser that turns, then the ask.
const story = (frames) => num1(frames.map((f) => ({ h: 1920, ...f })));
const festStory = story([
  {
    alt: 'A guitarist in silhouette in blue stage smoke. ODDfest is coming back. Just not in the same shape.',
    flag: STANDIN('a woman in silhouette holding up a glass in blue light'),
    credit: by('Julius Töyrylä'),
    html: tease({
      img: `${A}/oddfest-2026/2026/blue-silhouette-smoke.jpg`,
      top: 'ODDfest is coming back.',
      bottom: 'Just not in the same shape.',
    }),
  },
  {
    alt: 'A crowd with hands up under red light, blurred. Want to take part? See more.',
    flag: 'Aki made no ask story for ODDfest: this one follows his ODDference ask, on a photo from the repo.',
    credit: by('Julius Töyrylä'),
    html: ask({ img: `${A}/oddfest-2026/2026/crowd-hands-red.jpg`, q: 'Want to take part?' }),
  },
]);
const ferStory = story([
  {
    alt: 'Two people at a table laughing in purple light. ODDference is back. And we’re taking it further.',
    flag: `${STANDIN('a man raising his hand in purple light, a performer behind him')} audience-purple has no credit on file.`,
    credit: null,
    html: tease({
      img: `${I}/audience-purple.jpg`,
      top: 'ODDference is back.',
      bottom: 'And we’re taking it further.',
    }),
  },
  {
    alt: 'A stage in streaks of coloured light, blurred. Want to be in the room? See more.',
    credit: by('Remu Shemeikka'),
    html: ask({ img: `${A}/mosaic/49-55325200328.jpg`, q: 'Want to be in the room?' }),
  },
]);

// ── Vision & mission: the About page, in its own order, one word a photograph.
const visionCover = `${A}/about/oddfest-2026-confetti.jpg`;
const vision = num1([
  {
    alt: 'People dancing under falling confetti, one in an ODD T-shirt. ODD: creativity belongs closer to the centre. Photo: Ricardo Azevedo e Silva.',
    credit: by('Ricardo Azevedo e Silva'),
    html: cover({
      img: visionCover,
      pos: 'center 30%',
      dateline: 'ODD · why we exist',
      title: 'Creativity belongs closer to the centre.',
      t: 3.7,
      credit: 'Ricardo Azevedo e Silva',
    }),
  },
  {
    alt: 'Text on Ink. ODD grew from a simple idea. Finland has extraordinary creative talent, and there is more potential in what can happen around it — when people, places, resources and different parts of society connect more easily.',
    credit: null,
    html: tx({
      lead: 'ODD grew from a simple idea.',
      body: 'Finland has extraordinary creative talent, and there is more potential in what can happen around it — when people, places, resources and different parts of society <b>connect more easily</b>.',
    }),
  },
  {
    alt: 'A band playing under red stage lights at Tavastia. Gather.',
    credit: by('Julius Töyrylä'),
    html: ph({ img: `${A}/about/oddfest-2026-tavastia-band.jpg`, point: 'Gather.' }),
  },
  {
    alt: 'Text on Ink. Events create reasons to gather. ODDfest makes creative activity across Helsinki visible as one shared week. ODDference creates a deliberately composed professional room around creative expertise. Both create moments that would not otherwise exist.',
    credit: null,
    html: tx({
      lead: 'Events create reasons to gather.',
      body: 'ODDfest makes creative activity across Helsinki visible as one shared week. ODDference creates a deliberately composed professional room around creative expertise. Both create moments that would not otherwise exist.',
    }),
  },
  {
    alt: 'Faces in an audience, smiling and listening, seen through the middle lobe of the ODD mark. Return.',
    credit: by('Remu Shemeikka'),
    html: ph({ win: `${A}/oddspace/opening-audience-close.jpg`, lobe: 1, point: 'Return.' }),
  },
  {
    alt: 'Text on Ink. Spaces give people somewhere to return. ODDspace is the everyday layer: somewhere to work, meet, host things and keep going between projects and events. Creative work needs more than moments.',
    credit: null,
    html: tx({
      lead: 'Spaces give people somewhere to return.',
      body: 'ODDspace is the everyday layer: somewhere to work, meet, host things and keep going between projects and events. Creative work needs <b>more than moments</b>.',
    }),
  },
  {
    alt: 'Two people in conversation, one holding a microphone, lit from the side. Continue.',
    credit: by('Remu Shemeikka'),
    html: ph({ img: `${A}/programs/partnerships-card.jpg`, point: 'Continue.' }),
  },
  {
    alt: 'Text on Ink. Projects and relationships let something continue. ODDagency and partnerships create ways to keep working together when there is a real reason to do so. Programmes can add another layer when there is a clear need and the funding to run them properly.',
    credit: null,
    html: tx({
      lead: 'Projects and relationships let something continue.',
      body: 'ODDagency and partnerships create ways to keep working together when there is a real reason to do so. Programmes can add another layer when there is a clear need and the funding to run them properly.',
    }),
  },
  {
    alt: 'A crowd with hands in the air in front of the ODDfest 2025 main stage. Two years in.',
    credit: by('Vilikasper Kanth'),
    html: ph({
      img: `${A}/about/oddfest-2025-main-stage-crowd.jpg`,
      pos: 'center 40%',
      point: 'Two years in.',
    }),
  },
  {
    alt: 'Text on Ink. 5,000+ participants, 500+ collaborators and 100+ partners in less than two years. The first ODDfest, 2025, brought 2,600+ participants, 350+ contributors and 70+ partners together in Helsinki. 2026 tested Creative Week, ODDference and ODDspace. This is the structure we are building, not a finished system.',
    credit: null,
    html: num({
      big: '5,000+',
      lead: 'participants, 500+ collaborators and 100+ partners in less than two years.',
      body: 'The first ODDfest, 2025, brought 2,600+ participants, 350+ contributors and 70+ partners together in Helsinki. 2026 tested Creative Week, ODDference and ODDspace. This is the structure we are building, <b>not a finished system</b>.',
    }),
  },
  {
    alt: `A Paper card with the ODD mark. ${MISSION} allthingsodd.co`,
    credit: null,
    html: card({ top: MISSION }),
  },
]);

// ── ODD in three: one post, three frames, the whole mark across them, a product a lobe.
const inThree = [
  {
    n: 1,
    wide: 3,
    credit: 'ODDfest / Julius Töyrylä, Yoanna Rönnqvist, Remu Shemeikka',
    alt: 'Three frames that together form the ODD mark, each lobe filled with a photograph: a crowd at Tavastia (ODDfest), an audience at Bio Rex (ODDference), a full room at the ODDspace opening (ODDspace).',
    html: three([
      { img: festCover, point: 'ODDfest.' },
      { img: ferSeats, point: 'ODDference.' },
      { img: spaceCover, point: 'ODDspace.' },
    ]),
  },
];

// ── LinkedIn. Same frames, same system, different reader: the organisation,
// not the host or the visitor. Document posts (PDF) at the same 1080×1350,
// seven pages each (the data says attention drops after six or seven), the
// address printed on the ask and the card because LinkedIn has no link in bio.
// The three-part post becomes one 1.91:1 image, the whole mark across it.
const liFest = num1([
  {
    alt: 'A packed crowd with hands in the air under red light at Tavastia. ODDfest 2027, for organisations: a week made by hundreds needs partners. Photo: Julius Töyrylä.',
    credit: by('Julius Töyrylä'),
    html: cover({
      img: festCover,
      pos: 'center 40%',
      dateline: 'ODDfest 2027 · Helsinki’s creative week',
      title: 'A week made by hundreds needs partners.',
      t: 1.0,
      credit: 'Julius Töyrylä',
    }),
  },
  {
    alt: 'Text on Ink. ODDfest is Helsinki’s creative week: independently made events across the city, in one shared programme. ODD builds the shared identity, programme, communications, PR and map around the week. Organisations can back the week itself, reach the people in it, or build something of their own inside it.',
    credit: null,
    html: tx({
      lead: 'ODDfest is Helsinki’s creative week: independently made events across the city, in one shared programme.',
      body: 'ODD builds the shared identity, programme, communications, PR and map around the week. Organisations can <b>back the week itself</b>, reach the people in it, or build something of their own inside it.',
    }),
  },
  {
    alt: 'A speaker with a microphone on a small stage at Maria 01, a screen behind her. Build something inside it.',
    flag: 'Identifiable people at a partner event: check consent before posting.',
    credit: by('Remu Shemeikka'),
    html: ph({
      img: `${A}/examples/creative-x-tech-maria01.jpg`,
      pos: '15% 45%',
      zoom: 1.3,
      point: 'Build something inside it.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. What have partners built with ODD? Creative x Tech with Junction and Maria 01. Creative Capital Gathering at Amos Rex with FiBAN and Joy for Innovation. A hundred leading voices from Finnish culture in one room with KULTA ry, tickets sponsored by the City of Helsinki. Portable toilets turned into artworks with Humak and Lassila & Tikanoja.',
    flag: 'Partner names used in a partner call: Ronny checks before posting.',
    credit: null,
    html: qa({
      q: 'What have partners built with ODD?',
      a: 'Creative x Tech with Junction and Maria 01. Creative Capital Gathering at Amos Rex with FiBAN and Joy for Innovation. A hundred leading voices from Finnish culture in one room with KULTA ry, tickets sponsored by the City of Helsinki. Portable toilets turned into artworks with Humak and Lassila &amp; Tikanoja.',
    }),
  },
  {
    alt: 'A seated audience in a white-walled hall, people in suits and in everyday clothes side by side, seen through the middle lobe of the ODD mark. Reach the people in it.',
    flag: 'Identifiable people at a partner event: check consent before posting.',
    credit: by('Remu Shemeikka'),
    html: ph({
      win: `${I}/creative-capital-gathering-audience.jpg`,
      lobe: 1,
      point: 'Reach the people in it.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. Event ideas and partnerships for ODDfest 2027 are being collected now, before the dates are fixed. Tell us what you have in mind and we will work out whether there is a real fit. Hosting is open to companies too: an open studio, a talk, a dinner, a format nobody has tried yet. allthingsodd.co/oddfest',
    credit: null,
    html: tx({
      lead: 'Event ideas and partnerships for ODDfest 2027 are being collected now, before the dates are fixed.',
      body: 'Tell us what you have in mind and we will work out whether there is a <b>real fit</b>. Hosting is open to companies too: an open studio, a talk, a dinner, a format nobody has tried yet.',
      url: 'allthingsodd.co/oddfest',
    }),
  },
  {
    alt: 'A Paper card: the ODD mark filled with the Tavastia crowd photo. allthingsodd.co/oddfest. ODDfest 2027, Helsinki’s creative week.',
    credit: by('Julius Töyrylä'),
    html: card({
      fill: festCover,
      url: 'allthingsodd.co/oddfest',
      line: 'ODDfest 2027 · Helsinki’s creative week',
    }),
  },
]);

const liFerence = num1([
  {
    alt: 'An audience in dark cinema seats at Bio Rex. ODDference 2027, 22–23 April, Tanssin talo, Helsinki: what can business learn from creative expertise? Photo: Yoanna Rönnqvist.',
    credit: by('Yoanna Rönnqvist'),
    html: cover({
      img: ferSeats,
      dateline: 'ODDference 2027 · 22–23 April · Tanssin talo, Helsinki',
      title: 'What can business learn from creative expertise?',
      t: 1.9,
      credit: 'Yoanna Rönnqvist',
    }),
  },
  {
    alt: 'Text on Ink. ODDference is a business conference built around creative and cultural expertise. People who work in art, design, music, film, games and media think constantly about attention, experience, meaning, emotion and how to make something that did not exist before. ODDference brings that expertise into questions facing business and society.',
    credit: null,
    html: tx({
      lead: 'ODDference is a business conference built around creative and cultural expertise.',
      body: 'People who work in art, design, music, film, games and media think constantly about attention, experience, meaning, emotion and how to make something that did not exist before. ODDference brings that expertise into <b>questions facing business and society</b>.',
    }),
  },
  {
    alt: 'A speaker on the Bio Rex stage beside a stack of large labelled cubes, the audience in front under blue light. On stage as experts.',
    credit: by('@ilmarimedia'),
    html: ph({ img: `${A}/programs/oddference-pathway.jpg`, point: 'On stage as experts.' }),
  },
  {
    alt: 'Text on Ink. Who is it built for? Business leaders, founders, business development and partnership people, organisational leaders, policymakers and institutions, and creative leaders working beyond the cultural sector. People who want perspectives and relationships outside their own industry.',
    credit: null,
    html: qa({
      q: 'Who is it built for?',
      a: 'Business leaders, founders, business development and partnership people, organisational leaders, policymakers and institutions, and creative leaders working beyond the cultural sector. People who want perspectives and relationships <b>outside their own industry</b>.',
    }),
  },
  {
    alt: 'A speaker stands at a laptop on the Bio Rex stage, arms out, seen through the middle lobe of the ODD mark. Experience it.',
    credit: by('Yoanna Rönnqvist'),
    html: ph({ win: `${I}/oddference-speaker-laptop.jpg`, lobe: 1, point: 'Experience it.' }),
  },
  {
    alt: 'Text on Ink. €299. Blind Bird, plus VAT 13.5 %, until 1 December 2026 or sold out. The lowest price ODDference 2027 will be sold at: Early Bird will be €399, the regular ticket €499. Paid by card on the ticket page; if your organisation needs an invoice instead, email hello@oddfest.co. allthingsodd.co/tickets',
    flag: BLIND,
    credit: null,
    html: num({
      big: '€299',
      lead: 'Blind Bird, + VAT 13.5 %, until 1 December 2026 or sold out.',
      body: 'The lowest price ODDference 2027 will be sold at: Early Bird will be €399, the regular ticket €499. Paid by card on the ticket page; if your organisation needs an <b>invoice</b> instead, email hello@oddfest.co.',
      url: 'allthingsodd.co/tickets',
    }),
  },
  {
    alt: 'A Paper card: the ODD mark filled with the Bio Rex audience photo. allthingsodd.co/oddference. ODDference 2027, 22–23 April, Tanssin talo, Helsinki.',
    credit: by('Yoanna Rönnqvist'),
    html: card({
      fill: ferSeats,
      url: 'allthingsodd.co/oddference',
      line: 'ODDference 2027 · 22–23 April · Tanssin talo, Helsinki',
    }),
  },
]);

const liSpace = num1([
  {
    alt: 'A full room at the ODDspace opening in Vallila, people on sofas and chairs in daylight. ODDspace as a venue, Teollisuuskatu 9D, Vallila: not a hotel conference room. Photo: Remu Shemeikka.',
    credit: by('Remu Shemeikka'),
    html: cover({
      img: spaceCover,
      dateline: 'ODDspace · venue · Teollisuuskatu 9D, Vallila',
      title: 'Not a hotel conference room.',
      t: 1.3,
      credit: 'Remu Shemeikka',
    }),
  },
  {
    alt: 'Text on Ink. Three bookable rooms in a working creative space in Vallila, Helsinki. A gallery at street level, a co-creation floor one floor up and an auditorium with tiered seating. Seminars, workshops, away-days, launches, talks, screenings and organisational events have all happened here. You do not need to be a member to book.',
    credit: null,
    html: tx({
      lead: 'Three bookable rooms in a working creative space in Vallila, Helsinki.',
      body: 'A gallery at street level, a co-creation floor one floor up and an auditorium with tiered seating. Seminars, workshops, away-days, launches, talks, screenings and organisational events have all happened here. <b>You do not need to be a member to book.</b>',
    }),
  },
  {
    alt: 'People talking around tables with drinks in a bright room at ODDspace. Seminars, workshops, away-days.',
    credit: by('Remu Shemeikka'),
    html: ph({
      img: `${A}/oddspace/opening-table-conversation.jpg`,
      point: 'Seminars, workshops, away-days.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. 150 people, on the gallery floor or the co-creation space. From €750 + VAT for companies, from €300 + VAT for creative organisations and cultural workers. Every price is a starting price for the room across your booked hours. Tell us the date and what you are planning, and we reply with availability and a price within one working day.',
    credit: null,
    html: num({
      big: '150',
      lead: 'people, on the gallery floor or the co-creation space.',
      body: 'From <b>€750 + VAT</b> for companies, from €300 + VAT for creative organisations and cultural workers. Every price is a starting price for the room across your booked hours. Tell us the date and what you are planning, and we reply with availability and a price within one working day.',
    }),
  },
  {
    alt: 'People kneel on the floor painting together on large sheets of paper, seen from above through the last lobe of the ODD mark. Host.',
    credit: by('Remu Shemeikka'),
    html: ph({ win: `${A}/oddspace/opening-painting-floor.jpg`, lobe: 2, point: 'Host.' }),
  },
  {
    alt: 'Text on Ink. Need more than the room? The team behind ODDspace also develops and produces events, programmes and creative projects. If you need help with the concept, programme, production or bringing the right people together, say so in your enquiry. allthingsodd.co/oddspace/venue',
    credit: null,
    html: qa({
      q: 'Need more than the room?',
      a: 'The team behind ODDspace also develops and produces events, programmes and creative projects. If you need help with the concept, programme, production or <b>bringing the right people together</b>, say so in your enquiry.',
      url: 'allthingsodd.co/oddspace/venue',
    }),
  },
  {
    alt: 'A Paper card: the ODD mark filled with the ODDspace opening photo. allthingsodd.co/oddspace/venue. ODDspace, Teollisuuskatu 9D, Vallila.',
    credit: by('Remu Shemeikka'),
    html: card({
      fill: spaceCover,
      url: 'allthingsodd.co/oddspace/venue',
      line: 'ODDspace · Teollisuuskatu 9D, Vallila',
    }),
  },
]);

const liVision = num1([
  {
    alt: 'People dancing under falling confetti, one in an ODD T-shirt. ODD: creativity belongs closer to the centre. Photo: Ricardo Azevedo e Silva.',
    credit: by('Ricardo Azevedo e Silva'),
    html: cover({
      img: visionCover,
      pos: 'center 30%',
      dateline: 'ODD · why we exist',
      title: 'Creativity belongs closer to the centre.',
      t: 3.7,
      credit: 'Ricardo Azevedo e Silva',
    }),
  },
  {
    alt: 'Text on Ink. Creative practice carries real expertise in attention, taste, meaning, experimentation and making things that did not exist before. Capabilities that matter far beyond the cultural sector. ODD builds places, events and projects where creative and cultural expertise meets business, institutions and public life.',
    credit: null,
    html: tx({
      lead: 'Creative practice carries real expertise in attention, taste, meaning, experimentation and making things that did not exist before.',
      body: 'Capabilities that matter <b>far beyond the cultural sector</b>. ODD builds places, events and projects where creative and cultural expertise meets business, institutions and public life.',
    }),
  },
  {
    alt: 'Two people in conversation, one holding a microphone, lit from the side. Make crossing worlds normal.',
    credit: by('Remu Shemeikka'),
    html: ph({
      img: `${A}/programs/partnerships-card.jpg`,
      point: 'Make crossing worlds normal.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. Creative fields, business and institutions do not need to become the same thing. They should be able to work together without the crossing feeling exceptional. Creative people are not a talent inventory for companies, and companies are not simply funding sources. Both are participants with their own reasons to be there.',
    credit: null,
    html: tx({
      lead: 'Creative fields, business and institutions do not need to become the same thing.',
      body: 'They should be able to work together without the crossing feeling exceptional. Creative people are not a talent inventory for companies, and companies are not simply funding sources. <b>Both are participants</b> with their own reasons to be there.',
    }),
  },
  {
    alt: 'Faces in an audience, smiling and listening, seen through the middle lobe of the ODD mark. Two years in.',
    credit: by('Remu Shemeikka'),
    html: ph({ win: `${A}/oddspace/opening-audience-close.jpg`, lobe: 1, point: 'Two years in.' }),
  },
  {
    alt: 'Text on Ink. 5,000+ participants, 500+ collaborators and 100+ partners in less than two years. ODD is operated by New Nordic Way rf, a Finnish non-profit association based in Helsinki. Bring us a brief, a question, an event or a partnership idea — including one that is still taking shape. allthingsodd.co/work-with-odd',
    credit: null,
    html: num({
      big: '5,000+',
      lead: 'participants, 500+ collaborators and 100+ partners in less than two years.',
      body: 'ODD is operated by New Nordic Way rf, a Finnish non-profit association based in Helsinki. Bring us a brief, a question, an event or a partnership idea — <b>including one that is still taking shape</b>.',
      url: 'allthingsodd.co/work-with-odd',
    }),
  },
  {
    alt: `A Paper card with the ODD mark. ${MISSION} allthingsodd.co/work-with-odd`,
    credit: null,
    html: card({ top: MISSION, url: 'allthingsodd.co/work-with-odd' }),
  },
]);

// One 1.91:1 image (2580×1350): LinkedIn shows a multi-image post as a collage, which would break the mark.
const liOdd = [
  {
    n: 1,
    w: 2580,
    credit: 'ODDfest / Julius Töyrylä, Yoanna Rönnqvist, Remu Shemeikka',
    alt: 'The ODD mark filled with three photographs, one a lobe: a crowd at Tavastia (ODDfest), an audience at Bio Rex (ODDference), a full room at the ODDspace opening (ODDspace).',
    html: three(
      [
        { img: festCover, point: 'ODDfest.' },
        { img: ferSeats, point: 'ODDference.' },
        { img: spaceCover, point: 'ODDspace.' },
      ],
      true,
    ),
  },
];

// ── ODDfest 2027, what it is (12 Oct, Aki's direction): the week explained before the ask.
// Instagram for everyone who might come, LinkedIn for organisations. Facts from /oddfest
// and /about on 12 Oct. The page says 19–25 April; its event-idea form still says 19–26.
const whatCover = `${A}/about/oddfest-2025-love-stage-dancing.jpg`;
const festWhat = num1([
  {
    alt: 'A crowd dancing on a wooden floor under a white tent. A new shape for ODDfest: Helsinki’s creative week, 19–25 April 2027. Photo: Sebastian Hiemann.',
    flag: DATES,
    credit: by('Sebastian Hiemann'),
    html: cover({
      img: whatCover,
      pos: 'center 55%',
      dateline: 'Helsinki’s creative week · 19–25 April 2027',
      title: 'A new shape for ODDfest.',
      t: 2.6,
      credit: 'Sebastian Hiemann',
    }),
  },
  {
    alt: 'Text on Ink. ODDfest is a week of independently made events across Helsinki, in one shared programme. Exhibitions, performances, screenings, dinners, open studios and conversations, made by the people who do the work. Once the programme is out, you choose what you want to see across the week.',
    credit: null,
    html: tx({
      lead: 'ODDfest is a week of independently made events across Helsinki, in one shared programme.',
      body: 'Exhibitions, performances, screenings, dinners, open studios and conversations, made by the people who do the work. Once the programme is out, you choose what you want to see <b>across the week</b>.',
    }),
  },
  {
    alt: 'Visitors look at sculpted heads on plinths in a glass-walled gallery at Bio Rex. Go and see it.',
    credit: by('Julius Töyrylä'),
    html: ph({
      img: `${A}/examples/smell-the-art-bio-rex.jpg`,
      pos: '45% 58%',
      zoom: 1.3,
      point: 'Go and see it.',
    }),
  },
  {
    alt: 'Text on Ink. Every field, the same week. Visual arts, design, games, architecture, film, fashion, music and sound, performing arts, literature and publishing, creative technology and creative business.',
    credit: null,
    html: list({
      lead: 'Every field, the same week.',
      items: [
        'Visual arts, design, games,',
        'architecture, film, fashion,',
        'music and sound,',
        'performing arts,',
        'literature and publishing,',
        'creative tech and business.',
      ],
    }),
  },
  {
    alt: 'An artist in a black hood paints on an easel beside a DJ setup, seen through the last lobe of the ODD mark. Made by its hosts.',
    credit: by('@flyingwhalefv'),
    html: ph({
      win: `${A}/oddfest-2026/valiobeats-live-painting.jpg`,
      lobe: 2,
      point: 'Made by its hosts.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. Who makes it? Artists, collectives, venues, companies, communities, and people with no organisation behind them at all. There is no minimum size. ODD doesn’t produce the events: it builds the shared programme and spends the week telling people the whole thing is on.',
    credit: null,
    html: qa({
      q: 'Who makes it?',
      a: 'Artists, collectives, venues, companies, communities, and people with no organisation behind them at all. There is no minimum size. ODD doesn’t produce the events: it builds the shared programme and spends the week telling people the <b>whole thing is on</b>.',
    }),
  },
  {
    alt: 'Text on Ink. 150+ acts across five venues at ODDfest 2026. Creative Week 2026 brought 1,000+ people to partner events.',
    flag: NAMES2026,
    credit: null,
    html: num({
      big: '150+',
      lead: 'acts across five venues at ODDfest 2026.',
      body: 'Creative Week 2026 brought <b>1,000+ people</b> to partner events.',
    }),
  },
  {
    alt: 'Text on Ink. ODDfest 2027 runs 19–25 April, and the programme is being made now. Follow along. And if you’d rather be in it than at it, event ideas are open. Link in bio.',
    flag: DATES,
    credit: null,
    html: tx({
      lead: 'ODDfest 2027 runs 19–25 April, and the programme is being made now.',
      body: 'Follow along. And if you’d rather be in it than at it, <b>event ideas are open</b>. Link&nbsp;in&nbsp;bio.',
    }),
  },
  {
    alt: 'A Paper card: the ODD mark filled with the dancing crowd photo. allthingsodd.co/oddfest. ODDfest 2027, 19–25 April, Helsinki.',
    credit: by('Sebastian Hiemann'),
    html: card({
      fill: whatCover,
      url: 'allthingsodd.co/oddfest',
      line: 'ODDfest 2027 · 19–25 April · Helsinki',
      big: true,
    }),
  },
]);

const liFestWhat = num1([
  {
    alt: 'A crowd dancing on a wooden floor under a white tent. ODDfest 2027, 19–25 April, Helsinki: why a creative week matters to organisations. Photo: Sebastian Hiemann.',
    flag: DATES,
    credit: by('Sebastian Hiemann'),
    html: cover({
      img: whatCover,
      pos: 'center 55%',
      dateline: 'ODDfest 2027 · 19–25 April · Helsinki',
      title: 'Why a creative week matters to organisations.',
      t: 3.2,
      credit: 'Sebastian Hiemann',
    }),
  },
  {
    alt: 'Text on Ink. ODDfest is Helsinki’s creative week: independently made events across the city, in one shared programme. Artists, collectives, venues, communities and companies make and run their own events, and their own ticketing. ODD builds the shared identity, programme, communications, PR and map. In 2027 the week runs 19–25 April.',
    credit: null,
    html: tx({
      lead: 'ODDfest is Helsinki’s creative week: independently made events across the city, in one shared programme.',
      body: 'Artists, collectives, venues, communities and companies make and run their own events, and their own ticketing. ODD builds the shared identity, programme, communications, PR and map. In 2027 the week runs <b>19–25 April</b>.',
    }),
  },
  {
    alt: 'People lean over a long table of food at an ODDfest 2025 event, talking and serving themselves. Reasons to gather.',
    flag: 'Identifiable people in an organisations post: check consent before posting.',
    credit: by('Majakka'),
    html: ph({
      img: `${A}/about/oddfest-2025-shared-table.jpg`,
      point: 'Reasons to gather.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. 1,000+ people at Creative Week partner events across Helsinki in 2026, and 150+ acts at five ODDfest venues. Creativity belongs closer to the centre, and events create reasons to gather. Across one shared week, scenes, audiences and ideas meet that might not otherwise, and creative expertise comes into closer contact with business, institutions and public life.',
    flag: NAMES2026,
    credit: null,
    html: num({
      big: '1,000+',
      lead: 'people at Creative Week partner events in 2026, and 150+ acts at five ODDfest venues.',
      body: 'Creativity belongs closer to the centre, and events create reasons to gather. Across one shared week, scenes, audiences and ideas meet that might not otherwise, and creative expertise comes into <b>closer contact with business, institutions and public life</b>.',
    }),
  },
  {
    alt: 'A standing audience of guests in a white-walled hall at Taidehalli, seen through the first lobe of the ODD mark. Three ways in.',
    flag: 'Identifiable people at a partner event: check consent before posting.',
    credit: by('Remu Shemeikka'),
    html: ph({
      win: `${A}/examples/soiree-of-serendipity.jpg`,
      lobe: 0,
      point: 'Three ways in.',
      long: true,
    }),
  },
  {
    alt: 'Text on Ink. Back the week, reach the people in it, or build something inside it. In 2026 that looked like Creative x Tech with Junction and Maria 01, and Creative Capital Gathering at Amos Rex with FiBAN and Joy for Innovation. Tell us what you have in mind and we will work out whether there is a real fit. allthingsodd.co/oddfest',
    flag: `Partner names used in a partner call: Ronny checks before posting. ${DATES}`,
    credit: null,
    html: tx({
      lead: 'Back the week, reach the people in it, or build something inside it.',
      body: 'In 2026 that looked like Creative x Tech with Junction and Maria 01, and Creative Capital Gathering at Amos Rex with FiBAN and Joy for Innovation. Tell us what you have in mind and we will work out whether there is a <b>real fit</b>.',
      url: 'allthingsodd.co/oddfest',
    }),
  },
  {
    alt: 'A Paper card: the ODD mark filled with the dancing crowd photo. allthingsodd.co/oddfest. ODDfest 2027, 19–25 April, Helsinki.',
    credit: by('Sebastian Hiemann'),
    html: card({
      fill: whatCover,
      url: 'allthingsodd.co/oddfest',
      line: 'ODDfest 2027 · 19–25 April · Helsinki',
      big: true,
    }),
  },
]);

// ── Variants. A is the approved set. B and C test the hook: B the mark filled with
// the photograph on Paper (text frames, windows and the card go Paper too, photo
// frames stay Ink because type on a photograph is Paper on an Ink scrim), C the
// title alone on Ink. Everything after the cover is A's in C.
const variant = (frames, v) =>
  frames.map((f) => {
    const args = COVERS.get(f.html);
    const photo = !args && /^\s*<div class="ph">/.test(f.html);
    return {
      ...f,
      html: args ? coverHtml(args, v) : f.html,
      cls: v === 'b' && !photo ? 'paper' : '',
    };
  });

// The template kit: one of every frame kind, in the order a carousel uses them.
// Canva only (canva.mjs); the posts themselves are below.
const kit = num1([
  oddfest[0], //       cover
  oddference[1], //    explainer, two paragraphs
  oddfest[2], //       photo, short heading
  oddference[2], //    photo, long heading
  oddspace[2], //      photo, heading at the top, black and white
  oddfest[4], //       window, first lobe
  liFerence[4], //     window, middle lobe
  liSpace[4], //       window, last lobe
  festWhat[5], //      Q&A
  liSpace[3], //       number
  oddfest[3], //       list
  liFerence[5], //     the ask, LinkedIn (the address on the frame)
  oddference[8], //    card, the ask
  vision[10], //       card, the mission
]);

// Option A only from 12 Oct 2026 (Ronny). B and C stay in variant() for the record; add them back to a set to rebuild one.
const V = { a: 'A', b: 'B', c: 'C' };
const set = (list, platform, vs) =>
  vs.flatMap((v) =>
    list.map((c) => ({
      ...c,
      platform,
      variant: V[v],
      dir: `${platform}/${V[v]}`,
      frames: variant(c.frames, v),
    })),
  );

export const carousels = [
  ...set(
    [
      { name: 'oddfest-whats-next', title: 'ODDfest 2027', frames: oddfest },
      { name: 'oddference-whats-next', title: 'ODDference 2027', frames: oddference },
      { name: 'oddspace-whats-next', title: 'ODDspace', frames: oddspace },
      { name: 'odd-vision-mission', title: 'Why ODD exists', frames: vision },
      { name: 'oddfest-story', title: 'ODDfest 2027 · stories', frames: festStory },
      { name: 'oddference-story', title: 'ODDference 2027 · stories', frames: ferStory },
    ],
    'instagram',
    ['a'],
  ),
  ...set(
    [{ name: 'oddfest-what-it-is', title: 'ODDfest 2027 · what it is', frames: festWhat }],
    'instagram',
    ['a'],
  ),
  ...set(
    [
      {
        name: 'li-oddfest-what-it-is',
        hook: 'ODDfest is Helsinki’s creative week, 19–25 April 2027: independently made events across the city, in one programme. What the week is, why it exists, what 2026 added up to, and three ways in for an organisation.',
        title: 'ODDfest 2027 · what it is',
        frames: liFestWhat,
      },
    ],
    'linkedin',
    ['a'],
  ),
  ...set([{ name: 'odd-in-three', title: 'ODD in three', frames: inThree }], 'instagram', ['a']),
  ...set(
    [
      {
        name: 'li-oddfest',
        hook: 'A week made by hundreds of people needs partners behind it. Three ways in for an organisation, and the call for 2027 ideas is open now, before the dates are fixed.',
        title: 'ODDfest 2027 for organisations',
        frames: liFest,
      },
      {
        name: 'li-oddference',
        hook: 'What can business learn from creative expertise? Two days at Tanssin talo, 22–23 April 2027. Blind Bird €299 + VAT until 1 December or sold out; invoices on request.',
        title: 'ODDference 2027',
        frames: liFerence,
      },
      {
        name: 'li-oddspace',
        hook: 'Not a hotel conference room. Three bookable rooms in a working creative space in Vallila, up to 150 people, from €750 + VAT for companies. No membership needed.',
        title: 'ODDspace venue',
        frames: liSpace,
      },
      {
        name: 'li-vision',
        hook: 'Creativity belongs closer to the centre. Why a Helsinki non-profit builds events, spaces and projects where creative expertise meets business and institutions, and what two years have added up to.',
        title: 'Why ODD exists',
        frames: liVision,
      },
    ],
    'linkedin',
    ['a'],
  ),
  ...set(
    [
      {
        name: 'li-odd',
        hook: 'ODDfest. ODDference. ODDspace. Three things ODD, one mark.',
        title: 'ODD in three',
        frames: liOdd,
      },
    ],
    'linkedin',
    ['a'],
  ),
];
export const templates = set([{ name: 'template', title: 'Template', frames: kit }], 'templates', [
  'a',
]);
