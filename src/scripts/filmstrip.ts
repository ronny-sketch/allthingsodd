// News filmstrip — a continuous right-to-left drift (rAF, not CSS keyframes, so a
// click can nudge the exact same position by exactly one image-width); the strip
// holds every photo twice back to back, so wrapping past the first set is seamless.
const duo = document.getElementById('newsDuo');
const strip = document.getElementById('newsStrip');
const prev = document.getElementById('newsPrev');
const next = document.getElementById('newsNext');

if (duo && strip && prev && next) {
  const realCount = strip.children.length / 2;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let itemW = 0;
  let setW = 0;
  function measure() {
    itemW = strip!.children[0].getBoundingClientRect().width;
    setW = itemW * realCount;
  }
  measure();
  window.addEventListener('resize', measure);

  let x = 0;
  let paused = false;
  let snapping = false;
  let pauseTimer: ReturnType<typeof setTimeout>;

  function apply() {
    strip!.style.transform = `translateX(${x}px)`;
  }
  function wrap() {
    if (-x >= setW) x += setW;
    if (x > 0) x -= setW;
  }
  function drift() {
    if (!paused && !snapping && !reduceMotion) {
      x -= 0.4;
      wrap();
      apply();
    }
    requestAnimationFrame(drift);
  }
  function step(dir: number) {
    snapping = true;
    strip!.classList.add('is-snapping');
    x += dir * -itemW;
    wrap();
    apply();
    paused = true;
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => (paused = false), 4500);
    setTimeout(
      () => {
        strip!.classList.remove('is-snapping');
        snapping = false;
      },
      reduceMotion ? 0 : 620,
    );
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  duo.addEventListener('mouseenter', () => (paused = true));
  duo.addEventListener('mouseleave', () => (paused = false));
  requestAnimationFrame(drift);
}

export {};
