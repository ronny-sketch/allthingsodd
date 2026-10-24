// Canva import file for a deck. A Claude Slides deck, saved as its files
//   <deck>/project/deck.json, <deck>/project/slides/<id>.html, and every /_blob/<id> its slides
//   and faces name, saved as <deck>/_blob/<id>.<ext>
// becomes one PDF that Canva opens as an editable presentation, one page a slide:
//   - photographs and logos as images cut to their boxes, so Canva's Replace swaps them, with the
//     Ink scrim baked into the photo under it;
//   - hairlines and cell grounds as vector shapes, which Canva makes its own shapes;
//   - every text box as its own live text box, in Forta and Gabarito from the Brand Kit
//     (../../social/src/canva-pdf.mjs), Forta in capitals.
// Nothing lies over the slide: no full-frame overlay, no text boxes joined into one.
//
//   node canva.mjs --deck=<folder> --out=<file.pdf> [--forta=~/Projects/AI/Fonts/Forta-2.0.ttf]
//
// Decks carry figures and asks that are not public: keep the deck folder and the PDF out of this
// repository. canva-hop.mjs takes the PDF into Canva and checks what Canva made of it; the whole
// flow, from notes to a filed Canva design, is the odd-decks skill (.claude/skills/odd-decks).
//
// A slide is laid out the way the Slides runtime documents its subset (artifact-type/reference/
// format.md): a column by default, no margins, the h1/h2/h3/p defaults, in the deck's own faces, so
// lines break where the deck breaks them, and an over-full box shrinks its text as the runtime's
// does (the script names each one: the deck is over-full there). One thing the runtime draws its
// own way: table rules here are the table's hairline at 1px (it draws 2px at 22% of the text colour).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
import { crop, pdfDoc } from '../../social/src/canva-pdf.mjs';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const home = (p) => resolve(p.replace(/^~/, process.env.HOME));
const DECK = home(arg('deck') ?? '.');
const OUT = home(arg('out') ?? 'deck.pdf');
const FORTA2 = home(arg('forta') ?? '~/Projects/AI/Fonts/Forta-2.0.ttf');
const W = 1920,
  H = 1080;

const deck = JSON.parse(readFileSync(join(DECK, 'project/deck.json'), 'utf8'));
const blobs = readdirSync(join(DECK, '_blob'));
const blob = (id) => {
  const f = blobs.find((b) => b.startsWith(id));
  if (!f) throw new Error(`canva: no file for /_blob/${id} in ${DECK}/_blob`);
  return `file://${join(DECK, '_blob', f)}`;
};
const local = (html) => html.replace(/\/_blob\/([0-9a-f]{32})/g, (_, id) => blob(id));

const FACES = Object.values(deck.faces ?? {})
  .map(
    (f) =>
      `@font-face { font-family: '${f.family}'; src: url('${local(f.src)}'); font-weight: 100 900 }`,
  )
  .join('\n');
// The runtime's defaults (format.md). b is 600: the Brand Kit holds Gabarito 400 and 600.
const SLIDE = `html, body { margin: 0; background: transparent }
section { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; box-sizing: border-box; font-size: 32px }
section * { margin: 0; box-sizing: border-box }
section:not([style*="display"]), section div:not([style*="display"]) { display: flex; flex-direction: column }
h1 { font-size: 96px; font-weight: 600; line-height: 1.1 }
h2 { font-size: 64px; font-weight: 600; line-height: 1.15 }
h3 { font-size: 44px; font-weight: 600; line-height: 1.2 }
p, li, td, th { line-height: 1.4 }
img { display: block; object-fit: cover }
aside { display: none }
a { color: inherit; text-decoration: none }
b { font-weight: 600 }
table { border-collapse: collapse }
td, th { padding: 0.35em 0.6em; vertical-align: top }
html.iso body * { visibility: hidden !important }
html.iso [data-on], html.iso [data-on] * { visibility: visible !important }`;
// Lines of text in an element, a <br><br> gap included: first to last line, in line heights, off
// the glyph boxes. (Not scrollHeight: Forta's glyphs stand taller than a 1.05 line and count as overflow.)
const LINES = `window.lines = (el, lh) => {
  const r = document.createRange(), ys = [];
  const walk = (n) => n.nodeType === 3
    ? (r.selectNodeContents(n), [...r.getClientRects()].forEach((q) => q.width && ys.push(q.top)))
    : n.childNodes.forEach(walk);
  walk(el);
  return ys.length ? Math.round((Math.max(...ys) - Math.min(...ys)) / lh) + 1 : 0;
}`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: W, height: H } });
await page.addInitScript(LINES);
const tmp = mkdtempSync(join(tmpdir(), 'odd-canva-deck-'));

