// Renders every social example from brand/tokens/odd.css and brand/fonts:
//
//   cd brand/social/src && node build.mjs              # everything, ~3 min
//   node build.mjs --only=post-2,story-4,grid           # prefixes; keeps the rest
//
// Out: brand/social/examples/ —
//   post-NN.jpg        1080×1350 (a `wide: 3` post becomes post-NNa/b/c.jpg)
//   story-N.jpg        1080×1920
//   carousel-N.jpg, credits-N.jpg, reel-N.jpg   1080×1350
//   highlight-N.jpg    1080×1080
//   grid-1..3.jpg, phone.jpg   the profile as Instagram shows it (centre squares)
//   thumbs.jpg         every post at 120px — the legibility check
//
// Content: posts.mjs (the posts, the layout css, the helpers) and extras.mjs
// (stories, carousels, reels, highlight covers). No server: pages load from
// disk with file://, so images and fonts resolve relative to this folder.
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
import { posts, css as postCss } from './posts.mjs';
import { stories, carousels, reels, highlights, highlightCss } from './extras.mjs';
import { editions } from './grid.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'examples');
const only = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  .split(',');
const wanted = (name) => !only || only.some((o) => name.startsWith(o));
if (!only) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// The ladder at social scale: the same ratios, lifted so Small still reads on a
// tile roughly 400px wide on a phone. Everything else lives in posts.mjs.
const css = `
@font-face { font-family: 'Forta'; src: url('../../fonts/Forta-Regular.ttf') }
@font-face { font-family: 'Gabarito'; src: url('../../fonts/Gabarito-Regular.ttf'); font-weight: 400 }
@font-face { font-family: 'Gabarito'; src: url('../../fonts/Gabarito-SemiBold.ttf'); font-weight: 600 }

html, body { margin: 0; padding: 0 }
body { position: relative; overflow: hidden; background: var(--color-bg);
  color: var(--color-paper); font-family: var(--font-body) }
body.paper { --color-bg: #e2dfde; --color-paper: #0e090b;
  --color-paper-80: rgb(14 9 11 / 80%); --color-paper-60: rgb(14 9 11 / 70%);
  --color-paper-40: rgb(14 9 11 / 62%); --color-paper-20: rgb(14 9 11 / 20%);
  --color-paper-12: rgb(14 9 11 / 12%); --color-paper-06: rgb(14 9 11 / 6%) }

.t-hero    { font: 400 104px/0.98 var(--font-display); letter-spacing: -0.02em; margin: 0 }
.t-display { font: 400 72px/1.04 var(--font-display); letter-spacing: -0.015em; margin: 0 }
.t-heading { font: 400 46px/1.12 var(--font-display); letter-spacing: -0.01em; margin: 0 }
.t-body    { font: 400 34px/1.5 var(--font-body); margin: 0 }
.t-small   { font: 400 26px/1.4 var(--font-body); margin: 0 }
.eyebrow   { font: 600 26px/1.4 var(--font-body); letter-spacing: 0.16em;
             text-transform: uppercase; color: var(--color-paper-40); margin: 0 }
.quiet { color: var(--color-paper-40) } .muted { color: var(--color-paper-60) }
${postCss}
${highlightCss}
`;

