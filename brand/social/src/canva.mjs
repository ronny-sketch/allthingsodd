// Canva import files. Every post and template as a PDF that Canva opens as an
// editable design, layer by layer, taken from the same page build.mjs renders:
//   - photographs as images, so Canva's Replace swaps them;
//   - the ground around the mark (window, filled card, cover B, three-part) as
//     a transparent overlay with the mark's shape cut out, above the photo;
//   - the Ink scrim and veil as transparent overlays;
//   - text as live Forta and Gabarito, where the render put it, in the fonts the
//     ODD Brand Kit holds, so Canva lands on them (below);
//   - the warped cover title as a transparent PNG (the warp is a filter, so no
//     design tool can keep it live; --title makes a new one).
//
//   node canva.mjs --out=~/Projects/AI/exports/odd-social/2026-10-whats-next/canva [--only="Template A"]
//     [--forta=~/Projects/AI/Fonts/Forta-2.0.ttf]
//   node canva.mjs --title="A new cover title." --t=1.4 [--ink] [--big] --out=title.png
//     a warped title for a new cover: Paper by default, --ink for variant B,
//     --big for variant C's 128px. `t` is the instant of the warp (any number).
//
// Out: "01 Templates", "02 Instagram", "03 LinkedIn", one .pdf a design, named
// the way Canva lists it ("IG · ODDfest 2027 · A"). Import with the Canva
// connector's import-design-from-url (Surge serves .PDF, not .pdf) or drag in.
//
// Fonts: see canva-pdf.mjs. Canva's PowerPoint import never uses the Brand Kit's;
// its PDF import does. --forta points at Forta 2.0.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
import { crop, pdfDoc } from './canva-pdf.mjs';
import { page as pageHtml } from './page.mjs';
import { carousels, templates, warp } from './whats-next.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = resolve((arg('out') ?? '.').replace(/^~/, process.env.HOME));
const FORTA2 = resolve(
  (arg('forta') ?? '~/Projects/AI/Fonts/Forta-2.0.ttf').replace(/^~/, process.env.HOME),
);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

// Isolation: everything hidden but the element marked data-on, on a transparent page.
const ISO = `html.iso, html.iso body { background: transparent !important }
html.iso body * { visibility: hidden !important }
html.iso [data-on], html.iso [data-on] * { visibility: visible !important }`;

async function load(html, cls, w, h) {
  const file = join(HERE, '.canva-render.html');
  writeFileSync(file, pageHtml(html, cls, w, h));
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: ISO });
  rmSync(file);
}

