/*
  One shared lifecycle for every decorative autoplaying video on the site —
  the ODDfest hero, the ODDference hero and the homepage aftermovie.

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

  Contract (see Aftermovie.astro / FullbleedVideoHero.astro for the markup):

    <div data-video-stage>
      <img data-video-poster … >          ← always rendered, always the LCP
      <video data-autoplay-video
             muted loop playsinline preload="none"
             data-src="/video/x.mp4"></video>
    </div>

  `data-src` rather than a `<source src>` so nothing is fetched until this
  module decides to — which it doesn't do at all under reduced motion, and
  doesn't do until the stage is near the viewport otherwise.
*/

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

interface Stage {
  root: HTMLElement;
  video: HTMLVideoElement;
  poster: HTMLElement | null;
  loadStarted: boolean;
  playing: boolean;
  failed: boolean;
  visible: boolean;
}

const stages: Stage[] = [];

function markFailed(stage: Stage) {
  // Poster stays exactly where it is. The <video> is hidden outright rather
  // than left at opacity 0 so it can never contribute a black box, and its
  // buffer is released — there is nothing useful left for it to hold.
  stage.failed = true;
  stage.root.dataset.videoState = 'poster';
  stage.video.removeAttribute('src');
  try {
    stage.video.load();
  } catch {
    /* a detached/reset media element can throw here; nothing depends on it */
  }
}

function markPlaying(stage: Stage) {
  if (stage.playing) return;
  stage.playing = true;
  // Only now — a decoded frame exists and the clock is moving — is the video
  // allowed to become the visible layer. The poster fades out under it rather
  // than being removed, so a later pause/stall never exposes an empty frame,
  // and `object-fit: cover` on both keeps the swap geometrically identical.
  stage.root.dataset.videoState = 'playing';
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

async function start(stage: Stage) {
  if (stage.loadStarted || stage.failed || REDUCED.matches) return;
  stage.loadStarted = true;

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

  const ready = await whenReady(stage.video);
  if (!ready || stage.video.error) {
    markFailed(stage);
    return;
  }

  try {
    // play() rejects on any autoplay policy that isn't satisfied (and WebKit
    // in particular rejects in more situations than Chromium). A rejection is
    // a normal outcome here, not an error to report — it just means this
    // visitor keeps the poster.
    await stage.video.play();
  } catch {
    markFailed(stage);
    return;
  }

  // play() having resolved still isn't proof of a moving picture — confirm the
  // clock actually advanced before handing the frame over.
  if (stage.video.paused) {
    markFailed(stage);
    return;
  }
  const t0 = stage.video.currentTime;
  window.setTimeout(() => {
    if (stage.failed) return;
    if (stage.video.paused || (stage.video.currentTime === t0 && t0 !== 0)) {
      markFailed(stage);
      return;
    }
    markPlaying(stage);
  }, 220);
}

/** Playing video off-screen or in a hidden tab is pure battery cost. */
function syncPlayback(stage: Stage) {
  if (!stage.playing || stage.failed) return;
  const shouldPlay = stage.visible && !document.hidden && !REDUCED.matches;
  if (shouldPlay && stage.video.paused) {
    void stage.video.play().catch(() => {
      /* a resume can be refused after a tab switch; the frame on screen is
         still the last decoded one, so there is nothing to fall back to */
    });
  } else if (!shouldPlay && !stage.video.paused) {
    stage.video.pause();
  }
}

document.querySelectorAll<HTMLElement>('[data-video-stage]').forEach((root) => {
  const video = root.querySelector<HTMLVideoElement>('video[data-autoplay-video]');
  if (!video) return;
  const stage: Stage = {
    root,
    video,
    poster: root.querySelector<HTMLElement>('[data-video-poster]'),
    loadStarted: false,
    playing: false,
    failed: false,
    visible: false,
  };
  stages.push(stage);

  // Belt and braces: markup already ships `muted`/`playsinline`, but without
  // both of them iOS refuses inline autoplay outright and Chromium refuses
  // unmuted autoplay, so neither is left to chance.
  video.muted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;
  video.setAttribute('playsinline', '');

  if (REDUCED.matches) {
    // No video pipeline at all for these visitors — the poster is the whole
    // rendering, and nothing is downloaded. Same intent as the older
    // reduced-motion-video.ts swap, reached without a DOM replacement.
    root.dataset.videoState = 'poster';
    return;
  }

  root.dataset.videoState = 'poster';

  if (!('IntersectionObserver' in window)) {
    stage.visible = true;
    void start(stage);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        stage.visible = entry.isIntersecting;
        if (entry.isIntersecting) void start(stage);
        syncPlayback(stage);
      }
    },
    // Begin loading a little before the stage scrolls in, so the swap has
    // usually already happened by the time it is actually looked at, without
    // competing with the initial viewport's own LCP work.
    { rootMargin: '200px 0px', threshold: 0 },
  );
  io.observe(root);
});

if (stages.length) {
  document.addEventListener('visibilitychange', () => stages.forEach(syncPlayback));
  // A visitor turning reduced motion on mid-session should stop seeing motion
  // immediately, not on the next navigation.
  REDUCED.addEventListener('change', () => {
    stages.forEach((stage) => {
      if (REDUCED.matches && stage.playing) {
        stage.video.pause();
        stage.root.dataset.videoState = 'poster';
        stage.playing = false;
      } else {
        syncPlayback(stage);
      }
    });
  });
}

export {};
