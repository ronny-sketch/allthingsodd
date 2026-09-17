/*
  "Play the credits" on /oddfest-2026/ — the one interaction the old
  standalone thank-you page had that the rebuild keeps: the aftermovie's
  soundtrack plays while the page scrolls itself, like end credits.

  The roll is the length of the song (2026-09-17). The scroll position is a
  function of the audio's own clock, not of a fixed px/second: whatever is
  left of the page is spread across whatever is left of the track, so the
  last name arrives as the music ends. Pausing and resuming re-spreads the
  remainder, and the page growing under it (a lazy image loading) is absorbed
  on the next frame because the distance is re-measured every time.

  The audio clock leads, wall-clock follows: if playback is refused, stalls or
  the browser never advances currentTime, the same progress is driven by
  elapsed real time instead, so the roll always runs and always takes the same
  total time.

  Every link to `#credits` is the trigger. Without JS it is an ordinary anchor
  to the credits section. With JS it starts the soundtrack and the roll from
  wherever the reader is, and a fixed control (`[data-credits-player]`)
  appears to pause and resume.

  Reduced motion: the page never scrolls itself. The link keeps its normal
  jump to the credits, and only the soundtrack starts.

  Scrolling by hand (wheel, touch, scroll keys) pauses both, so the page never
  fights the reader. Reaching the end of the page, or the end of the track,
  pauses both too.
*/

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
/** Only used while the track's real duration is unknown, in CSS px per second. */
const FALLBACK_SPEED = 90;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

const player = document.querySelector<HTMLElement>('[data-credits-player]');
const toggle = document.getElementById('creditsToggle');

if (player && toggle) {
  let audio: HTMLAudioElement | null = null;
  let playing = false;
  let frame = 0;
  /** Where this run of the roll started, and how far and how long it has to go. */
  let fromY = 0;
  let runSeconds = 0;
  let elapsed = 0;
  let lastFrame: number | null = null;
  let lastAudioTime = 0;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  /** Seconds of track left, or null while the browser hasn't read its duration. */
  const trackLeft = () => {
    const total = audio?.duration;
    if (!audio || !total || !Number.isFinite(total)) return null;
    return Math.max(0.1, total - audio.currentTime);
  };

  /** Start (or restart) a run from here, across what is left of the track. */
  const measure = () => {
    fromY = window.scrollY;
    elapsed = 0;
    lastFrame = null;
    lastAudioTime = audio?.currentTime ?? 0;
    const distance = Math.max(0, maxScroll() - fromY);
    runSeconds = trackLeft() ?? distance / FALLBACK_SPEED;
  };

  const step = (now: number) => {
    if (!playing) return;

    // The audio clock leads while it is actually advancing; otherwise real
    // time does, so a refused or stalled track still rolls the credits.
    const audioTime = audio?.currentTime ?? 0;
    if (audio && !audio.paused && audioTime > lastAudioTime) {
      elapsed += audioTime - lastAudioTime;
    } else if (lastFrame !== null) {
      elapsed += (now - lastFrame) / 1000;
    }
    lastAudioTime = audioTime;
    lastFrame = now;

    // Re-measured every frame: the remaining distance is what it is now, not
    // what it was when the roll started.
    const remaining = maxScroll() - fromY;
    const progress = Math.min(1, elapsed / Math.max(0.1, runSeconds));
    const target = fromY + remaining * progress;
    if (target > window.scrollY) window.scrollTo({ top: target, behavior: 'instant' });

    if (progress >= 1 || window.scrollY >= maxScroll() - 2) return pause();
    frame = requestAnimationFrame(step);
  };

  const play = () => {
    if (playing) return;
    if (!audio) {
      audio = new Audio(player.dataset.src);
      audio.volume = 0.8;
      // Not looped since 2026-09-17: the roll is the length of the song, so
      // the song ending is the roll ending.
      audio.addEventListener('ended', () => pause());
      // Duration usually arrives after the first frames; re-spread the roll
      // across the real length as soon as it does.
      audio.addEventListener('loadedmetadata', () => {
        if (playing) measure();
      });
    }
    audio.play().catch(() => {});
    playing = true;
    player.hidden = false;
    toggle.textContent = 'Pause the credits';
    if (!REDUCED.matches) {
      measure();
      frame = requestAnimationFrame(step);
    }
  };

  function pause() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(frame);
    audio?.pause();
    toggle!.textContent = 'Play the credits';
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href="#credits"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      // Reduced motion keeps the anchor's own jump; otherwise the roll
      // starts from here and does the moving.
      if (!REDUCED.matches) event.preventDefault();
      play();
    });
  });

  toggle.addEventListener('click', () => (playing ? pause() : play()));

  // Only the self-scroll yields to the reader. Under reduced motion the
  // reader does all the scrolling, so it must not stop the soundtrack; and a
  // touch on the control itself is that control's own click.
  const interrupt = (event: Event) => {
    if (REDUCED.matches || player.contains(event.target as Node)) return;
    if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
    pause();
  };
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  window.addEventListener('keydown', interrupt);
}