// Screenshot one tagged element alone, clipped to its box inside the page.
async function alone(k, r, path, w, h, { unclip = false, jpeg = false, ground } = {}) {
  await page.evaluate(
    ({ k, unclip, ground }) => {
      const el = document.querySelector(`[data-k="${k}"]`);
      document.documentElement.classList.add('iso');
      if (ground) document.documentElement.style.setProperty('background', ground, 'important');
      el.setAttribute('data-on', '');
      el.style.removeProperty('display');
      if (unclip) {
        el.dataset.cp = el.getAttribute('clip-path');
        el.removeAttribute('clip-path');
      }
    },
    { k, unclip, ground },
  );
  const x0 = Math.max(0, Math.floor(r.x)),
    y0 = Math.max(0, Math.floor(r.y));
  const clip = {
    x: x0,
    y: y0,
    width: Math.min(w, Math.ceil(r.x + r.w)) - x0,
    height: Math.min(h, Math.ceil(r.y + r.h)) - y0,
  };
  await page.screenshot({
    path,
    clip,
    ...(jpeg ? { type: 'jpeg', quality: 84 } : { type: 'png', omitBackground: true }),
  });
  await page.evaluate(
    ({ k }) => {
      const el = document.querySelector(`[data-k="${k}"]`);
      document.documentElement.classList.remove('iso');
      document.documentElement.style.removeProperty('background');
      el.removeAttribute('data-on');
      if (el.dataset.cp) el.setAttribute('clip-path', el.dataset.cp);
      if (el.dataset.hole) el.style.display = 'none';
    },
    { k },
  );
  return { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
}

// What the frame is made of, read off the rendered page.
function collect() {
  const root = document.body.firstElementChild;
  const rgb = (c) => c.match(/[\d.]+/g).map(Number);
  const R = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  let n = 0;
  const tag = (el) => (el.dataset.k = `k${n++}`);
  const shown = (el) => getComputedStyle(el).display !== 'none' && R(el).w > 0;
  const bg = rgb(getComputedStyle(root).backgroundColor);
  const out = {
    bg,
    photoUnder: !!root.querySelector(':scope > img'),
    photos: [],
    overlays: [],
    marks: [],
    title: null,
    texts: [],
  };

  for (const img of root.querySelectorAll(':scope > img'))
    out.photos.push({ k: tag(img), r: R(root) });
  for (const el of root.querySelectorAll('.veil, .scrim'))
    if (shown(el)) out.overlays.push({ k: tag(el), r: R(root) });
  // Photos inside the mark: each unclipped in its box, then ONE full-frame overlay of the ground with
  // the mark's shape cut out over every box. Full-frame, so its edge is the page edge: a design tool
  // resamples images, and an overlay edge inside the page shows as a hairline.
  const ims = [...root.querySelectorAll('svg image')];
  for (const im of ims) out.photos.push({ k: tag(im), r: R(im), unclip: true });
  if (ims.length) {
    const ns = 'http://www.w3.org/2000/svg',
      W = innerWidth,
      H = innerHeight;
    const cuts = ims
      .map((im, i) => {
        const d = document
          .querySelector(`${im.getAttribute('clip-path').slice(4, -1)} path`)
          .getAttribute('d');
        const m = im.getScreenCTM(),
          r = R(im);
        return `<clipPath id="bx${i}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/></clipPath><g clip-path="url(#bx${i})"><path d="${d}" transform="matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})" fill="black"/></g>`;
      })
      .join('');
    const ov = document.createElementNS(ns, 'svg');
    ov.setAttribute('width', W);
    ov.setAttribute('height', H);
    ov.style.cssText = 'position:absolute;left:0;top:0;display:none';
    ov.innerHTML = `<mask id="ovm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>${cuts}</mask><rect width="${W}" height="${H}" fill="rgb(${bg.slice(0, 3).join(',')})" mask="url(#ovm)"/>`;
    ov.dataset.hole = '1';
    document.body.appendChild(ov);
    out.hole = { k: tag(ov), r: { x: 0, y: 0, w: W, h: H } };
  }
  for (const svg of root.querySelectorAll('svg'))
    if (!svg.querySelector('image') && svg.querySelector('path') && shown(svg))
      out.marks.push({ k: tag(svg), r: R(svg) });
  const h1 = root.querySelector('h1');
  if (h1) {
    const r = R(h1);
    out.title = { k: tag(h1), r: { x: r.x - 32, y: r.y - 32, w: r.w + 64, h: r.h + 64 } };
  }

  const opacity = (el) => {
    let o = 1;
    for (let e = el; e && e !== document.body; e = e.parentElement)
      o *= +getComputedStyle(e).opacity;
    return o;
  };
  const para = (s) => ({
    runs: [],
    top: Infinity,
    bottom: -Infinity,
    lh: parseFloat(s.lineHeight),
    before: parseFloat(s.marginTop) || 0,
    align: s.textAlign,
  });
  const range = document.createRange();
  for (const el of root.querySelectorAll('.point, .dateline, .credit, .tx p, .card p')) {
    if (!el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    const paras = [para({ ...cs, marginTop: '0' })];
    // ponytail: a block child opens a new paragraph and text after it stays there; the frames have none after.
    const walk = (node) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) {
          const s = getComputedStyle(node);
          range.selectNodeContents(c);
          for (const q of range.getClientRects()) {
            paras.at(-1).top = Math.min(paras.at(-1).top, q.top);
            paras.at(-1).bottom = Math.max(paras.at(-1).bottom, q.bottom);
          }
          paras.at(-1).runs.push({
            text: c.textContent,
            font: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            weight: +s.fontWeight,
            size: parseFloat(s.fontSize),
            color: rgb(s.color),
            opacity: opacity(node),
            ls: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing),
            upper: s.textTransform === 'uppercase',
          });
        } else if (c.nodeType === 1) {
          if (getComputedStyle(c).display === 'block') paras.push(para(getComputedStyle(c)));
          walk(c);
        }
      }
    };
    walk(el);
    out.texts.push({ r: R(el), vertical: cs.writingMode.startsWith('vertical'), paras });
  }
  return out;
}

