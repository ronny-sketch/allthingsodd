// Marquees breathe with scroll — a quick kick of speed each time the page moves.
const tracks = Array.from(
  document.querySelectorAll<HTMLElement>('.logo-marquee-track, .about-marquee-track'),
);
if (tracks.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const baseDur = tracks.map((t) => parseFloat(getComputedStyle(t).animationDuration) || 20);
  let lastY = window.scrollY;
  let resetTimer: ReturnType<typeof setTimeout>;
  window.addEventListener(
    'scroll',
    () => {
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      const kick = Math.max(0.4, 1 - Math.min(dy, 40) / 50);
      tracks.forEach((t, k) => (t.style.animationDuration = `${baseDur[k] * kick}s`));
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => tracks.forEach((t) => (t.style.animationDuration = '')), 500);
    },
    { passive: true },
  );
}

export {};
