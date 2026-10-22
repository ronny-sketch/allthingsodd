/*
  Hero logo intro (2026-10-22). public/odd-mark-intro.webp plays once (its
  loop count is 1) and holds its last frame, which is the ODD mark. This hands
  over to the SVG mark when the intro has landed, so what stays on screen is
  the crisp vector at any size, not a raster.

  The handover is timed from the image's `load`, never before it: an animated
  image starts playing no later than it finishes loading, so the SVG can only
  appear on or after the last frame, where the two are identical. If the file
  has not loaded within SLOW_MS (a slow connection), the intro is skipped and
  the SVG shows at once rather than leaving an empty hole in the hero.

  Without JavaScript the WebP simply plays and holds its last frame. Reduced
  motion never gets here with a real file: Hero.astro's <picture> swaps in a
  1px placeholder and CSS shows the SVG straight away.
*/
const INTRO_MS = 2471; // time to the last frame, from the encode
const SLOW_MS = 2000;

const mark = document.getElementById('heroMark');
const intro = mark?.querySelector('img');

if (mark && intro) {
  const settle = () => mark.classList.add('is-settled');
  const slow = setTimeout(settle, SLOW_MS);
  const start = () => {
    clearTimeout(slow);
    setTimeout(settle, INTRO_MS);
  };
  if (intro.complete) {
    if (intro.naturalWidth > 1) start();
    else settle();
  } else {
    intro.addEventListener('load', start, { once: true });
    intro.addEventListener('error', settle, { once: true });
  }
}

export {};
