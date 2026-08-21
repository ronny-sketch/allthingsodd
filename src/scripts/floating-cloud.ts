// Floating photo cloud: each photo drifts a little toward/away from the
// cursor, at its own depth (data-depth, set per slot in FloatingCloud.astro)
// — same smoothed-lerp approach as hero-tilt.ts. Skipped entirely under
// prefers-reduced-motion or on touch (no meaningful pointer to react to).
if (
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !window.matchMedia('(hover: none)').matches
) {
  document.querySelectorAll<HTMLElement>('[data-floating-cloud]').forEach((cloud) => {
    const items = Array.from(cloud.querySelectorAll<HTMLElement>('.floating-cloud-item')).map(
      (el) => ({
        el,
        depth: parseFloat(el.dataset.depth ?? '1'),
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
      }),
    );
    if (!items.length) return;

    let raf: number | null = null;
    function tick() {
      let stillMoving = false;
      for (const item of items) {
        item.x += (item.tx - item.x) * 0.08;
        item.y += (item.ty - item.y) * 0.08;
        if (Math.abs(item.tx - item.x) > 0.05 || Math.abs(item.ty - item.y) > 0.05)
          stillMoving = true;
        item.el.style.setProperty('--driftX', `${item.x.toFixed(1)}px`);
        item.el.style.setProperty('--driftY', `${item.y.toFixed(1)}px`);
      }
      raf = stillMoving ? requestAnimationFrame(tick) : null;
    }

    // Listening on window, not `cloud` itself — the cloud is pointer-events:
    // none (so it never blocks clicking the real text/links it surrounds),
    // which also means it never receives its own mouse events.
    window.addEventListener(
      'mousemove',
      (e) => {
        const rect = cloud.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        for (const item of items) {
          item.tx = nx * 22 * item.depth;
          item.ty = ny * 22 * item.depth;
        }
        if (!raf) raf = requestAnimationFrame(tick);
      },
      { passive: true },
    );
  });
}

export {};
