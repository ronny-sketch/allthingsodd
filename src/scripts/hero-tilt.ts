/*
  Hero ambience. Two branches, one per input model — never a simulated
  version of the other.

  **Pointer devices** get the original cursor tilt + spotlight: the mosaic
  leans toward the cursor, the logo drifts the opposite way, and a soft radial
  spotlight follows the pointer. Unchanged.

  **Touch devices** got nothing at all before 2026-09-02 — this module bailed
  on `(hover: none)` and the hero sat perfectly still, which is most of why
  the phone homepage read as a flatter copy of the desktop one rather than its
  own thing. They now get a scroll-linked equivalent built from the input they
  actually have: the mosaic tilts and the logo counter-drifts as the hero
  moves through the viewport, and the spotlight sweeps with it.

  Explicitly not done here: no synthetic mouse events, and no
  DeviceOrientation (which would demand a permission prompt on iOS for a
  decorative effect). Scroll position is already free and already exact.
*/
const hero = document.querySelector<HTMLElement>('.hero');
const mosaic = document.getElementById('heroMosaic');
const spotlight = document.getElementById('heroSpotlight');
const logo = document.getElementById('heroLogo');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = window.matchMedia('(hover: none)').matches;

if (hero && mosaic && spotlight && touch && !reduceMotion) {
  // Scroll-driven, so there is no rAF loop idling when nothing is moving —
  // the handler runs on scroll, coalesced to one write per frame.
  let queued = false;

  function paint() {
    queued = false;
    const rect = hero!.getBoundingClientRect();
    // How far the hero has travelled through the viewport, -1 (just below) to
    // 1 (fully past). Clamped so a rubber-band overscroll can't overshoot.
    const progress = Math.max(-1, Math.min(1, -rect.top / (rect.height || 1)));
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    // Deliberately small: 2.2deg against the desktop tilt's 9deg. This should
    // register as the photography having depth, not as the page moving under
    // the reader — a hero that swings while you are trying to scroll past it
    // is what makes people feel seasick.
    //
    // Measured before keeping it: disabling this whole branch changes the
    // homepage's steady-state CPU on a 4x-throttled phone profile by less
    // than the run-to-run noise (three runs each, ~1600ms per 6s either
    // way), so the effect is free at this scale. It is scroll-driven rather
    // than a rAF loop, so nothing runs at all while the page is still.
    const tilt = progress * -2.2;
    mosaic!.style.transform = `rotateX(${tilt.toFixed(2)}deg) scale(1.03)`;
    if (logo) logo.style.transform = `translateY(${(progress * 16).toFixed(1)}px)`;
    spotlight!.style.background = `radial-gradient(circle 60vw at 50% ${(38 + progress * 26).toFixed(1)}%, rgba(226,223,222,0.09) 0%, transparent 68%)`;
  }

  paint();
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    },
    { passive: true },
  );
  window.addEventListener('resize', () => requestAnimationFrame(paint), { passive: true });
}

if (hero && mosaic && spotlight && !touch && !reduceMotion) {
  let tiltX = 0;
  let tiltY = 0;
  let tgtTX = 0;
  let tgtTY = 0;
  let raf: number | null = null;
  let inside = false;

  function tick() {
    tiltX += (tgtTX - tiltX) * 0.06;
    tiltY += (tgtTY - tiltY) * 0.06;
    mosaic!.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(1.02)`;
    if (logo)
      logo.style.transform = `translate(${(-tiltY * 1.4).toFixed(1)}px,${(-tiltX * 1.4).toFixed(1)}px)`;
    raf = requestAnimationFrame(tick);
  }

  hero.addEventListener('mouseenter', () => {
    inside = true;
    if (!raf) raf = requestAnimationFrame(tick);
  });
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    tgtTX = (ny - 0.5) * -9;
    tgtTY = (nx - 0.5) * 9;
    spotlight!.style.background = `radial-gradient(circle 320px at ${(nx * 100).toFixed(1)}% ${(ny * 100).toFixed(1)}%, rgba(226,223,222,0.10) 0%, transparent 68%)`;
  });
  hero.addEventListener('mouseleave', () => {
    inside = false;
    tgtTX = 0;
    tgtTY = 0;
    spotlight!.style.background = 'none';
    setTimeout(() => {
      if (!inside && raf) {
        cancelAnimationFrame(raf);
        raf = null;
        mosaic!.style.transform = '';
        if (logo) logo.style.transform = '';
      }
    }, 600);
  });
}

export {};
