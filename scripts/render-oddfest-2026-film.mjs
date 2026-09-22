#!/usr/bin/env node
/*
  Renders /oddfest-2026/ as a phone-sized video for social media.

    npm run build && npx astro preview --port 4331     # a preview of THIS build
    node scripts/render-oddfest-2026-film.mjs --url http://127.0.0.1:4331/oddfest-2026/

  Options: --cut full (the only cut: the length of the soundtrack)
           --url  the page (default http://localhost:4321/oddfest-2026/)
           --size 360x640 (CSS px; 480x600 for 4:5, 1280x720 for 16:9)  --scale 3
           --fps 30  --out dist-film  --audio-offset 0 (seconds, may be negative)
           --seconds N  render only the first N seconds (a smoke test)

  How it works, and why it is not Playwright's recordVideo (tried; it captures
  at CSS-pixel size, so a phone layout came out as a small picture in a
  1080x1920 canvas, and it drops frames on wall-clock time):

  The renderer is the clock. Frame k is t = k/fps. For every frame it sets
  scrollY from the cut's timeline, lets the page's IntersectionObservers run
  (two animation frames), steps every CSS animation and transition on the
  page to the same t (document.getAnimations(), paused and positioned), and
  screenshots at 3x — 360x640 CSS px is a real phone layout and 3x makes it
  exactly 1080x1920. ffmpeg then lays the soundtrack under the frames from
  frame 0, so the roll and the music line up by construction. The page never
  creates its Audio element (the "Play the credits" link is not pressed) and
  never scrolls itself; the roll is the page's own, from
  src/scripts/oddfest-2026-credits.ts, after a 6 s hero hold.

  The site chrome (nav, footer, cursor, popups, consent, the roll's control,
  the hero's buttons) is hidden by a stylesheet this script injects, and the
  6 s reveal backstop in src/scripts/reveal.ts is dropped from the recording
  browser only (a stepped render runs slower than wall time, so it would
  reveal every name at once a second into the film). Nothing on the page
  branches on film mode.
*/
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const CUT = arg('cut', 'full');
const URL = arg('url', 'http://localhost:4321/oddfest-2026/');
const FPS = Number(arg('fps', 30));
const [W, H] = arg('size', '360x640').split('x').map(Number);
const SCALE = Number(arg('scale', 3));
const OUT = path.resolve(arg('out', 'dist-film'));
const AUDIO_OFFSET = Number(arg('audio-offset', 0));
const SECONDS_CAP = arg('seconds') ? Number(arg('seconds')) : null;

const TRACK = path.resolve('public/audio/oddfest-2026-aftermovie.mp3');
const TRACK_SECONDS = 84.67;
const END_HOLD = 2;

/*
  THE SOUNDTRACK WRITES THE EDIT. Measured off the track itself, at 0.125 s
  resolution (ffmpeg astats RMS), not chosen by ear:

      0–15 s   intro, steady
     16–26 s   first lift
     28–38 s   breakdown
     40–51 s   the big sustained section
     52–57 s   falls away
     58–72 s   a long quiet drift
     73.0–76.6 s   QUIET. -25 to -32 dB. The track stops for a moment.
     76.73 s   +10.8 dB. The hit.
     77–83 s   the last full section
     83.3–84.65 s  decay to silence

  So the end of this film is scored rather than invented. The credits slow
  through the quiet passage and the roll comes to rest on the invitation
  exactly on the 76.73 s hit — the loudest single onset in the back half of the
  song. Then it holds for the last eight seconds while the track plays itself
  out. Nothing fades and nothing cuts: the stop is the ending.
*/
const HIT = 76.73;

// [seconds, target]: a scrollY in px, 'max', or 'selector@top|centre|bottom'.
// A third element names the segment's easing; 'linear' is a credits roll and
// the default ease-in-out is a move between two places.
//
// The film is one take (2026-09-21, Ronny: "the whole video should be a smooth
// continuous roll ... think of a movie -> opening screen, and then credits
// roll"). The hero holds as the opening title card — it is one full screen
// tall by construction, so it fills the frame — and then a single unbroken
// roll carries the whole page past the camera. The page's own order does the
// dramaturgy: the letter, the quote, the 274, the story, the photograph,
// every credited name, the photo wall, and last the invitation.
//
// The roll ends on '#invite-card' rather than the whole afterparty section:
// the card is the block built to hold the eyebrow, the ask, the date, the way
// in and "Stay ODD." inside one frame, and the letter above it rolls past.
// Centring rather than topping keeps it one forward move at every aspect
// ratio — on 9:16 the card is near the frame's height, on 16:9 it is shorter.
const TIMELINES = {
  full: [
    [0, 0],
    [6, 0],
    // The whole film is this one move: constant speed for the length of the
    // roll, then a deceleration that brings the page to rest on the invitation
    // exactly on the 76.73 s hit. Nothing fades and nothing cuts — the roll
    // arriving and stopping IS the ending (2026-09-22, Ronny: "instead of the
    // odd fadeout just make it stop the roll on the invite"). The track's
    // quiet passage at 73-76.6 s is the deceleration, and the hit is the stop.
    [HIT, '#invite-card@centre', 'roll'],
    [TRACK_SECONDS, '#invite-card@centre'],
  ],
};