// One frame → its layers (files on disk, boxes in px) and its text.
async function frame(f, w, h, dir, key) {
  await load(f.html, f.cls ?? '', w, h);
  const info = await page.evaluate(collect);
  const layers = [];
  const ground = `rgb(${info.bg.slice(0, 3).join(',')})`;
  for (const [i, p] of info.photos.entries())
    layers.push({
      path: join(dir, `${key}-p${i}.jpg`),
      alt: f.alt || 'Photo',
      ...(await alone(p.k, p.r, join(dir, `${key}-p${i}.jpg`), w, h, {
        unclip: p.unclip,
        jpeg: true,
        ground,
      })),
    });
  for (const [i, o] of info.overlays.entries())
    layers.push({
      path: join(dir, `${key}-o${i}.png`),
      alt: 'Ink scrim',
      ...(await alone(o.k, o.r, join(dir, `${key}-o${i}.png`), w, h)),
    });
  // The mark's ground goes above the scrim: in the render the scrim only ever shows inside the lobe.
  if (info.hole)
    layers.push({
      path: join(dir, `${key}-h.png`),
      alt: 'Ground with the ODD mark cut out',
      ...(await alone(info.hole.k, info.hole.r, join(dir, `${key}-h.png`), w, h)),
    });
  for (const [i, m] of info.marks.entries())
    layers.push({
      path: join(dir, `${key}-m${i}.png`),
      alt: 'ODD mark',
      ...(await alone(m.k, m.r, join(dir, `${key}-m${i}.png`), w, h)),
    });
  if (info.title)
    layers.push({
      path: join(dir, `${key}-t.png`),
      alt: 'Cover title',
      ...(await alone(info.title.k, info.title.r, join(dir, `${key}-t.png`), w, h)),
    });
  return { ...info, layers };
}

