// The week's posts as an editable claude.ai Design canvas: every frame an
// artboard at its own size (1080×1350; the LinkedIn three-part image 2580×1350),
// built from the same page build.mjs renders. Each artboard = one flattened
// background (photo, scrim, veil, mark, warped title; the words hidden) under
// the words as live Forta and Gabarito text at the render's own positions, so
// whoever opens the canvas retypes the copy on the frame itself.
//
// `render` is also the layout check: it prints every text block that runs into
// the 148px clearance, past the frame edge or into another block, and writes a
// contact sheet per carousel (sheet-<name>.jpg) to look at before anyone else does.
//
//   node canvas.mjs render --only=oddfest-whats,li-oddfest [--variant=A] --out=<dir>
//     → <dir>/img/*.jpg (+ Forta-Regular.ttf), <dir>/frames.json, <dir>/sheet-*.jpg
//   upload every file in <dir>/img to the canvas artifact (Artifact publish, asset: true),
//   then write <dir>/blobs.json: { "<file name>": "/_blob/<id>", … } from the upload replies
//   node canvas.mjs design --out=<dir> --title="ODD social — <week>"
//     → <dir>/design/project/canvas.json + one <id>.dc.html per frame + Main.dc.html (read me)
//   publish <dir>/design as the canvas's files (root = <dir>/design): canvas.json + Main.dc.html first, then the rest.
//
// `--only` matches carousel names by prefix, as build.mjs does. A carousel's
// `hook` (LinkedIn post line draft) and a frame's `flag` (what must be checked
// before posting) go into the note at the end of its row; a photo frame with no
// credit is flagged on its own.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
if (process.argv[2] && !arg('out')) {
  console.error('--out=<dir> is required (a folder outside the repository)');
  process.exit(1);
}
const OUT = resolve(arg('out')?.replace(/^~/, process.env.HOME) ?? '.');
const DSF = 1.6; // 1080 → 1728px: room to zoom in on the canvas without the photo going soft
// The edge no word crosses: 64px on a post (the profile grid crops 4:5 to 3:4 at the sides, since Jan 2025),
// 250px on a story (Instagram's bars at the top and the bottom).
const clear = (h) => (h > 1350 ? 250 : 64);

const keyOf = (c) =>
  (c.variant === 'A' ? c.name : `${c.name}-${c.variant.toLowerCase()}`).slice(0, 38);

