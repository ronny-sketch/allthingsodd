// The top nav is sticky, so anything else that pins or fixes itself to the viewport
// (the about-page scroll, the subpage side rails) needs to know its real height
// rather than assuming a number and bleeding underneath it.
const navEl = document.querySelector('nav');
if (navEl) {
  const sync = () =>
    document.documentElement.style.setProperty('--nav-h', `${navEl.offsetHeight}px`);
  (window as unknown as { __syncNavHeight?: () => void }).__syncNavHeight = sync;
  window.addEventListener('resize', sync);
  sync();
}

export {};
