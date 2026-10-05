/*
  One shared lifecycle for every decorative autoplaying video on the site —
  the ODDfest hero, the ODDference hero and the two film previews on the
  homepage (VideoAndPictures.astro).

  Added 2026-09-02 (mobile experience pass), replacing three divergent
  approaches: the two heroes shipped a bare `<video autoplay muted loop
  playsinline poster=…>` and simply hoped, while Aftermovie.astro ran an
  inline script that removed its poster `<img>` and called `video.load()`
  *before* knowing whether the video would ever play. That last one is a real,
  reproduced bug, not a theoretical one — measured across all 14 mobile
  viewports in both engines, the homepage aftermovie ended up with the poster
  gone, `paused === true` and `currentTime === 0`: a plain black rectangle
  where the film should be. (Chromium additionally reported the .mp4 request
  as ERR_ABORTED, WebKit as `cancelled` — `load()` tearing down the fetch
  `autoplay` had already started, with nothing retrying afterwards.)

  The rule this module enforces: **the poster is the truth until playback is
  proven.** Nothing is swapped, faded or removed on an intention; only a video
  that has actually decoded a frame and is actually advancing gets to replace
  the still.

  Contract (see VideoAndPictures.astro / FullbleedVideoHero.astro for the
  markup):

    <div data-video-stage>
      <img data-video-poster … >          ← always rendered, always the LCP
      <video data-autoplay-video
             muted loop playsinline preload="none"
             data-src="/video/x.mp4"></video>
      <VideoToggle />                     ← optional, shown once playing
    </div>

  `data-src` rather than a `<source src>` so nothing is fetched until this
  module decides to — which it doesn't do while reduced motion is on, and
  doesn't do until the stage is near the viewport otherwise.

  2026-10-04: loading and playing are two separate decisions now. Loading
  starts 200px before the stage scrolls in; playing happens only while it is
  actually on screen, in a visible tab, with motion allowed, no full film
  playing (film-player.ts) and the visitor's own pause not pressed. Before,
  one 200px observer decided both, so a preview played while still offscreen,
  and play() ran as soon as a load finished even if the visitor had scrolled
  past or switched tabs in the meantime. Turning reduced motion off again
  mid-visit now restarts playback; it used to leave the poster for good.
*/

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

interface Stage {
  root: HTMLElement;
  video: HTMLVideoElement;
  toggle: HTMLButtonElement | null;
  /** Load started. */
  loading: boolean;
  /** A frame is decoded. */
  ready: boolean;
  /** Playback proven at least once — the video may be the visible layer. */
  confirmed: boolean;
  failed: boolean;
  /** Actually on screen, not merely inside the load margin. */
  visible: boolean;
  /** The visitor pressed pause (VideoToggle). */
  userPaused: boolean;
}

const stages: Stage[] = [];
/** A full film is playing (film-player.ts); no preview competes with it. */
let held = false;

const wanted = (s: Stage) =>
  s.visible && !document.hidden && !REDUCED.matches && !held && !s.userPaused;

function show(stage: Stage, layer: 'poster' | 'playing') {
  stage.root.dataset.videoState = layer;
  // Nothing to pause while the still is the rendering.
  if (stage.toggle) stage.toggle.hidden = layer !== 'playing';
}

function markFailed(stage: Stage) {
  // Poster stays exactly where it is. The <video> is hidden outright rather
  // than left at opacity 0 so it can never contribute a black box, and its
  // buffer is released — there is nothing useful left for it to hold.
  stage.failed = true;
  show(stage, 'poster');
  stage.video.removeAttribute('src');
  try {
    stage.video.load();
  } catch {
    /* a detached/reset media element can throw here; nothing depends on it */
  }
}

/** Resolves true only once the element has really rendered a frame. */
function whenReady(video: HTMLVideoElement): Promise<boolean> {
  // HAVE_CURRENT_DATA — there is a frame for the current position. Anything
  // less and "play()" resolving still tells us nothing about what's on screen.
  if (video.readyState >= 2) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('loadeddata', ok0);
      video.removeEventListener('error', err);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const ok0 = () => done(true);
    const err = () => done(false);
    video.addEventListener('loadeddata', ok0);
    video.addEventListener('error', err);
    // A stalled fetch never fires either event. Give up rather than leave the
    // stage in limbo — the poster is already a complete, correct rendering.
    const timer = window.setTimeout(() => done(video.readyState >= 2), 12000);
  });
}

async function load(stage: Stage) {
  if (stage.loading || stage.failed || REDUCED.matches) return;
  stage.loading = true;

  const src = stage.video.dataset.src;
  if (!src) {
    markFailed(stage);
    return;
  }
  stage.video.src = src;
  // preload="none" is the shipped attribute; flip it now that this element is
  // genuinely wanted, so the browser fetches rather than waiting for play().
  stage.video.preload = 'auto';
  stage.video.load();

  if (!(await whenReady(stage.video)) || stage.video.error) {
    markFailed(stage);
    return;
  }
  stage.ready = true;
  // Not play(): the visitor may have scrolled past or switched tabs while
  // this loaded. sync() asks.
  sync(stage);
}