async function load(html) {
  const file = join(tmp, 'slide.html');
  writeFileSync(
    file,
    `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}\n${SLIDE}</style></head><body>${html}</body></html>`,
  );
  await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Ruled cells, in the table's own hairline.
  // ponytail: a table without a border stays unruled; the decks have none.
  await page.evaluate(() => {
    for (const t of document.querySelectorAll('table')) {
      const s = getComputedStyle(t);
      if (s.borderTopStyle !== 'none')
        for (const c of t.querySelectorAll('td, th'))
          c.style.border = `${s.borderTopWidth} solid ${s.borderTopColor}`;
    }
  });
  // Nothing scrolls in the runtime (styles.md, "Rendering semantics"): a column too full for the
  // slide squeezes its boxes, as CSS flex shrinks them, and a text box squeezed (or given a height)
  // smaller than its text shrinks that text until it fits, never below 60%. A box in a row or a
  // grid cell is as tall as its row. So: let every column squeeze, freeze the boxes, then shrink.
  return page.evaluate(() => {
    const sec = document.querySelector('section');
    for (const el of sec.querySelectorAll('*'))
      if (getComputedStyle(el).position !== 'absolute' && !el.style.minHeight)
        el.style.minHeight = '0';
    const texts = [...sec.querySelectorAll('h1, h2, h3, p, li')];
    for (const el of texts) el.style.height ||= `${el.getBoundingClientRect().height}px`;
    const room = (el) => el.getBoundingClientRect().height;
    // The height the text needs inside its box, padding and rules included.
    const needs = (el) => {
      const s = getComputedStyle(el),
        lh = parseFloat(s.lineHeight);
      const px = (p) => parseFloat(s[p]) || 0;
      const edges = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'];
      return window.lines(el, lh) * lh + edges.reduce((a, p) => a + px(p), 0);
    };
    const shrunk = [];
    for (const el of texts) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      let s = size;
      while (needs(el) > room(el) + 1 && s > size * 0.6) el.style.fontSize = `${(s -= 0.5)}px`;
      if (s < size) shrunk.push(`“${el.textContent.trim().slice(0, 40)}…” ${size} → ${s}px`);
    }
    return shrunk;
  });
}

