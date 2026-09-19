// Renders every social example from brand/tokens/odd.css and brand/fonts:
//
//   cd brand/social/src && node build.mjs
//
// Out: brand/social/examples/ — post-NN.jpg (1080x1350), story-N.jpg (1080x1920),
// carousel-N.jpg, highlight-N.jpg (1080x1080), plus grid.jpg (the profile page
// as Instagram shows it) and sheet.jpg (everything, for review).
//
// No server: the page is loaded from disk with file://, so images and fonts
// resolve relative to this folder.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
import { posts, stories, carousel, highlights } from './posts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'examples');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// The ladder at social scale: the same ratios, lifted so Small still reads on a
// tile roughly 400px wide on a phone.
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
  --color-paper-12: rgb(14 9 11 / 12%) }

.t-hero    { font: 400 104px/0.98 var(--font-display); letter-spacing: -0.02em; margin: 0 }
.t-display { font: 400 72px/1.04 var(--font-display); letter-spacing: -0.015em; margin: 0 }
.t-heading { font: 400 46px/1.12 var(--font-display); letter-spacing: -0.01em; margin: 0 }
.t-body    { font: 400 34px/1.5 var(--font-body); margin: 0 }
.t-small   { font: 400 26px/1.4 var(--font-body); margin: 0 }
.eyebrow   { font: 600 26px/1.4 var(--font-body); letter-spacing: 0.16em;
             text-transform: uppercase; color: var(--color-paper-40); margin: 0 }
.quiet { color: var(--color-paper-40) } .muted { color: var(--color-paper-60) }
.on-photo { color: rgb(226 223 222 / 70%) } .on-photo-muted { color: rgb(226 223 222 / 62%) }

/* 96px margin; the profile grid shows only the centre square of a 4:5 post, so
   the statement lives inside 135..1215 and the meta line below it. */
.pad { position: absolute; inset: 135px 96px; display: grid; gap: 40px; align-content: center; z-index: 2 }
.pad.bottom { inset: auto 96px 135px 96px; align-content: end; gap: 24px }
.pad.bottom.tight { gap: 14px }
.pad-story { position: absolute; inset: 320px 96px; display: grid; gap: 40px; align-content: center; z-index: 2 }
.pad-story.bottom { inset: auto 96px 260px 96px; align-content: end }
.flow-center { align-content: center }
.foot { position: absolute; left: 96px; right: 96px; bottom: 44px; z-index: 2; display: flex;
  justify-content: space-between; align-items: center; font: 600 24px/1 var(--font-body);
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-paper-40);
  border-top: 1px solid var(--color-paper-12); padding-top: 28px }
.foot.dark { color: rgb(14 9 11 / 62%); border-top-color: rgb(14 9 11 / 12%) }
.foot .mark img { height: 26px; display: block }

.bleed { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  filter: contrast(1.05) saturate(1.15); z-index: 0 }
.scrim { position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(to top, rgb(14 9 11 / 88%) 0%, rgb(14 9 11 / 18%) 48%, rgb(14 9 11 / 42%) 100%) }
.scrim.soft { background: linear-gradient(to top, rgb(14 9 11 / 72%) 0%, rgb(14 9 11 / 6%) 40%, rgb(14 9 11 / 22%) 100%) }

/* Name wall: the credit roll, set small and dense. Forta at the Body size — the
   documented reuse, not a sixth size. */
.names { align-content: center; gap: 44px }
.name-wall { font-family: var(--font-display); font-size: 40px; line-height: 1.45;
  letter-spacing: 0.01em; margin: 0; text-transform: uppercase }

.lineup { align-content: center; gap: 36px }
.lineup-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px }
.lineup-list li { font-family: var(--font-display); font-size: 54px; line-height: 1.12;
  letter-spacing: -0.01em; text-transform: uppercase }

.split-photo { position: absolute; top: 0; left: 0; right: 0; bottom: 42%; overflow: hidden }
.split-photo img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.05) saturate(1.15) }
.split-body { position: absolute; top: 58%; left: 0; right: 0; bottom: 0; background: #e2dfde; color: #0e090b;
  padding: 72px 96px; display: grid; align-content: center; gap: 24px }
.split-body .eyebrow { color: rgb(14 9 11 / 62%) }

.dump { position: absolute; top: 0; left: 0; right: 0; bottom: 24%; display: grid;
  grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px;
  overflow: hidden; background: var(--color-paper-12) }
.dump img { width: 100%; height: 100%; min-width: 0; min-height: 0;
  object-fit: cover; filter: contrast(1.05) saturate(1.15) }

