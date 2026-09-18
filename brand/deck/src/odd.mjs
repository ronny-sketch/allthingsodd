// The ODD deck system: the tokens from brand/tokens/brand-tokens.json, the
// grid from layout.deck, and the handful of devices the slides are built from
// (eyebrow, section head, hairline, numbered cells, figures, pill, rail).
//
// Two rules the helpers exist to enforce:
//   - five type sizes, never a sixth (T below is the whole ladder);
//   - Ink or Paper is the ground, everything else is figure, rule or heat.
//
// Opacity does not survive a slide the way it survives CSS: a translucent
// colour over a photograph or a card reads differently in Keynote, PowerPoint
// and a PDF. So every step of the site's opacity ramp is composited here
// against its real ground and shipped as a solid hex — `mix()` is the ramp.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const IMAGES = join(HERE, 'images');
export const LOGOS = join(HERE, '..', '..', 'logos', 'png');

/* ---------------------------------------------------------------- colour -- */

export const INK = '0E090B';
export const PAPER = 'E2DFDE';
const BACKSTAGE = '232028';
const BACKSTAGE_LIGHT = 'D3CDC9';
const EMBER = 'AE6855'; // Ember as text on Ink
const EMBER_DEEP = '9A432B'; // Ember as text on Paper
const SIGNAL = '5081B3'; // Signal as text on Ink
const SIGNAL_DEEP = '40618C'; // Signal under Paper text
const CLAY = '967E79';
const CLAY_DEEP = '6B5551';

/** Composite `fg` at `a` opacity over `bg`, the way the browser would. */
export const mix = (fg, bg, a) =>
  [0, 2, 4]
    .map((i) => {
      const f = parseInt(fg.slice(i, i + 2), 16);
      const b = parseInt(bg.slice(i, i + 2), 16);
      return Math.round(b + a * (f - b))
        .toString(16)
        .padStart(2, '0');
    })
    .join('')
    .toUpperCase();

// The ramp, per ground. Dark and light are not mirror images: Ink on Paper
// needs more opacity than Paper on Ink for the same contrast (tokens.css).
const ramp = (figure, bg, steps) => ({
  bg,
  figure,
  strong: mix(figure, bg, steps[0]), // lead paragraphs
  muted: mix(figure, bg, steps[1]), // body under a headline, captions
  quiet: mix(figure, bg, steps[2]), // eyebrows, meta, the premise of a headline
  line: mix(figure, bg, 0.35), // outline-button border
  ruleStrong: mix(figure, bg, 0.2), // a rule that must read at a glance
  rule: mix(figure, bg, 0.12), // hairlines: grids, section heads, cards
});

export const ink = {
  ...ramp(PAPER, INK, [0.8, 0.6, 0.55]),
  raised: BACKSTAGE,
  creative: EMBER,
  business: SIGNAL,
  heat: EMBER,
  legal: CLAY,
  card: ramp(PAPER, BACKSTAGE, [0.8, 0.6, 0.55]),
};

export const paper = {
  ...ramp(INK, PAPER, [0.8, 0.7, 0.62]),
  raised: BACKSTAGE_LIGHT,
  creative: EMBER_DEEP,
  business: SIGNAL_DEEP,
  heat: EMBER_DEEP,
  legal: CLAY_DEEP,
  card: ramp(INK, BACKSTAGE_LIGHT, [0.8, 0.7, 0.62]),
};

/* ------------------------------------------------------------------ type -- */

// Five sizes. Line height is set in points, not as a multiple: a multiple is a
// percentage of the font's own line box, which Forta and Gabarito draw
// differently, so the same number gives different rhythm per face.
export const T = {
  hero: { fontFace: 'Forta', fontSize: 72, lineSpacing: 70, charSpacing: -1.4 },
  display: { fontFace: 'Forta', fontSize: 48, lineSpacing: 50, charSpacing: -0.7 },
  heading: { fontFace: 'Forta', fontSize: 30, lineSpacing: 34, charSpacing: -0.3 },
  body: { fontFace: 'Gabarito', fontSize: 18, lineSpacing: 25 },
  small: { fontFace: 'Gabarito', fontSize: 14, lineSpacing: 19 },
  // Same five sizes, different jobs: Forta at the Body and Small sizes (names,
  // session titles, rails), Gabarito SemiBold for labels and buttons.
  name: { fontFace: 'Forta', fontSize: 18, lineSpacing: 22, charSpacing: 0.2 },
  nameSmall: { fontFace: 'Forta', fontSize: 14, lineSpacing: 18, charSpacing: -0.1 },
  label: { fontFace: 'Gabarito SemiBold', fontSize: 14, lineSpacing: 19, charSpacing: 2.2 },
  runIn: { fontFace: 'Gabarito SemiBold', fontSize: 18, lineSpacing: 25 },
  button: { fontFace: 'Gabarito SemiBold', fontSize: 14, lineSpacing: 19, charSpacing: 0.7 },
};

