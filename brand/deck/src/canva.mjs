// Canva import file for a deck. A Claude Slides deck, saved as its files
//   <deck>/project/deck.json, <deck>/project/slides/<id>.html, and every /_blob/<id> its slides
//   and faces name, saved as <deck>/_blob/<id>.<ext>
// becomes one PDF that Canva opens as an editable presentation, one page a slide:
//   - photographs and logos as images cut to their boxes, so Canva's Replace swaps them;
//   - the Ink scrim as a transparent overlay;
//   - hairlines and cell grounds as one transparent overlay, under the images;
//   - text as live Forta and Gabarito where the slide puts it, in the Brand Kit's fonts
//     (../../social/src/canva-pdf.mjs), Forta in capitals.
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
html.iso [data-on], html.iso [data-on] * { visibility: visible !important }
html.rules section { background: transparent !important }
html.rules section * { color: transparent !important }
html.rules [data-k] { visibility: hidden !important }`;
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
  let rules = false;
  for (const el of sec.querySelectorAll('*')) {
    if (!el.getClientRects().length) continue;
    const s = getComputedStyle(el);
    if (el.tagName === 'IMG')
      layers.push({ kind: 'img', k: tag(el), r: R(el), png: /\.png$/i.test(el.src), alt: el.alt });
    else if (s.backgroundImage.includes('gradient'))
      layers.push({ kind: 'scrim', k: tag(el), r: R(el) });
    else if (
      !rules &&
      (seen(s.backgroundColor) ||
        ['Top', 'Right', 'Bottom', 'Left'].some(
          (d) => parseFloat(s[`border${d}Width`]) > 0 && s[`border${d}Style`] !== 'none',
        ))
    ) {
      // Every ruled or filled box goes into one overlay, painted where the first of them is.
      rules = true;
      layers.push({ kind: 'rules' });
    }
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
  return { bg: getComputedStyle(sec).backgroundColor, layers, texts };
}

// One element alone on a transparent page (or on the slide's ground, for a JPEG), cut to its box.
async function shot(k, r, path, ground) {
  await page.evaluate(
    ({ k, ground }) => {
      document.documentElement.classList.add('iso');
      if (ground) document.documentElement.style.background = ground;
      document.querySelector(`[data-k="${k}"]`).setAttribute('data-on', '');
    },
    { k, ground },
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
  await page.evaluate((k) => {
    document.documentElement.classList.remove('iso');
    document.documentElement.style.removeProperty('background');
    document.querySelector(`[data-k="${k}"]`).removeAttribute('data-on');
  }, k);
  return { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
}

// Every filled or ruled box, text and images hidden, full frame: an overlay edge inside the
// page shows as a hairline once a design tool resamples it.
async function rulesShot(path) {
  await page.evaluate(() => document.documentElement.classList.add('rules'));
  await page.screenshot({ path, type: 'png', omitBackground: true });
  await page.evaluate(() => document.documentElement.classList.remove('rules'));
  return { x: 0, y: 0, w: W, h: H };
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

// Under a much bigger line (a figure over its label, a cover title over its subtitle), Canva's
// import drops a one-line box outright when it is closer than 16px and merges it into the bigger
// box further away, which moves both (tested 13 Oct 2026; a 26px line over a 24px one comes
// through fine). With an empty second line it stays its own box, where the deck put it, unless
// that empty line lands on the next box down: then Canva drops lines of that box instead.
const pad = (t, all) =>
  t.lines === 1 &&
  all.some(
    (o) => size(o) > size(t) * 1.5 && across(o, t) && t.y - foot(o) > -1 && t.y - foot(o) < o.lh,
  ) &&
  !all.some((o) => o !== t && across(o, t) && o.y > t.y && o.y < foot(t) + t.lh);

// Canva's import merges Gabarito paragraphs stacked in a column (a list of sources, an item and
// its link) into one box with one line spacing, the widest gap's, so the column loosens and runs
// out of its cell. Nothing keeps them apart (a colour step, a 1px step, the drawing order and an
// empty last line all merge, tested 13 Oct 2026), so a column goes in as the one box Canva would
// make, laid out so it keeps it: each item in its own size and line height, and between two items
// an empty line in a font small enough that its line comes out exactly the deck's gap.
function columns(texts) {
  const left = texts
    .filter((t) => t.runs.every((r) => r.br || r.font !== 'Forta') && place(t).align === 'left')
    .toSorted((a, b) => a.y - b.y);
  const done = new Set();
  const out = [];
  for (const t of left) {
    if (done.has(t)) continue;
    const col = [t];
    done.add(t);
    for (
      let n;
      (n = left.find(
        (o) =>
          !done.has(o) &&
          Math.abs(o.x - col.at(-1).x) < 1 &&
          o.y - foot(col.at(-1)) > -1 &&
          o.y - foot(col.at(-1)) < col.at(-1).lh,
      ));
    ) {
      col.push(n);
      done.add(n);
    }
    if (col.length > 1) out.push(col);
  }
  return out;
}

function columnHtml(col) {
  const item = (t) =>
    `<span data-lines="${t.lines}" data-lh="${t.lh}" style="font-size:${first(t).size}px;line-height:${t.lh}px${t.lines === 1 ? ';white-space:nowrap' : ''}">${spans(t)}</span>`;
  let html = item(col[0]);
  for (let i = 1; i < col.length; i++) {
    const [a, b] = [col[i - 1], col[i]];
    const gap = Math.max(0, b.y - foot(a));
    const spacer =
      gap >= 1
        ? `<br><span style="font-size:${(gap * first(a).size) / a.lh}px;line-height:${gap}px">\u00a0</span>`
        : '';
    html += `${spacer}<br>${item(b)}`;
  }
  // The paragraphs' width (a one-line item doesn't wrap), and a 1px strut so only the items and
  // spacers set the line heights.
  const multi = col.filter((t) => t.lines > 1).map((t) => place(t).w);
  const w = multi.length ? Math.min(...multi) : Math.max(...col.map((t) => place(t).w));
  return `<div style="position:absolute;left:${col[0].x}px;top:${col[0].y}px;width:${w}px"><p style="margin:0;${face(first(col[0]))};font-size:1px;line-height:1px">${html}</p></div>`;
}

const ALT = { scrim: 'Ink scrim', rules: 'Hairlines and cell grounds' };
const pages = [];
for (const id of deck.order) {
  const shrunk = await load(
    local(readFileSync(join(DECK, 'project/slides', `${id}.html`), 'utf8')),
  );
  for (const s of shrunk) console.warn(`  ⚑ over-full in the deck, shrunk to fit, ${id}: ${s}`);
  const info = await page.evaluate(collect);
  const imgs = [];
  for (const [i, l] of info.layers.entries()) {
    const jpeg = l.kind === 'img' && !l.png;
    const file = join(tmp, `${id}-${i}.${jpeg ? 'jpg' : 'png'}`);
    const b =
      l.kind === 'rules' ? await rulesShot(file) : await shot(l.k, l.r, file, jpeg && info.bg);
    const alt = l.alt || ALT[l.kind] || 'Logo';
    imgs.push(
      `<img src="file://${file}" alt="${esc(alt)}" style="position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px">`,
    );
  }
  const cols = columns(info.texts);
  const inCol = new Set(cols.flat());
  const boxes = [
    ...info.texts
      .filter((t) => !inCol.has(t))
      .map((t) => ({ y: t.y, html: textHtml(t, pad(t, info.texts)) })),
    ...cols.map((c) => ({ y: c[0].y, html: columnHtml(c) })),
  ];
  // Bottom box first, so Canva can't join a box to the bigger one above it.
  const texts = boxes.sort((a, b) => b.y - a.y).map((b) => b.html);
  pages.push(
    `<section data-id="${id}" style="background:${info.bg}">${imgs.join('')}${texts.join('')}</section>`,
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
console.log(`${OUT} · ${deck.order.length} slides`);