const rgb = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(',')})`;
const blend = (c, a, bg) => c.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Text as positioned HTML: solid colours on a flat ground (blended), Paper with
// alpha where a photograph is underneath.
// A one-line paragraph gets no-break spaces. Canva's import tries to join a line to a bigger
// line just above it (the number frame's line under the figure, the card's line under the
// address) and drops most of its spaces doing it; with no-break spaces it joins them cleanly,
// into one box with two paragraphs, as the page has them (tested 12 Oct 2026).
function textHtml(t, info, dx) {
  const face = (r) =>
    `font-family:${r.font === 'Forta' ? 'Forta' : 'Gabarito'};font-weight:${r.weight >= 600 ? 600 : 400};font-size:${r.size}px`;
  const paras = t.paras
    .map((p, pi) => {
      const oneLine = p.bottom - p.top < 1.5 * p.lh;
      const runs = p.runs
        .map((r, ri) => {
          let text = r.text.replace(/[ \t\n\r]+/g, ' '); // not \s: it eats the &nbsp; that keeps “Link in bio.” together
          if (ri === 0) text = text.replace(/^ /, '');
          if (ri === p.runs.length - 1) text = text.replace(/ $/, '');
          if (r.upper || r.font === 'Forta') text = text.toUpperCase(); // Forta is caps-only
          if (oneLine) text = text.replaceAll(' ', '\u00a0'); // see above
          const a = (r.color[3] ?? 1) * r.opacity;
          const color = info.photoUnder
            ? `rgba(${r.color.slice(0, 3).join(',')},${a})`
            : rgb(blend(r.color, a, info.bg));
          return text
            ? `<span style="${face(r)};letter-spacing:${r.ls}px;color:${color}">${esc(text)}</span>`
            : '';
        })
        .join('');
      // The paragraph's own face too: a bare <p> sets its line strut in the default 16px font, which stretches the lines.
      return `<p style="margin:${pi ? p.before : 0}px 0 0;${face(p.runs[0])};line-height:${p.lh}px;text-align:${p.align === 'center' ? 'center' : 'left'}">${runs}</p>`;
    })
    .join('');
  // A vertical credit is a horizontal box turned 270°, centred where the render put it.
  const r0 = t.vertical
    ? { x: t.r.x + t.r.w / 2 - t.r.h / 2, y: t.r.y + t.r.h / 2 - t.r.w / 2, w: t.r.h, h: t.r.w }
    : t.r;
  // Slack, so a line that just fits in the render (Forta 1) still fits in the PDF (Forta 2.0):
  // generous on a one-line box (it can't reflow), 1% on a paragraph (keeps its breaks).
  const oneLine = r0.h < 1.5 * Math.max(...t.paras.map((p) => p.lh));
  const slack = oneLine ? Math.max(48, r0.w * 0.25) : Math.max(4, r0.w * 0.01);
  const centred = t.vertical || t.paras[0].align === 'center';
  const x = r0.x - dx - (centred ? slack / 2 : 0);
  return `<div data-h="${r0.h}" style="position:absolute;left:${x}px;top:${r0.y}px;width:${r0.w + slack}px;${t.vertical ? 'transform:rotate(-90deg);' : ''}">${paras}</div>`;
}

const pdfPage = await browser.newPage();
async function design(c, file) {
  if (arg('only') && !file.includes(arg('only'))) return;
  const dir = mkdtempSync(join(tmpdir(), 'odd-canva-'));
  const pw = c.frames[0].w ?? 1080,
    ph = c.frames[0].h ?? 1350;
  const pages = [];
  for (const [fi, f] of c.frames.entries()) {
    const wide = f.wide ?? 1,
      w = (f.w ?? 1080) * wide,
      h = f.h ?? 1350;
    const info = await frame(f, w, h, dir, `f${fi}`);
    // A wide frame (the three-part post) becomes `wide` pages; each layer lands on every page it reaches.
    for (let i = 0; i < wide; i++) {
      const x0 = i * pw,
        x1 = x0 + pw;
      const imgs = info.layers
        .filter((l) => l.x < x1 && l.x + l.w > x0)
        .map(
          (l) =>
            `<img src="file://${l.path}" alt="${esc(l.alt)}" style="position:absolute;left:${l.x - x0}px;top:${l.y}px;width:${l.w}px;height:${l.h}px">`,
        );
      const texts = info.texts
        .filter((t) => t.r.x + t.r.w / 2 >= x0 && t.r.x + t.r.w / 2 < x1)
        .map((t) => textHtml(t, info, x0))
        .reverse(); // bottom box first, so Canva can't join a box to the bigger one above it (see textHtml)
      pages.push(
        `<section style="background:${rgb(info.bg)}">${imgs.join('')}${texts.join('')}</section>`,
      );
    }
  }
  const html = join(dir, 'design.html');
  writeFileSync(html, pdfDoc(FORTA2, pw, ph, pages.join('')));
  await pdfPage.goto(`file://${html}`, { waitUntil: 'networkidle' });
  await pdfPage.evaluate(() => document.fonts.ready);
  // Every box must wrap as the render does: a box taller or shorter than its source re-wrapped.
  const moved = await pdfPage.evaluate(() =>
    [...document.querySelectorAll('[data-h]')]
      .filter((d) => Math.abs(d.offsetHeight - d.dataset.h) > 8)
      .map((d) => d.textContent.slice(0, 48)),
  );
  for (const m of moved) console.warn(`  ⚑ wraps differently from the render: “${m}…”`);
  mkdirSync(dirname(file), { recursive: true });
  await pdfPage.pdf({
    path: file,
    width: `${pw}px`,
    height: `${ph}px`,
    printBackground: true,
    tagged: true,
  });
  crop(file, pw, ph);
  rmSync(dir, { recursive: true, force: true });
  console.log(file.slice(OUT.length + 1));
}

const title = arg('title');
if (title) {
  // A warped title for a new cover, transparent, at 2×.
  const big = process.argv.includes('--big');
  const { defs, h1 } = big
    ? warp(title.toUpperCase(), +(arg('t') ?? 1), 128, 900, 984, 160)
    : warp(title.toUpperCase(), +(arg('t') ?? 1));
  await load(
    `<div class="ph cover${big ? ' cover-c' : ''}">${defs}<div class="head"><h1 data-k="t">${h1}</h1></div></div>`,
    process.argv.includes('--ink') ? 'paper' : '',
    1080,
    1350,
  );
  const r = await page.evaluate(() => {
    const r = document.querySelector('h1').getBoundingClientRect();
    return { x: r.x - 32, y: r.y - 32, w: r.width + 64, h: r.height + 64 };
  });
  await alone('t', r, OUT, 1080, 1350);
  console.log(OUT);
} else {
  const NAMES = { A: 'Photo cover', B: 'Mark cover on Paper', C: 'Type cover' };
  for (const c of templates)
    await design(
      c,
      join(OUT, '01 Templates', `ODD · Template ${c.variant} · ${NAMES[c.variant]}.pdf`),
    );
  for (const c of carousels) {
    const [folder, tag] =
      c.platform === 'instagram' ? ['02 Instagram', 'IG'] : ['03 LinkedIn', 'LI'];
    await design(c, join(OUT, folder, `${tag} · ${c.title} · ${c.variant}.pdf`));
  }
}
await browser.close();
