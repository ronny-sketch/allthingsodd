// Hero cursor tilt + spotlight — the mosaic leans toward the cursor, the logo drifts
// the opposite way, and a soft radial spotlight follows the pointer.
const hero = document.querySelector<HTMLElement>('.hero');
const mosaic = document.getElementById('heroMosaic');
const spotlight = document.getElementById('heroSpotlight');
const logo = document.getElementById('heroLogo');

if (
  hero &&
  mosaic &&
  spotlight &&
  !window.matchMedia('(hover: none)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
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