async function render() {
  const { chromium } = await import('../../../node_modules/@playwright/test/index.mjs');
  const { page: pageHtml } = await import('./page.mjs');
  const { carousels } = await import('./whats-next.mjs');
  const only = (arg('only') ?? '').split(',').filter(Boolean);
  const variant = arg('variant') ?? 'A';
  const pick = carousels.filter(
    (c) => c.variant === variant && (!only.length || only.some((o) => c.name.startsWith(o))),
  );
  if (!pick.length)
    throw new Error(`no carousel matches --only=${only.join(',')} --variant=${variant}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: DSF });
  mkdirSync(join(OUT, 'img'), { recursive: true });
  copyFileSync(join(HERE, '../../fonts/Forta-Regular.ttf'), join(OUT, 'img', 'Forta-Regular.ttf'));
  const out = [],
    problems = [];
  for (const c of pick) {
    const key = keyOf(c),
      slides = [],
      thumbs = [];
    for (const f of c.frames) {
      const wide = f.wide ?? 1,
        w = (f.w ?? 1080) * wide,
        h = f.h ?? 1350;
      const file = join(HERE, '.canvas-render.html');
      writeFileSync(file, pageHtml(f.html, f.cls ?? '', w, h));
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
      rmSync(file);
      for (let i = 0; i < wide; i++)
        thumbs.push([
          (
            await page.screenshot({
              type: 'jpeg',
              quality: 70,
              clip: { x: i * (w / wide), y: 0, width: w / wide, height: h },
            })
          ).toString('base64'),
          h / (w / wide),
        ]);
      const info = await page.evaluate(collect);
      for (const p of check(info.texts, w, h, info.centred))
        problems.push(`${key} frame ${f.n}: ${p}`);
      for (let i = 0; i < wide; i++) {
        const x0 = i * (w / wide),
          pw = w / wide;
        const id = `${key}-${f.n}${wide > 1 ? 'abc'[i] : ''}`;
        let img = null;
        if (info.pictured) {
          img = `${id}.jpg`;
          await page.screenshot({
            path: join(OUT, 'img', img),
            type: 'jpeg',
            quality: 85,
            clip: { x: x0, y: 0, width: pw, height: h },
          });
        }
        const texts = info.texts
          .filter((t) => t.r.x + t.r.w / 2 >= x0 && t.r.x + t.r.w / 2 < x0 + pw)
          .map((t) => ({ ...t, r: { ...t.r, x: t.r.x - x0 } }));
        slides.push({
          id,
          n: f.n,
          part: wide > 1 ? i : null,
          w: pw,
          h,
          bg: info.bg,
          photo: info.photo,
          img,
          texts,
          html: f.html,
          alt: f.alt,
          credit: f.credit,
          flag: f.flag,
        });
      }
    }
    // One row of thumbnails per carousel, to look at in one go.
    const tw = 360;
    await page.setViewportSize({
      width: thumbs.length * (tw + 16) + 16,
      height: Math.round(tw * Math.max(...thumbs.map(([, r]) => r))) + 32,
    });
    await page.setContent(
      `<body style="margin:0;padding:16px;background:#262022;display:flex;align-items:flex-start;gap:16px">${thumbs.map(([b, r]) => `<img src="data:image/jpeg;base64,${b}" style="width:${tw}px;height:${tw * r}px">`).join('')}</body>`,
    );
    await page.screenshot({
      path: join(OUT, `sheet-${key}.jpg`),
      type: 'jpeg',
      quality: 80,
      fullPage: true,
    });
    out.push({
      key,
      name: c.name,
      platform: c.platform,
      title: c.title,
      hook: c.hook,
      count: c.frames.reduce((s, f) => s + (f.wide ?? 1), 0),
      slides,
    });
    console.log(`${key}: ${slides.length} frames`);
  }
  await browser.close();
  writeFileSync(join(OUT, 'frames.json'), JSON.stringify(out, null, 1));
  console.log(
    problems.length
      ? `\nCHECK FAILED — fix these before showing anyone:\n${problems.join('\n')}`
      : '\nchecks: ok',
  );
  if (problems.length) process.exitCode = 1;
}

// Text must clear the crop band, stay inside the frame and never touch another block.
function check(texts, w, h, centred) {
  const out = [];
  const flat = texts.filter((t) => !t.vertical);
  for (const t of flat) {
    const words = t.runs
      .map((r) => r.text)
      .join('')
      .trim()
      .slice(0, 40);
    const CLEAR = clear(h);
    if (!centred && (t.r.y < CLEAR - 2 || t.r.y + t.r.h > h - CLEAR + 2))
      out.push(`"${words}" runs into the ${CLEAR}px top/bottom clearance`);
    if (t.r.x < 40 || t.r.x + t.r.w > w - 40 || t.scroll > t.r.w + 2)
      out.push(`"${words}" runs past the frame edge`);
  }
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++) {
      const a = flat[i].r,
        b = flat[j].r;
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
        out.push(
          `"${flat[i].runs[0].text.trim().slice(0, 30)}" collides with "${flat[j].runs[0].text.trim().slice(0, 30)}"`,
        );
    }
  return out;
}

// In the page: the ground, whether anything pictorial is on it, and every text block (hidden afterwards).
function collect() {
  const root = document.body.firstElementChild;
  const rgba = (c) => c.match(/[\d.]+/g).map(Number);
  const R = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const style = (el) => {
    const s = getComputedStyle(el);
    return {
      font: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      size: parseFloat(s.fontSize),
      weight: +s.fontWeight,
      lh: parseFloat(s.lineHeight),
      ls: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing),
      color: rgba(s.color),
      upper: s.textTransform === 'uppercase',
      align: s.textAlign,
      vertical: s.writingMode.startsWith('vertical'),
    };
  };
  const texts = [];
  const block = (el, nodes, own = false) => {
    let r = R(el);
    if (own) {
      // Only the element's own lines: its block children are blocks of their own.
      const rg = document.createRange();
      rg.setStartBefore(nodes[0]);
      rg.setEndAfter(nodes.at(-1));
      const b = rg.getBoundingClientRect();
      r = { ...r, y: b.y, h: b.height };
    }
    const runs = [];
    const walk = (list) => {
      for (const n of list) {
        if (n.nodeType === 3) runs.push({ text: n.textContent, ...style(n.parentElement) });
        else if (n.nodeType === 1) walk(n.childNodes);
      }
    };
    walk(nodes);
    if (
      !runs
        .map((x) => x.text)
        .join('')
        .trim()
    )
      return;
    texts.push({ r, ...style(el), runs, scroll: el.scrollWidth });
  };
  const els = [...root.querySelectorAll('.point, .dateline, .credit, .tx p, .card p')];
  for (const el of els) {
    const own = [],
      kids = [];
    for (const c of el.childNodes)
      (c.nodeType === 1 && getComputedStyle(c).display === 'block' ? kids : own).push(c);
    if (own.length) block(el, own, kids.length > 0);
    for (const k of kids) block(k, k.childNodes);
  }
  for (const el of els) el.style.visibility = 'hidden';
  return {
    bg: rgba(getComputedStyle(root).backgroundColor),
    photo: !!root.querySelector('img, svg image'),
    pictured: !!root.querySelector('img, svg, h1'),
    centred: root.matches('.cover, .card, .ask'), // the cover, the card and the story ask centre on purpose
    texts,
  };
}

// ── The canvas files ─────────────────────────────────────────────────────────
const INK = '#0e090b',
  PAPER = '#e2dfde';
const FACE = { Forta: "'Forta', Impact, sans-serif", Gabarito: "'Gabarito', Arial, sans-serif" };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const px = (n) => `${+n.toFixed(1)}px`;
const hex = (c) =>
  `#${c
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;
const blend = (c, bg) => {
  const a = c[3] ?? 1;
  return hex(c.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a)));
};
// On a flat ground a tint becomes its solid colour (easier to pick); on a photo it stays see-through.
const colour = (c, bg, photo) =>
  photo && (c[3] ?? 1) < 1 ? `rgba(${c.slice(0, 3).join(',')},${c[3]})` : blend(c, bg);