// A film opens out of black. That is now the only wash in the cut.
const BLACKOUTS = {
  full: [
    [0, 1],
    [1.2, 0],
  ],
};

const timeline = TIMELINES[CUT];
if (!timeline) throw new Error(`--cut must be one of ${Object.keys(TIMELINES).join(', ')}`);
const blackout = BLACKOUTS[CUT] ?? [[0, 0]];

/** Linear interpolation over [seconds, value] pairs, clamped at both ends. */
const track = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1];
    const [t1, v1] = keys[i];
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1);
  }
  return keys[keys.length - 1][1];
};

// .oddf-rail is the pair of fixed vertical ticker rails a subpage paints down
// both edges above 821px. They are invisible at phone widths, so the 9:16 and
// 4:5 cuts never saw them; a 16:9 render is a desktop layout, where they sit
// over the frame and read as browser chrome in a film.
// .participate-band is "What comes next", the three participation cards, and
// they are the page's business rather than the film's (2026-09-21, Ronny).
// Hiding them is also what lets one unbroken roll end on the invitation: they
// sit directly after it, so with them in place the roll would have to carry on
// past the thing it is meant to finish on.
const HIDE_CSS = `
  nav, footer, .cursor, .nl-popup, .nl-popup-backdrop, .consent-banner,
  .ty-player, .space-hero-ctas, .oddf-rail, .participate-band { display: none !important }
  html { scroll-behavior: auto !important; cursor: none }
  .space-hero { min-height: 0 !important }
`;

const frameDir = path.join(OUT, CUT);
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: SCALE,
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.addInitScript(() => {
  // The two timed interruptions, off (same keys as tests/mobile/helpers.ts).
  sessionStorage.setItem('oddNewsletterPopupSeen', '1');
  localStorage.setItem('odd_analytics_consent_v1', 'denied');
  // ponytail: drops every timer of 5 s or more — today that is only
  // reveal.ts's 6 s backstop (see the file comment); narrow it if another
  // long timer ever matters on this page.
  const native = window.setTimeout;
  window.setTimeout = (fn, ms, ...rest) => (ms >= 5000 ? 0 : native(fn, ms, ...rest));
});
await page.goto(URL, { waitUntil: 'networkidle' });

// Wrong server, wrong page: refuse rather than render 40 s of something else.
const title = await page.title();
if (!title.startsWith('ODDfest 2026'))
  throw new Error(`Not the thank-you page: "${title}" at ${URL}`);
const names = await page.locator('#credits .ty-names li').count();
if (names < 200)
  throw new Error(`Only ${names} credited names on the page — is this the right build?`);

await page.addStyleTag({ content: HIDE_CSS });
await page.evaluate(async () => {
  window.__syncNavHeight?.(); // the nav is hidden now, so --nav-h becomes 0
  await document.fonts.ready;
  for (const img of document.images) img.loading = 'eager';
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  // The clock: pause every animation the first time it is seen and position
  // it at (t - firstSeen) from then on. First, the backstop the init script
  // switched off: reveal.ts triggers at 90% of the viewport, so the last
  // block of a page whose footer is hidden (the sign-off's button, at 92%)
  // would never rise — anything inside the frame is revealed here.
  const seen = new Map();
  // The wash a hard cut happens behind. Ink, above everything, never
  // interactive; the renderer sets its opacity per frame.
  const wash = document.createElement('div');
  wash.id = '__wash';
  wash.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:#0E090B;opacity:0';
  document.body.appendChild(wash);
  window.__step = (t, washOpacity) => {
    wash.style.opacity = String(washOpacity);
    for (const el of document.querySelectorAll('.reveal:not(.in)')) {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
    }
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) {
        seen.set(a, t);
        a.pause();
      }
      a.currentTime = Math.max(0, (t - seen.get(a)) * 1000);
    }
  };
});