/** Height of an n-line block in a given role, with a little slack. */
export const lines = (n, role) => (n * role.lineSpacing) / 72 + 0.1;

/* ------------------------------------------------------------------ grid -- */

export const SLIDE = { w: 13.333, h: 7.5 };
export const M = { l: 0.625, r: 0.625, t: 0.5, b: 0.5 };
const GUTTER = 0.25;
const COLW = (SLIDE.w - M.l - M.r - 11 * GUTTER) / 12;
/** Left edge of column i (0-11). */
export const col = (i) => M.l + i * (COLW + GUTTER);
/** Width of an n-column span. */
export const span = (n) => n * (COLW + GUTTER) - GUTTER;
export const CONTENT = span(12);
export const RIGHT = SLIDE.w - M.r;
export const BOTTOM = SLIDE.h - M.b;
/** The gap between cells in a hairline grid: the ground showing through. */
export const HAIR = 0.02;

/* --------------------------------------------------------------- devices -- */

export const text = (s, content, o = {}) =>
  s.addText(content, { isTextBox: true, margin: 0, valign: 'top', ...o });

export const rule = (s, { x, y, w, color }) =>
  s.addShape('line', { x, y, w, h: 0, line: { color, width: 0.75 } });

export const vrule = (s, { x, y, h, color }) =>
  s.addShape('line', { x, y, w: 0, h, line: { color, width: 0.75 } });

export const band = (s, { x, y, w, h, color, transparency }) =>
  s.addShape('rect', { x, y, w, h, fill: { color, transparency } });

/** Ink over a photograph, only where type sits on it. */
export const scrim = (s, { x = 0, y = 0, w = SLIDE.w, h = SLIDE.h, transparency = 45 }) =>
  band(s, { x, y, w, h, color: INK, transparency });

export const eyebrow = (s, label, { x, y, w, g = ink, color, align = 'left' }) =>
  text(s, label, { x, y, w, h: 0.22, ...T.label, color: color || g.quiet, align });

/**
 * Eyebrow → heading → hairline, centred, like `.section-head` on the site.
 * Returns the y where content can start.
 */
export function sectionHead(
  s,
  { eyebrow: eb, title, y = 0.5, titleLines = 1, g = ink, x = M.l, w = CONTENT },
) {
  if (eb) eyebrow(s, eb, { x, y, w, g, align: 'center' });
  const ty = y + 0.4;
  text(s, title, {
    x,
    y: ty,
    w,
    h: lines(titleLines, T.heading),
    ...T.heading,
    color: g.figure,
    align: 'center',
  });
  const ry = ty + (titleLines * T.heading.lineSpacing) / 72 + 0.22;
  rule(s, { x, y: ry, w, color: g.rule });
  return ry + 0.3;
}

/** Premise, then point: first sentence quiet, second in full figure. */
export const premise = (quiet, point, g = ink) => [
  { text: `${quiet} `, options: { color: g.quiet } },
  { text: point, options: { color: g.figure } },
];

/** Rough width of a button label; pills are drawn to fit their own text. */
export const pillWidth = (label, size = 14) => {
  const solid = [...label].filter((c) => c !== ' ').length;
  return ((0.7 * solid + 0.28 * (label.length - solid)) * size) / 72 + 0.52;
};