async function play(stage: Stage) {
  try {
    // play() rejects on any autoplay policy that isn't satisfied (and WebKit
    // in particular rejects in more situations than Chromium). A rejection is
    // a normal outcome here, not an error to report — it just means this
    // visitor keeps the poster. AbortError is different: our own pause()
    // interrupted the start because the stage left the screen, and the next
    // sync() will try again.
    await stage.video.play();
  } catch (e) {
    if (!stage.confirmed && (e as DOMException | null)?.name !== 'AbortError') markFailed(stage);
    return;
  }
  if (stage.confirmed) return;

  // play() having resolved still isn't proof of a moving picture — confirm the
  // clock actually advanced before handing the frame over.
  const t0 = stage.video.currentTime;
  window.setTimeout(() => {
    // Paused on purpose in the meantime: confirm on the next start instead.
    if (stage.failed || stage.confirmed || !wanted(stage)) return;
    if (stage.video.paused || (stage.video.currentTime === t0 && t0 !== 0)) {
      markFailed(stage);
      return;
    }
    stage.confirmed = true;
    // Only now — a decoded frame exists and the clock is moving — is the video
    // allowed to become the visible layer. The poster fades out under it
    // rather than being removed, so a later pause/stall never exposes an empty
    // frame, and `object-fit: cover` on both keeps the swap geometrically
    // identical.
    show(stage, 'playing');
  }, 220);
}

/** Plays exactly when wanted() says so; the one place that decides. */
function sync(stage: Stage) {
  if (stage.failed) return;
  if (REDUCED.matches) {
    // A visitor turning reduced motion on mid-visit stops seeing motion
    // immediately, and gets the still back rather than a frozen frame.
    if (!stage.video.paused) stage.video.pause();
    show(stage, 'poster');
    return;
  }
  if (!stage.ready) return;
  if (stage.confirmed) show(stage, 'playing');
  const want = wanted(stage);
  if (want && stage.video.paused) void play(stage);
  else if (!want && !stage.video.paused) stage.video.pause();
}

/** film-player.ts: true while a full film plays, false when it closes. */
export function holdPreviews(on: boolean) {
  held = on;
  stages.forEach(sync);
}

const last = (entries: IntersectionObserverEntry[]) => entries[entries.length - 1];

document.querySelectorAll<HTMLElement>('[data-video-stage]').forEach((root) => {
  const video = root.querySelector<HTMLVideoElement>('video[data-autoplay-video]');
  if (!video) return;
  const stage: Stage = {
    root,
    video,
    toggle: root.querySelector<HTMLButtonElement>('[data-video-toggle]'),
    loading: false,
    ready: false,
    confirmed: false,
    failed: false,
    visible: false,
    userPaused: false,
  };
  stages.push(stage);

  // Belt and braces: markup already ships `muted`/`playsinline`, but without
  // both of them iOS refuses inline autoplay outright and Chromium refuses
  // unmuted autoplay, so neither is left to chance.
  video.muted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;
  video.setAttribute('playsinline', '');

  // Under reduced motion the poster is the whole rendering and nothing is
  // downloaded; load() refuses until the preference changes.
  show(stage, 'poster');

  stage.toggle?.addEventListener('click', () => {
    const t = stage.toggle!;
    stage.userPaused = !stage.userPaused;
    t.setAttribute(
      'aria-label',
      (stage.userPaused ? t.dataset.playLabel : t.dataset.pauseLabel) ?? '',
    );
    t.dataset.paused = String(stage.userPaused);
    sync(stage);
  });

  if (!('IntersectionObserver' in window)) {
    stage.visible = true;
    void load(stage);
    return;
  }
  // Begin loading a little before the stage scrolls in, so the swap has
  // usually already happened by the time it is actually looked at, without
  // competing with the initial viewport's own LCP work…
  new IntersectionObserver(
    (entries) => {
      if (last(entries).isIntersecting) void load(stage);
    },
    { rootMargin: '200px 0px' },
  ).observe(root);
  // …but play only while some of it is really on screen. (load() again here
  // for a stage that came near while reduced motion was still on.)
  new IntersectionObserver((entries) => {
    stage.visible = last(entries).isIntersecting;
    if (stage.visible) void load(stage);
    sync(stage);
  }).observe(root);
});

if (stages.length) {
  document.addEventListener('visibilitychange', () => stages.forEach(sync));
  REDUCED.addEventListener('change', () =>
    stages.forEach((stage) => {
      // Turned off again: a stage that never loaded starts now if it is
      // close; sync() alone covers one that already had.
      if (!REDUCED.matches && stage.visible) void load(stage);
      sync(stage);
    }),
  );
}