// What the slide is made of, read off the rendered page, in paint order.
function collect() {
  const sec = document.querySelector('section');
  const R = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const seen = (c) => {
    const v = c.match(/[\d.]+/g) ?? [];
    return v.length === 3 || +v[3] > 0;
  };
  let n = 0;
  const tag = (el) => (el.dataset.k = `k${n++}`);
  const layers = [];
  for (const el of sec.querySelectorAll('*')) {
    if (!el.getClientRects().length) continue;
    const s = getComputedStyle(el);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((d) =>
      parseFloat(s[`border${d}Width`]) > 0 && s[`border${d}Style`] !== 'none'
        ? `${s[`border${d}Width`]} solid ${s[`border${d}Color`]}`
        : '0',
    );
    if (el.tagName === 'IMG')
      layers.push({ kind: 'img', k: tag(el), r: R(el), png: /\.png$/i.test(el.src), alt: el.alt });
    else if (s.backgroundImage.includes('gradient'))
      layers.push({ kind: 'scrim', k: tag(el), r: R(el) });
    else if (seen(s.backgroundColor) || sides.some((b) => b !== '0'))
      // A cell ground or a hairline: drawn again as a box, it comes into Canva as a vector shape.
      layers.push({ kind: 'box', r: R(el), bg: s.backgroundColor, sides });
  }
  // The scrim goes into the photo under it, so no layer lies over the photo in Canva (a photo
  // replaced in Canva comes without one). ponytail: a scrim reaching past its photo loses that
  // part; the decks' scrims sit on full-bleed photos.
  const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const scrim of layers.filter((l) => l.kind === 'scrim')) {
    const photos = layers
      .slice(0, layers.indexOf(scrim))
      .filter((l) => l.kind === 'img' && !l.png && over(l.r, scrim.r));
    for (const img of photos) img.with = [...(img.with ?? []), scrim.k];
    if (photos.length) scrim.baked = true;
  }

  const TEXT = 'h1, h2, h3, p, li, td, th';
  const texts = [];
  for (const el of sec.querySelectorAll(TEXT)) {
    if (!el.textContent.trim() || !el.getClientRects().length || el.parentElement.closest(TEXT))
      continue;
    const s = getComputedStyle(el);
    const runs = [];
    const walk = (node, link) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) {
          const t = getComputedStyle(node);
          runs.push({
            text: c.textContent,
            font: t.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            weight: +t.fontWeight,
            size: parseFloat(t.fontSize),
            color: t.color,
            ls: t.letterSpacing === 'normal' ? 0 : parseFloat(t.letterSpacing),
            upper: t.textTransform === 'uppercase',
            link,
          });
        } else if (c.tagName === 'BR') runs.push({ br: true });
        else if (c.nodeType === 1) walk(c, c.tagName === 'A' ? c.href : link);
      }
    };
    walk(el, null);
    // The content box: text sits inside the padding and the rule above it.
    const r = R(el),
      px = (p) => parseFloat(s[p]) || 0;
    const lh = parseFloat(s.lineHeight);
    texts.push({
      x: r.x + px('paddingLeft') + px('borderLeftWidth'),
      y: r.y + px('paddingTop') + px('borderTopWidth'),
      w:
        r.w -
        px('paddingLeft') -
        px('paddingRight') -
        px('borderLeftWidth') -
        px('borderRightWidth'),
      lh,
      lines: window.lines(el, lh),
      align: s.textAlign,
      runs,
    });
  }
  return {
    bg: getComputedStyle(sec).backgroundColor,
    layers: layers.filter((l) => !l.baked),
    texts,
  };
}