/** Round is only for things you act on: buttons, tags, badges. */
export function pill(
  s,
  label,
  { x, y, w = pillWidth(label), h = 0.44, variant = 'solid', g = ink },
) {
  const solid = variant === 'solid';
  s.addText(label, {
    x,
    y,
    w,
    h,
    shape: 'roundRect',
    rectRadius: h / 2,
    fill: solid ? { color: g.figure } : undefined,
    line: { color: solid ? g.figure : g.line, width: 0.75 },
    color: solid ? g.bg : g.figure,
    ...T.button,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
  return w;
}

// The aspect of every photographic box on a slide, mirrored in
// prepare-images.py, which cuts the files to match. Keynote imports pictures
// with noChangeAspect and silently re-fits any picture whose frame disagrees
// with its file, so `photo()` refuses to place one that has drifted.
export const ASPECT = {
  mosaic: 3.31825 / 2.48667,
  half: 5.5138 / 7.5,
  full: 13.333 / 7.5,
  strip: 2.4306 / 7.5,
  face: 1.54,
  room: 5 / 3,
  wall: 0.8,
};
/** Width of a half-slide photograph: from column 7 to the edge it bleeds off. */
export const HALF_W = 5.5138;

export function photo(s, file, box) {
  const path = join(IMAGES, file);
  const size = imageSize(path);
  const drift = Math.abs(box.w / box.h / (size.w / size.h) - 1);
  if (drift > 0.01) {
    throw new Error(
      `${file} is ${(size.w / size.h).toFixed(4)} wide but its box is ${(box.w / box.h).toFixed(4)}: ` +
        're-cut it in prepare-images.py (a stretched photograph is a broken slide in Keynote)',
    );
  }
  s.addImage({ path, ...box });
}

/** Intrinsic pixel size of a PNG or JPEG — so nothing is ever stretched. */
export function imageSize(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  for (let i = 2; i < b.length; i += 2 + b.readUInt16BE(i + 2)) {
    while (b[i] !== 0xff) i += 1;
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
  }
  throw new Error(`cannot read the size of ${file}`);
}

/** Someone else's mark, centred in its cell at its own proportions. */
export function partnerLogo(s, name, { x, y, w, h }) {
  const file = join(IMAGES, `partner-${name}.png`);
  const size = imageSize(file);
  const r = Math.min(w / size.w, h / size.h);
  s.addImage({
    path: file,
    x: x + (w - size.w * r) / 2,
    y: y + (h - size.h * r) / 2,
    w: size.w * r,
    h: size.h * r,
  });
}

const LOCKUP_RATIO = {
  'odd-mark': 1512 / 480,
  oddfest: 2427 / 480,
  oddference: 3123 / 480,
  oddspace: 2671 / 480,
  oddstudio: 2933 / 480,
  oddagency: 3056 / 480,
  oddcity: 2455 / 480,
};

/**
 * A lockup at a given height. Never recoloured, stretched or outlined: Paper
 * artwork on Ink and photographs, Ink artwork on Paper. `cx` centres it.
 */
export function lockup(s, name, { x, cx, y, h, tone = 'paper', rotate }) {
  const w = h * LOCKUP_RATIO[name];
  s.addImage({
    path: join(LOGOS, `${name}-${tone}.png`),
    x: cx !== undefined ? cx - w / 2 : x,
    y,
    w,
    h,
    rotate,
  });
  return w;
}

/**
 * Cells joined by hairline gaps — the ground showing through is the rule.
 * `draw(cell, item, i)` fills each one.
 */
export function cells(s, { x, y, w, h, items, cols = items.length, rows, g = ink, fill, draw }) {
  const nRows = rows || Math.ceil(items.length / cols);
  const cw = (w - (cols - 1) * HAIR) / cols;
  const ch = (h - (nRows - 1) * HAIR) / nRows;
  items.forEach((item, i) => {
    const cell = {
      x: x + (i % cols) * (cw + HAIR),
      y: y + Math.floor(i / cols) * (ch + HAIR),
      w: cw,
      h: ch,
    };
    if (fill !== null) band(s, { ...cell, color: fill || g.raised });
    if (draw) draw(cell, item, i);
  });
}

/**
 * Figures with hairline dividers: the number in Forta, what it counts in
 * small tracked capitals under it.
 */
export function figures(s, { x, y, w, items, g = ink, role = T.display, align = 'left' }) {
  const each = w / items.length;
  items.forEach((item, i) => {
    const cx = x + i * each;
    const inner =
      align === 'center' ? { x: cx, w: each } : { x: cx + (i ? 0.3 : 0), w: each - 0.3 };
    text(s, item.value, { ...inner, y, h: lines(1, role), ...role, color: g.figure, align });
    text(s, item.label.toUpperCase(), {
      ...inner,
      y: y + (role.lineSpacing + 10) / 72,
      h: lines(2, T.small),
      ...T.label,
      color: g.quiet,
      align,
    });
    if (i)
      vrule(s, {
        x: cx - 0.02,
        y: y + 0.02,
        h: (role.lineSpacing + 10) / 72 + lines(2, T.small) - 0.1,
        color: g.rule,
      });
  });
}

/**
 * A rail: the 0.55in ticker the product pages carry down their edge — a
 * hairline, rotated Forta words and the lockup. Two to four slides at most.
 */
export function rail(s, { items, g = ink, side = 'left', tone = 'paper' }) {
  const W = 0.55;
  const x0 = side === 'left' ? 0 : SLIDE.w - W;
  vrule(s, { x: side === 'left' ? W : x0, y: 0, h: SLIDE.h, color: g.rule });
  const step = SLIDE.h / items.length;
  items.forEach((item, i) => {
    const cy = SLIDE.h - (i + 0.5) * step; // bottom to top, like the site
    if (item.kind === 'logo') {
      const h = 0.3;
      const w = h * LOCKUP_RATIO['odd-mark'];
      s.addImage({
        path: join(LOGOS, `odd-mark-${tone}.png`),
        x: x0 + W / 2 - w / 2,
        y: cy - h / 2,
        w,
        h,
        rotate: 270,
      });
    } else {
      const role = item.kind === 'word' ? T.name : T.label;
      const L = 3.2;
      text(s, item.text, {
        x: x0 + W / 2 - L / 2,
        y: cy - W / 2,
        w: L,
        h: W,
        rotate: 270,
        ...role,
        color: item.kind === 'word' ? g.strong : g.quiet,
        align: 'center',
        valign: 'middle',
      });
    }
  });
}

/* --------------------------------------------------------------- masters -- */

const META = { x: M.l, y: M.t, w: span(6), h: 0.24 };
const NUMBER = { x: col(9), y: M.t, w: span(3), h: 0.24 };

const master = (title, g, { meta = true, number = true, metaColor } = {}) => ({
  title,
  background: { color: g.bg },
  objects: meta
    ? [
        {
          placeholder: {
            options: {
              name: 'meta',
              type: 'body',
              ...META,
              ...T.label,
              color: metaColor || g.quiet,
              margin: 0,
              valign: 'top',
            },
            text: 'ALL THINGS ODD',
          },
        },
      ]
    : [],
  slideNumber: number
    ? {
        ...NUMBER,
        fontFace: T.label.fontFace,
        fontSize: T.label.fontSize,
        color: metaColor || g.quiet,
        align: 'right',
      }
    : undefined,
});

/**
 * The frames every slide is built on. Backgrounds, the meta line and the page
 * number live here; everything else is editable content on the slide.
 */
export function defineMasters(pres) {
  pres.defineSlideMaster(master('ODD Ink', ink));
  pres.defineSlideMaster(master('ODD Ink Full', ink, { meta: false, number: false }));
  pres.defineSlideMaster(master('ODD Paper', paper));
  pres.defineSlideMaster(master('ODD Paper Full', paper, { meta: false, number: false }));
  // Photographs run under the frame, so the meta line is lifted off the ramp.
  pres.defineSlideMaster(master('ODD Photo', ink, { metaColor: ink.strong }));
}

/**
 * Fill the master's meta line. Where a photograph runs under the top-left
 * corner, pass `x` (and `w`): the line is then set on the slide itself, at the
 * first column that is still on the ground, because a master placeholder
 * cannot move and a meta line over a photograph is not a meta line.
 */
export const meta = (s, label, { g = ink, color, x, w } = {}) =>
  text(s, label, {
    ...(x === undefined ? { placeholder: 'meta', ...META } : { ...META, x, w: w || span(6) }),
    ...T.label,
    color: color || g.quiet,
  });

/**
 * A scrim that fades into the photograph instead of ending on a hard edge:
 * stacked Ink bands, since a slide fill has no gradient. Bottom-anchored.
 */
export function scrimFade(s, { y, h = 1.2, from = 74, to = 38, steps = 6 }) {
  for (let i = 0; i < steps; i += 1) {
    scrim(s, {
      y: y + (i * h) / steps,
      h: h / steps + 0.01,
      transparency: from + ((to - from) * i) / (steps - 1),
    });
  }
  scrim(s, { y: y + h, h: SLIDE.h - y - h, transparency: to });
}