function runs(t, bg, photo) {
  const col = colour(t.color, bg, photo);
  return t.runs
    .map((r, i) => {
      let v = r.text.replace(/\s+/g, ' ');
      if (i === 0) v = v.trimStart();
      if (i === t.runs.length - 1) v = v.trimEnd();
      if (!v) return '';
      v = esc(v);
      const c = colour(r.color, bg, photo);
      if (c !== col) v = `<span style="color: ${c}">${v}</span>`;
      if (r.weight >= 600 && t.weight < 600) v = `<b>${v}</b>`;
      return v;
    })
    .join('');
}

function dtext(t, bg, photo, H) {
  const low = t.r.y + t.r.h / 2 > H / 2; // the lower half hangs from the bottom: added words push it upwards, as in the render
  const st = [
    'position: absolute',
    'margin: 0',
    `font-family: ${FACE[t.font] ?? FACE.Gabarito}`,
    `font-size: ${px(t.size)}`,
    `font-weight: ${t.weight}`,
    `line-height: ${px(t.lh)}`,
    t.ls && `letter-spacing: ${px(t.ls)}`,
    `color: ${colour(t.color, bg, photo)}`,
    (t.upper || t.font === 'Forta') && 'text-transform: uppercase',
    t.align === 'center' && 'text-align: center',
    `left: ${px(t.r.x)}`,
    low ? `bottom: ${px(H - t.r.y - t.r.h)}` : `top: ${px(t.r.y)}`,
    t.vertical
      ? 'writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap'
      : `width: ${px(t.r.w + 1)}`,
  ];
  return `<p style="${st.filter(Boolean).join('; ')}">${runs(t, bg, photo)}</p>`;
}

