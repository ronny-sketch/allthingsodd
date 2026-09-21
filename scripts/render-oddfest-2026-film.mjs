#!/usr/bin/env node
/*
  Renders /oddfest-2026/ as a phone-sized video for social media.

    npm run build && npx astro preview --port 4331     # a preview of THIS build
    node scripts/render-oddfest-2026-film.mjs --cut short --url http://127.0.0.1:4331/oddfest-2026/
    node scripts/render-oddfest-2026-film.mjs --cut full  --url http://127.0.0.1:4331/oddfest-2026/

  Options: --cut short|full (40 s social cut / the whole 84.67 s credits roll)
           --url  the page (default http://localhost:4321/oddfest-2026/)
           --size 360x640 (CSS px; 360x450 for a 4:5 feed post)  --scale 3
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
  never scrolls itself; the full cut simply reproduces the page's own linear
  roll from src/scripts/oddfest-2026-credits.ts after a 6 s hero hold.

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
const CUT = arg('cut', 'short');
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
const FADE = 3;

// [seconds, target]: a scrollY in px, 'max', or 'selector@top|centre|bottom'.
// Smoothstep between keyframes; a repeated target is a hold.
const TIMELINES = {
  full: [
    [0, 0],
    [6, 0],
    [TRACK_SECONDS, 'max'],
  ],
  short: [
    [0, 0],
    [4, 0],
    [7, '.ty-count@centre'],
    [10, '.ty-count@centre'],
    [13, '#credits@top'],
    [28, '#photos@bottom'],
    [29.5, '#afterparty@centre'],
    [34.5, '#afterparty@centre'],
    [37, 'max'],
    [40, 'max'],
  ],
};
const timeline = TIMELINES[CUT];
if (!timeline) throw new Error(`--cut must be one of ${Object.keys(TIMELINES).join(', ')}`);

const HIDE_CSS = `
  nav, footer, .cursor, .nl-popup, .nl-popup-backdrop, .consent-banner,
  .ty-player, .space-hero-ctas { display: none !important }
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
  window.__step = (t) => {
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
for (const [t, target] of timeline) {
  const y = await resolve(target);
  if (y === null) console.warn(`skipping ${target}: not on the page`);
  else keys.push([t, y]);
}
const smooth = (x) => x * x * (3 - 2 * x);
const yAt = (t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, y0] = keys[i - 1];
    const [t1, y1] = keys[i];
    if (t <= t1) return Math.round(y0 + (y1 - y0) * smooth((t - t0) / (t1 - t0)));
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
    ([y, tt]) => {
      window.scrollTo({ top: y, behavior: 'instant' });
      return new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => (window.__step(tt), r()))),
      );
    },
    [yAt(t), t],
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
const audioFilter = CUT === 'full' ? 'apad' : `afade=t=out:st=${cutSeconds - FADE}:d=${FADE},apad`;
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
  '-c:v',
  'libx264',
  '-crf',
  '18',
  '-preset',
  'medium',
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