const maxScroll = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight,
);
const resolve = async (target) => {
  if (typeof target === 'number') return target;
  if (target === 'max') return maxScroll;
  const [selector, align = 'top'] = target.split('@');
  const y = await page.evaluate(
    ([sel, al]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      if (al === 'centre') return top + r.height / 2 - window.innerHeight / 2;
      if (al === 'bottom') return top + r.height - window.innerHeight;
      return top;
    },
    [selector, align],
  );
  if (y === null) return null;
  return Math.max(0, Math.min(maxScroll, y));
};
const keys = [];
for (const [t, target, ease] of timeline) {
  const y = await resolve(target);
  if (y === null) console.warn(`skipping ${target}: not on the page`);
  else keys.push([t, y, ease ?? 'ease']);
}
const EASES = {
  ease: (x) => x * x * (3 - 2 * x),
  linear: (x) => x,
  // Credits: one unchanging speed for the first 88% of the move, then an
  // ease-out into rest over the last 12%. v = 2/(1+p) makes speed and position
  // agree at the hand-over, so there is no kick where the two meet and no
  // lurch at the end — the roll runs out of road exactly on the beat.
  roll: (x) => {
    const p = 0.88;
    const v = 2 / (1 + p);
    if (x <= p) return v * x;
    const u = (x - p) / (1 - p);
    return v * p + (1 - v * p) * (1 - (1 - u) * (1 - u));
  },
};
const yAt = (t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, y0] = keys[i - 1];
    const [t1, y1, ease] = keys[i];
    if (t <= t1) return Math.round(y0 + (y1 - y0) * EASES[ease]((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

const cutSeconds = keys[keys.length - 1][0];
const total = SECONDS_CAP ?? cutSeconds + END_HOLD;
const frames = Math.ceil(total * FPS);
console.log(`${CUT}: ${frames} frames at ${FPS} fps, ${W}x${H}@${SCALE}, page ${maxScroll}px tall`);
const started = Date.now();
for (let k = 0; k < frames; k++) {
  const t = k / FPS;
  await page.evaluate(
    ([y, tt, wash]) => {
      window.scrollTo({ top: y, behavior: 'instant' });
      return new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => (window.__step(tt, wash), r()))),
      );
    },
    [yAt(t), t, track(blackout, t)],
  );
  await page.screenshot({
    path: path.join(frameDir, `f${String(k).padStart(5, '0')}.jpg`),
    type: 'jpeg',
    quality: 90,
  });
  if (k % (FPS * 5) === 0)
    console.log(`  ${t.toFixed(1)}s (${Math.round((Date.now() - started) / 1000)}s wall)`);
}
await browser.close();

const first = execFileSync('ffprobe', [
  '-v',
  'error',
  '-show_entries',
  'stream=width,height',
  '-of',
  'csv=p=0',
  path.join(frameDir, 'f00000.jpg'),
])
  .toString()
  .trim();
if (first !== `${W * SCALE},${H * SCALE}`)
  throw new Error(`frame size ${first}, expected ${W * SCALE}x${H * SCALE}`);

const mp4 = path.join(OUT, `oddfest-2026-${CUT}-${W * SCALE}x${H * SCALE}.mp4`);
// No fade: the song ends the film, and the two seconds of end hold are padded
// with silence so the card is still on screen when the last note has gone.
const audioFilter = 'apad';
execFileSync('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-framerate',
  String(FPS),
  '-i',
  path.join(frameDir, 'f%05d.jpg'),
  '-itsoffset',
  String(AUDIO_OFFSET),
  '-i',
  TRACK,
  '-af',
  audioFilter,
  // CRF 20 / slow, not 18 / medium (2026-09-21): 18 produced a 9.8 Mbit/s,
  // 49 MB file for the 40 s cut, which is far above anything Instagram,
  // TikTok or LinkedIn keeps — they re-encode to a few Mbit/s regardless, so
  // the extra bitrate is thrown away on upload. Measured on this cut's own
  // frames: CRF 20 is 39 MB at SSIM 0.9961 against the source frames, and
  // even CRF 22 (30 MB, 0.9941) was indistinguishable from source on the
  // hardest content this film has — the credits, thin Paper type on Ink.
  // 20 keeps a margin of headroom for the platform's own re-encode.
  '-c:v',
  'libx264',
  '-crf',
  '20',
  '-preset',
  'slow',
  '-pix_fmt',
  'yuv420p',
  '-r',
  String(FPS),
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-movflags',
  '+faststart',
  '-shortest',
  mp4,
]);
const probe = execFileSync('ffprobe', [
  '-v',
  'error',
  '-show_entries',
  'stream=codec_name,width,height:format=duration',
  '-of',
  'default=nw=1',
  mp4,
])
  .toString()
  .trim()
  .replace(/\n/g, '  ');
console.log(`${mp4}\n${probe}\nframes kept in ${frameDir} (stills for the post)`);
