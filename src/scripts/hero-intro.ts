/*
  Hero logo intro (2026-10-22). public/odd-mark-intro.svg plays once and its
  last <set> freezes on the ODD mark's own path, so the intro simply stays as
  the mark: vector, as crisp as the inline SVG, and with no handover to jump.
  (A handover to the inline mark was tried first and measured: browsers snap
  an <img> box to the pixel grid, so the swap moved the edges by up to a third
  of a pixel. Not swapping at all is exact.)

  The inline SVG mark is the fallback, and this is all that switches to it:
  if the file has not loaded within SLOW_MS (a slow connection) or fails, the
  intro is skipped and the mark shows at once rather than leaving an empty
  hole in the hero. Reduced motion never gets a real file: Hero.astro's
  <picture> swaps in a 1px placeholder and CSS shows the inline mark.
*/
const SLOW_MS = 2000;

const mark = document.getElementById('heroMark');
const intro = mark?.querySelector('img');

if (mark && intro && !(intro.complete && intro.naturalWidth > 1)) {
  const skip = () => mark.classList.add('is-skipped');
  const slow = setTimeout(skip, SLOW_MS);
  intro.addEventListener('load', () => clearTimeout(slow), { once: true });
  intro.addEventListener(
    'error',
    () => {
      clearTimeout(slow);
      skip();
    },
    { once: true },
  );
}

export {};
