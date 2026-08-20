// About page: vertical scroll pinned and mapped to horizontal panel movement.
const wrap = document.getElementById('aboutPinWrap');
const track = document.getElementById('aboutTrack');
const hint = document.getElementById('aboutHint');

if (wrap && track) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    wrap.classList.add('about-static');
  } else {
    let ticking = false;
    function update() {
      ticking = false;
      const vh = window.innerHeight;
      const total = wrap!.offsetHeight - vh;
      if (total <= 0) return;
      const scrolled = -wrap!.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, scrolled / total));
      const maxX = track!.scrollWidth - window.innerWidth;
      track!.style.transform = `translateX(${-progress * maxX}px)`;
      if (hint) hint.style.opacity = progress > 0.03 ? '0' : '1';
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    function onResize() {
      (window as unknown as { __syncNavHeight?: () => void }).__syncNavHeight?.();
      onScroll();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    update();
  }
}

export {};