.thennow { position: absolute; top: 0; left: 0; right: 0; bottom: 32%; display: grid;
  grid-template-columns: 1fr 1fr; gap: 2px; overflow: hidden; background: var(--color-paper-12) }
.thennow figure { margin: 0; position: relative; overflow: hidden; min-width: 0; min-height: 0 }
.thennow img { width: 100%; height: 100%; min-width: 0; min-height: 0;
  object-fit: cover; filter: contrast(1.05) saturate(1.15) }
.thennow-years { display: grid; grid-template-columns: 1fr 1fr; gap: 2px }
.thennow-years span { font: 600 26px/1 var(--font-body); letter-spacing: 0.16em;
  color: var(--color-paper-40) }

/* Repost: the host's picture keeps its own edges, ODD only frames and credits. */
.repost { position: absolute; inset: 0; padding: 96px 64px; display: grid;
  grid-template-rows: auto 1fr auto; gap: 32px }
.repost img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.05) saturate(1.15) }
.repost-top, .repost-foot { display: flex; justify-content: space-between; align-items: center }
.repost-mark { height: 26px; width: auto }

.partners { align-content: center; gap: 44px }
.partner-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px;
  background: rgb(14 9 11 / 12%); border: 1px solid rgb(14 9 11 / 12%) }
.partner-grid img { background: #e2dfde; padding: 34px 28px; height: 112px;
  min-width: 0; object-fit: contain; width: 100% }

.pill-mock { justify-self: start; display: inline-block; padding: 26px 52px; border-radius: 999px;
  background: var(--color-paper); color: var(--color-bg); font: 600 28px/1 var(--font-body);
  letter-spacing: 0.05em; text-transform: uppercase }


.figure { font: 400 260px/0.9 var(--font-display); letter-spacing: -0.03em; margin: 0 }
.two-sides { align-content: center; gap: 48px }
.two-sides .intro { max-width: 22ch; margin-bottom: 8px }
.two-sides .eyebrow.creative { color: #9a432b }
.two-sides .eyebrow.business { color: #40618c }
.two-sides > div { display: grid; gap: 20px }
.rule-h { height: 1px; background: var(--color-paper-12) }
.bleed.dim { filter: contrast(1.05) saturate(1.15) brightness(0.42) }
.scrim.full { background: rgb(14 9 11 / 45%) }
.lockup { width: 560px; height: auto; display: block }
.portrait { position: absolute; top: 0; left: 0; right: 0; bottom: 38%; overflow: hidden; background: #0e090b }
.portrait img { width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: cover;
  object-position: center 22%; filter: grayscale(1) contrast(1.05) }
.quote .quiet { color: var(--color-paper-40) }

/* Highlight cover: the suffix alone, the way the rails carry it. */
.hl { position: absolute; inset: 0; display: grid; place-items: center }
.hl span { font-family: var(--font-display); font-size: 150px; letter-spacing: 0.02em;
  text-transform: uppercase; text-align: center; padding: 0 60px; line-height: 1 }
.hl.small span { font-size: 104px }
`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function shot(name, body, bodyClass, w, h) {
  const file = join(HERE, `.render-${name}.html`);
  writeFileSync(
    file,
    `<!doctype html><html><head><meta charset="utf-8">
     <link rel="stylesheet" href="../../tokens/odd.css">
     <style>${css}\nbody{width:${w}px;height:${h}px}</style></head>
     <body class="${bodyClass}">${body}</body></html>`,
  );
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 88 });
  rmSync(file);
  return name;
}

for (const p of posts) {
  const cls = p.ground === 'paper' ? 'paper' : '';
  console.log(await shot(`post-${String(p.n).padStart(2, '0')}`, p.html, cls, 1080, 1350), p.kind);
}
for (const s of stories) {
  console.log(
    await shot(`story-${s.n}`, s.html, s.ground === 'paper' ? 'paper' : '', 1080, 1920),
    s.kind,
  );
}
for (const c of carousel) {
  console.log(
    await shot(`carousel-${c.n}`, c.html, c.ground === 'paper' ? 'paper' : '', 1080, 1350),
  );
}
for (const [i, word] of highlights.entries()) {
  const small = word.length > 7 ? ' small' : '';
  console.log(
    await shot(
      `highlight-${i + 1}`,
      `<div class="hl${small}"><span>${word}</span></div>`,
      '',
      1080,
      1080,
    ),
  );
}

await browser.close();
console.log(`\n${resolve(OUT)}`);