// Elements alone on a transparent page (or on the slide's ground, for a JPEG), cut to a box.
async function shot(ks, r, path, ground) {
  await page.evaluate(
    ({ ks, ground }) => {
      document.documentElement.classList.add('iso');
      if (ground) document.documentElement.style.background = ground;
      for (const k of ks) document.querySelector(`[data-k="${k}"]`).setAttribute('data-on', '');
    },
    { ks, ground },
  );
  const x = Math.max(0, Math.floor(r.x)),
    y = Math.max(0, Math.floor(r.y));
  const clip = {
    x,
    y,
    width: Math.min(W, Math.ceil(r.x + r.w)) - x,
    height: Math.min(H, Math.ceil(r.y + r.h)) - y,
  };
  await page.screenshot({
    path,
    clip,
    ...(ground ? { type: 'jpeg', quality: 86 } : { type: 'png', omitBackground: true }),
  });
  await page.evaluate(() => {
    document.documentElement.classList.remove('iso');
    document.documentElement.style.removeProperty('background');
    for (const el of document.querySelectorAll('[data-on]')) el.removeAttribute('data-on');
  });
  return { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const face = (r) =>
  `font-family:${r.font === 'Forta' ? 'Forta' : 'Gabarito'};font-weight:${r.font !== 'Forta' && r.weight >= 600 ? 600 : 400};font-size:${r.size}px`;

// A box's runs as spans. A one-line box gets no-break spaces: Canva's import joins a line to a
// bigger line just above it and drops spaces doing it (tested 12 Oct 2026, see
// social/src/canva.mjs).
function spans(t) {
  const one = t.lines === 1;
  const parts = t.runs.map((r) => (r.br ? r : { ...r, text: r.text.replace(/[ \t\n\r]+/g, ' ') }));
  // No space at the start or end of a line.
  let start = true;
  for (const r of parts) {
    if (r.br) start = true;
    else if (start && (r.text = r.text.replace(/^ /, ''))) start = false;
  }
  let end = true;
  for (const r of parts.toReversed()) {
    if (r.br) end = true;
    else if (end && (r.text = r.text.replace(/ $/, ''))) end = false;
  }
  return parts
    .map((r) => {
      if (r.br) return '<br>';
      let text = r.text;
      if (r.upper || r.font === 'Forta') text = text.toUpperCase(); // Forta is caps-only
      if (one) text = text.replaceAll(' ', '\u00a0');
      if (!text) return '';
      const span = `<span style="${face(r)};letter-spacing:${r.ls}px;color:${r.color}">${esc(text)}</span>`;
      return r.link
        ? `<a href="${esc(r.link)}" style="color:inherit;text-decoration:none">${span}</a>`
        : span;
    })
    .join('');
}

// Where a box goes: the slide's content box, plus slack so a line that just fits in the deck's
// Forta 1 still fits in Forta 2.0, generous on a one-line box (it can't reflow), 1% on a
// paragraph (keeps its breaks).
function place(t) {
  const slack = t.lines === 1 ? Math.max(48, t.w * 0.25) : Math.max(4, t.w * 0.01);
  const align = t.align === 'center' ? 'center' : /right|end/.test(t.align) ? 'right' : 'left';
  const x = align === 'center' ? t.x - slack / 2 : align === 'right' ? t.x - slack : t.x;
  return { x, w: Math.max(t.w, Math.min(t.w + slack, W - x)), align };
}

const first = (t) => t.runs.find((r) => !r.br);
const size = (t) => Math.max(...t.runs.filter((r) => !r.br).map((r) => r.size));
const across = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w;
const foot = (t) => t.y + t.lines * t.lh;

// One text box. `trail` adds an empty second line, for the case pad() finds.
function textHtml(t, trail) {
  const { x, w, align } = place(t);
  // The paragraph's own face too: a bare <p> sets its line strut in the default 16px font.
  return `<div data-lines="${t.lines + (trail ? 1 : 0)}" data-lh="${t.lh}" style="position:absolute;left:${x}px;top:${t.y}px;width:${w}px"><p style="margin:0;${face(first(t))};line-height:${t.lh}px;text-align:${align}">${spans(t)}${trail ? '<br>\u00a0' : ''}</p></div>`;
}

// Boxes Canva can join: the same face, about the same size (see joins()).
const family = (t) => (first(t).font === 'Forta' ? 'Forta' : 'Gabarito');
const alike = (a, b) =>
  family(a) === family(b) && Math.max(size(a), size(b)) < 1.3 * Math.min(size(a), size(b));

// Under a much bigger line (a figure over its label, a cover title over its subtitle), Canva's
// import drops a one-line box outright when it is closer than 16px and merges it into the bigger
// box further away, which moves both (tested 13 Oct 2026; a 26px line over a 24px one comes
// through fine). With an empty second line it stays its own box, where the deck put it. That line
// needs a free line under it too before a box Canva could join it to: without that room
// the box goes in as it is. Half a bigger line away or more it stayed its own box anyway (a head
// 51px under a 96px title, a year 45px under a 56px one); closer, the script names it.
const under = (t, all, k = 1) =>
  t.lines === 1 &&
  all.some(
    (o) =>
      size(o) > size(t) * 1.5 && across(o, t) && t.y - foot(o) > -1 && t.y - foot(o) < k * o.lh,
  );
const room = (t, all) =>
  !all.some(
    (o) =>
      o !== t &&
      across(o, t) &&
      o.y > t.y &&
      o.y < foot(t) + t.lh + (alike(o, t) ? Math.max(o.lh, t.lh) : 0),
  );
const pad = (t, all) => under(t, all) && room(t, all);

// Canva's import makes one box of two boxes in the same face and about the same size (26px over
// 24px joins, 60px over 44px doesn't) stacked closer than about 0.83 of a line (34px apart at a
// 40.5px line joined, 32px at 39.2px stayed two, tested 13 Oct 2026). A colour or 1px step, the
// drawing order, an empty last line, a copy of the font, opacity, a clip, a rule between them and
// a 0.01deg turn all still join. Only the space keeps them apart, and that is the deck's to give:
// name every pair closer than a line.
const joins = (texts) =>
  texts.flatMap((a) =>
    texts
      .filter(
        (b) =>
          b !== a &&
          alike(a, b) &&
          across(a, b) &&
          b.y - foot(a) > -1 &&
          b.y - foot(a) < Math.max(a.lh, b.lh),
      )
      .map((b) => [a, b]),
  );
const words = (t) =>
  t.runs
    .filter((r) => !r.br)
    .map((r) => r.text)
    .join('')
    .trim()
    .slice(0, 32);

const pages = [];
const counts = [];
for (const id of deck.order) {
  const shrunk = await load(
    local(readFileSync(join(DECK, 'project/slides', `${id}.html`), 'utf8')),
  );
  for (const s of shrunk) console.warn(`  ⚑ over-full in the deck, shrunk to fit, ${id}: ${s}`);
  const info = await page.evaluate(collect);
  for (const [a, b] of joins(info.texts))
    console.warn(
      `  ⚑ joins into one text box in Canva, ${id}: “${words(a)}…” over “${words(b)}…”, ${Math.round(b.y - foot(a))}px apart: give them ${Math.ceil(Math.max(a.lh, b.lh))}px (a line) in the deck`,
    );
  for (const t of info.texts.filter((t) => under(t, info.texts, 0.5) && !room(t, info.texts)))
    console.warn(
      `  ⚑ may go into the bigger line above it in Canva, ${id}: “${words(t)}…”: give the box under it ${Math.ceil(2 * t.lh)}px from its top in the deck`,
    );
  const layers = [];
  for (const [i, l] of info.layers.entries()) {
    if (l.kind === 'box') {
      const [t, r, b, lt] = l.sides;
      layers.push(
        `<div style="position:absolute;left:${l.r.x}px;top:${l.r.y}px;width:${l.r.w}px;height:${l.r.h}px;box-sizing:border-box;background:${l.bg};border-top:${t};border-right:${r};border-bottom:${b};border-left:${lt}"></div>`,
      );
      continue;
    }
    const jpeg = l.kind === 'img' && !l.png;
    const file = join(tmp, `${id}-${i}.${jpeg ? 'jpg' : 'png'}`);
    const b = await shot([l.k, ...(l.with ?? [])], l.r, file, jpeg && info.bg);
    const alt = l.alt || (l.kind === 'scrim' ? 'Ink scrim' : 'Logo');
    layers.push(
      `<img src="file://${file}" alt="${esc(alt)}" style="position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px">`,
    );
  }
  // Bottom box first, so Canva can't join a box to the bigger one above it.
  const texts = info.texts
    .toSorted((a, b) => b.y - a.y)
    .map((t) => textHtml(t, pad(t, info.texts)));
  counts.push(texts.length);
  pages.push(
    `<section data-id="${id}" style="background:${info.bg}">${layers.join('')}${texts.join('')}</section>`,
  );
}

const pdfPage = await browser.newPage();
await pdfPage.addInitScript(LINES);
const html = join(tmp, 'deck.html');
writeFileSync(html, pdfDoc(FORTA2, W, H, pages.join('')));
await pdfPage.goto(`file://${html}`, { waitUntil: 'networkidle' });
await pdfPage.evaluate(() => document.fonts.ready);
// Every box must break its lines where the deck does.
const moved = await pdfPage.evaluate(() =>
  [...document.querySelectorAll('[data-lines]')]
    .filter((d) => window.lines(d, +d.dataset.lh) !== +d.dataset.lines)
    .map((d) => `${d.closest('section').dataset.id}: “${d.textContent.slice(0, 48)}…”`),
);
for (const m of moved) console.warn(`  ⚑ breaks differently from the deck, ${m}`);
mkdirSync(dirname(OUT), { recursive: true });
await pdfPage.pdf({
  path: OUT,
  width: `${W}px`,
  height: `${H}px`,
  printBackground: true,
  tagged: true,
});
crop(OUT, W, H);
rmSync(tmp, { recursive: true, force: true });
await browser.close();
console.log(`${OUT} · ${deck.order.length} slides · text boxes a slide: ${counts.join(' ')}`);