// Instagram truncates a caption after roughly 125 characters; the first
// sentence has to survive that. Every post needs alt text.
for (const p of posts) {
  const first = p.caption.split(/(?<=[.!?])\s/)[0];
  if (first.length > 125) console.warn(`post-${p.n}: first sentence is ${first.length} chars`);
  if (!p.alt) console.warn(`post-${p.n}: no alt text`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

// One page per render; a three-tile panorama renders at 3× width and is clipped
// into a, b, c so it can be posted (c first — the newest post lands top-left).
async function shot(name, body, bodyClass, w, h, wide = 1) {
  const file = join(HERE, `.render-${name}.html`);
  writeFileSync(
    file,
    `<!doctype html><html><head><meta charset="utf-8">
     <link rel="stylesheet" href="../../tokens/odd.css">
     <style>${css}\nbody{width:${w * wide}px;height:${h}px}</style></head>
     <body class="${bodyClass}">${body}</body></html>`,
  );
  await page.setViewportSize({ width: w * wide, height: h });
  await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
  const opts = { type: 'jpeg', quality: 90 };
  if (wide === 1) await page.screenshot({ path: join(OUT, `${name}.jpg`), ...opts });
  else
    for (let i = 0; i < wide; i++)
      await page.screenshot({
        path: join(OUT, `${name}${'abc'[i]}.jpg`),
        ...opts,
        clip: { x: i * w, y: 0, width: w, height: h },
      });
  rmSync(file);
  return name;
}

const ground = (p) => (p.ground === 'paper' ? 'paper' : '');
const pad2 = (n) => String(n).padStart(2, '0');

for (const p of posts) {
  const name = `post-${pad2(p.n)}`;
  if (wanted(name))
    console.log(await shot(name, p.html, ground(p), 1080, 1350, p.wide ?? 1), p.kind);
}
for (const s of stories) {
  const name = `story-${s.n}`;
  if (wanted(name)) console.log(await shot(name, s.html, ground(s), 1080, 1920), s.kind);
}
for (const c of carousels)
  for (const f of c.frames) {
    const name = `${c.name}-${f.n}`;
    if (wanted(name)) console.log(await shot(name, f.html, ground(f), 1080, 1350));
  }
for (const r of reels) {
  const name = `reel-${r.n}`;
  if (wanted(name)) console.log(await shot(name, r.html, ground(r), 1080, 1350), r.kind);
}
for (const [i, word] of highlights.entries()) {
  const name = `highlight-${i + 1}`;
  if (!wanted(name)) continue;
  const small = word.length > 7 ? ' small' : '';
  console.log(
    await shot(name, `<div class="hl${small}"><span>${word}</span></div>`, '', 1080, 1080),
  );
}

// The profile, as Instagram shows it: 3 columns, centre squares, hairline gaps.
// grid-N.jpg per edition at 1084px; phone.jpg is edition 1 at 390px — what a
// first-time visitor actually sees. thumbs.jpg is every post at 120px.
const tile = (n) => `<div class="tile"><img src="../examples/${n}.jpg" alt=""></div>`;
const profileCss = (cell) => `
  body { height: auto; background: var(--color-bg) }
  .covers { display: flex; gap: ${cell * 0.08}px; padding: ${cell * 0.1}px ${cell * 0.08}px }
  .covers img { width: ${cell * 0.24}px; height: ${cell * 0.24}px; border-radius: 50%; object-fit: cover }
  .grid { display: grid; gap: 2px; background: var(--color-paper-12); grid-template-columns: repeat(3, ${cell}px) }
  .thumbs { display: grid; gap: 4px; grid-template-columns: repeat(10, 120px); padding: 8px; background: var(--color-bg) }
  .tile { aspect-ratio: 1; overflow: hidden; background: var(--color-bg) }
  .tile img { width: 100%; height: 100%; object-fit: cover; display: block }`;
const covers = highlights
  .map((_, i) => `<img src="../examples/highlight-${i + 1}.jpg" alt="">`)
  .join('');

async function sheet(name, w, html, cell) {
  const file = join(HERE, `.render-${name}.html`);
  writeFileSync(
    file,
    `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../../tokens/odd.css">
     <style>${css}${profileCss(cell)}</style></head><body>${html}</body></html>`,
  );
  await page.setViewportSize({ width: w, height: 800 });
  await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: join(OUT, `${name}.jpg`),
    type: 'jpeg',
    quality: 90,
    fullPage: true,
  });
  rmSync(file);
  console.log(name);
}

for (const [i, ed] of editions.entries()) {
  const name = `grid-${i + 1}`;
  if (!wanted(name) && !(i === 0 && wanted('phone'))) continue;
  const missing = ed.filter((n) => !existsSync(join(OUT, `${n}.jpg`)));
  if (missing.length) console.warn(`${name}: missing renders`, missing.join(', '));
  const html = (cell) =>
    `<div class="covers">${covers}</div><div class="grid">${ed.map(tile).join('')}</div>`;
  if (wanted(name)) await sheet(name, 1084, html(360), 360);
  if (i === 0 && wanted('phone')) await sheet('phone', 390, html(128.67), 128.67);
}
if (wanted('thumbs')) {
  const names = posts.flatMap((p) =>
    p.wide ? ['a', 'b', 'c'].map((s) => `post-${pad2(p.n)}${s}`) : [`post-${pad2(p.n)}`],
  );
  await sheet('thumbs', 1256, `<div class="thumbs">${names.map(tile).join('')}</div>`, 120);
}

await browser.close();
console.log(`\n${resolve(OUT)}`);