const dc = (title, w, h, body, forta) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gabarito:wght@400;600;700&amp;display=swap">
<style>
@font-face{font-family:'Forta';src:url('${forta}')}
body{margin:0}
</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;

const kind = (html) => {
  const ask = /Link in bio|class="url"/.test(html) ? ' · the ask' : '';
  if (/class="ph cover/.test(html)) return 'Cover';
  if (/class="ph st ask/.test(html)) return 'Story · the ask';
  if (/class="ph st/.test(html)) return 'Story · teaser';
  if (/class="ph win/.test(html)) return 'Photo through the mark';
  if (/class="ph( bw)?"/.test(html)) return 'Photo with heading';
  if (/class="three"/.test(html)) return 'ODD in three';
  if (/class="card"/.test(html)) return 'Card';
  if (/class="q"/.test(html)) return `Q&A${ask}`;
  if (/class="big"/.test(html)) return `Number${ask}`;
  if (/class="list"/.test(html)) return `List${ask}`;
  return `Explainer${ask}`;
};
const flagOf = (sl) =>
  sl.flag ?? (sl.photo && !sl.credit ? 'Photographer unknown: find out before posting.' : null);

function board(c, sl, forta) {
  const root = `width: ${sl.w}px; height: ${sl.h}px; position: relative; overflow: hidden; background: ${hex(sl.bg)}; font-family: ${FACE.Gabarito}; color: ${PAPER}`;
  const parts = [
    sl.img &&
      `<img src="${sl.img}" alt="${attr(sl.alt ?? '')}" style="position: absolute; left: 0; top: 0; width: ${sl.w}px; height: ${sl.h}px; object-fit: cover">`,
    ...sl.texts.map((t) => dtext(t, sl.bg, sl.photo, sl.h)),
  ].filter(Boolean);
  const no = sl.part === null ? `${sl.n} / ${c.count}` : `${sl.part + 1} / ${c.count}`;
  return dc(
    `${c.title} · ${no}`,
    sl.w,
    sl.h,
    `<div style="${root}">\n${parts.join('\n')}\n</div>`,
    forta,
  );
}

function readme(title, forta) {
  const line = (t) =>
    `<p style="margin: 0; font-size: 40px; line-height: 1.3; color: ${PAPER}">${t}</p>`;
  return dc(
    'Read me',
    1080,
    1350,
    `<div style="width: 1080px; height: 1350px; box-sizing: border-box; padding: 148px 64px; display: flex; flex-direction: column; justify-content: space-between; background: ${INK}; color: ${PAPER}; font-family: ${FACE.Gabarito}">
<div style="display: flex; flex-direction: column; gap: 28px">
<p style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 4.2px; text-transform: uppercase">${esc(title)}</p>
<h1 style="margin: 0; font-family: ${FACE.Forta}; font-size: 104px; font-weight: 400; line-height: 0.98; letter-spacing: -2px; text-transform: uppercase">The posts, open for your words.</h1>
</div>
<div style="display: flex; flex-direction: column; gap: 28px">
${line('Every frame at its real size. One row a post; Instagram and LinkedIn on their own pages.')}
${line('Change the words right on the frame. The type is Forta and Gabarito, as on the posts.')}
${line('Photos and the warped cover titles are pictures. Want a new one? Comment on the frame and Claude re-renders it.')}
${line('The note at the end of each row: credit line, alt texts, flags.')}
${line('Nothing is posted until a person says so.')}
</div>
</div>`,
    forta,
  );
}

function design() {
  const frames = JSON.parse(readFileSync(join(OUT, 'frames.json'), 'utf8'));
  const blobs = JSON.parse(readFileSync(join(OUT, 'blobs.json'), 'utf8'));
  const title = arg('title') ?? 'ODD social';
  const forta = blobs['Forta-Regular.ttf'];
  if (!forta) throw new Error('blobs.json has no Forta-Regular.ttf: upload it with the images');
  const dir = join(OUT, 'design', 'project');
  mkdirSync(dir, { recursive: true });
  const GAP = 80,
    PITCH = Math.max(...frames.flatMap((c) => c.slides.map((s) => s.h))) + 120 + 260; // 260 above each row for its title
  const pages = [...new Set(frames.map((c) => c.platform))];
  const boards = {
    'Main.dc.html': { x: 0, y: 0, w: 1080, h: 1350, title: 'Read me', page: pages[0] },
  };
  const order = ['Main.dc.html'],
    notes = {};
  writeFileSync(join(dir, 'Main.dc.html'), readme(title, forta));
  const rows = Object.fromEntries(pages.map((p, i) => [p, i === 0 ? 1 : 0]));
  for (const c of frames) {
    const page = c.platform,
      y = PITCH * rows[page]++;
    const platform = page === 'instagram' ? 'Instagram' : 'LinkedIn';
    let x = 0;
    const alts = [],
      flags = [];
    for (const sl of c.slides) {
      if (sl.img && !blobs[sl.img]) throw new Error(`blobs.json has no ${sl.img}`);
      const file = `${sl.id}.dc.html`;
      writeFileSync(join(dir, file), board(c, { ...sl, img: sl.img && blobs[sl.img] }, forta));
      const no = sl.part === null ? sl.n : sl.part + 1;
      const who = sl.photo && sl.credit ? ` · ${sl.credit.replace('ODDfest / ', '')}` : '';
      boards[file] = {
        x,
        y,
        w: sl.w,
        h: sl.h,
        title: `${no} · ${kind(sl.html)}${flagOf(sl) ? ' ⚑' : ''}${who}`,
        page,
      };
      order.push(file);
      x += sl.w + GAP;
      if (sl.part === null || sl.part === 0) alts.push(`${no}. ${sl.alt ?? ''}`);
      if (flagOf(sl)) flags.push(`${no}: ${flagOf(sl)}`);
    }
    const names = [
      ...new Set(
        c.slides
          .map((s) => s.credit)
          .filter(Boolean)
          .flatMap((s) => s.replace('ODDfest / ', '').split(', ')),
      ),
    ];
    notes[`t-${c.key}`] = {
      x: 0,
      y: y - 240,
      text: `${platform} · ${c.title}`,
      kind: 'title1',
      maxW: x - GAP,
      page,
    };
    notes[`n-${c.key}`] = {
      x,
      y,
      w: 760,
      maxH: Math.max(...c.slides.map((s) => s.h)),
      page,
      text: [
        `${platform} · ${c.title} · ${c.count} frame${c.count > 1 ? 's' : ''}`,
        names.length && `Caption credit line: Photos: ${names.join(', ')}.`,
        c.hook && `Post line draft (rewrite it): ${c.hook}`,
        flags.length && `⚑ ${flags.join('\n⚑ ')}`,
        `Alt text\n${alts.join('\n')}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  }
  const canvas = {
    v: 3,
    createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') },
    title,
    launch: { view: 'canvas', page: pages[0] },
    pages: pages.map((p) => ({ id: p, name: p === 'instagram' ? 'Instagram' : 'LinkedIn' })),
    boards,
    order,
    notes,
    designSystems: [],
  };
  writeFileSync(join(dir, 'canvas.json'), JSON.stringify(canvas, null, 1));
  console.log(`${order.length} artboards in ${join(OUT, 'design')}`);
}

if (process.argv[2] === 'render') await render();
else if (process.argv[2] === 'design') design();
else
  console.log(
    'node canvas.mjs render --only=… --out=<dir>   |   node canvas.mjs design --out=<dir> --title="…"',
  );
