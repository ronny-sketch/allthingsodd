// Magnetic buttons — the few CTAs worth reaching for lean a little toward the cursor.
if (
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !window.matchMedia('(hover: none)').matches
) {
  document.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.35;
      const y = (e.clientY - r.top - r.height / 2) * 0.45;
      el.style.transform = `translate(${x}px,${y}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

export {};
