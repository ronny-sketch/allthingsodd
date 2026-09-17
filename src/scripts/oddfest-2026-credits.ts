/*
  "Play the credits" on /oddfest-2026/ — the one interaction the old
  standalone thank-you page had that the rebuild keeps: the aftermovie's
  soundtrack plays while the page scrolls itself, slowly, like end credits.

  Every link to `#credits` is the trigger. Without JS it is an ordinary
  anchor to the credits section. With JS it starts the soundtrack and the
  scroll from wherever the reader is, and a fixed control
  (`[data-credits-player]`) appears to pause and resume it.

  Reduced motion: the page never scrolls itself. The link keeps its normal
  jump to the credits, and only the soundtrack starts.

  Scrolling by hand (wheel, touch, scroll keys) pauses both, so the page
  never fights the reader. Reaching the end of the page pauses both too.
*/

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
/** Scroll speed, CSS px per second. */
const SPEED = 90;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

const player = document.querySelector<HTMLElement>('[data-credits-player]');
const toggle = document.getElementById('creditsToggle');

if (player && toggle) {
  let audio: HTMLAudioElement | null = null;
  let playing = false;
  let frame = 0;
  let last: number | null = null;
  // scrollBy rounds to whole pixels, so fractions carry to the next frame.
  let carry = 0;

  const atEnd = () =>
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

  const step = (now: number) => {
    if (!playing) return;
    if (last !== null) {
      carry += (SPEED * (now - last)) / 1000;
      const px = Math.floor(carry);
      carry -= px;
      if (px > 0) window.scrollBy({ top: px, behavior: 'instant' });
      if (atEnd()) return pause();
    }
    last = now;
    frame = requestAnimationFrame(step);
  };

  const play = () => {
    if (playing) return;
    audio ??= Object.assign(new Audio(player.dataset.src), { loop: true, volume: 0.8 });
    audio.play().catch(() => {});
    playing = true;
    player.hidden = false;
    toggle.textContent = 'Pause the credits';
    if (!REDUCED.matches) {
      last = null;
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
