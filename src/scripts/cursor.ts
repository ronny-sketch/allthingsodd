/*
  The hand-drawn cursor (markup + CSS in components/media/Cursor.astro).
  Rebuilt 2026-09-19 from a mousemove → transform + setInterval src-swap.

  Rules it lives by:
  - The drawn tip is written straight from the last pointer event, never
    smoothed. Everything with lag or spring (lean, press, ember) pivots on
    that tip, so the arrow is exact in every state.
  - Its life comes from the hand, not a timer: the material frame advances
    with distance travelled and freezes when you stop; the body leans with
    horizontal speed; it presses on click; heat warms under it over things
    you can act on. Under prefers-reduced-motion it only tracks and hides.
  - One rAF loop, woken by input, that stops itself once everything has
    settled — nothing runs while the pointer is still (hero-tilt.ts pattern).
  - Native cursors survive where they mean something. NATIVE below is the
    same list global.css excludes from `cursor: none`; keep them in sync.
  - Decided per event, not once at load: a touch pointer hides it and hands
    the native cursor back, the next mouse/pen event brings it back.
*/
const cursorRoot = document.querySelector<HTMLElement>('.cursor');
const cursorArrow = cursorRoot?.querySelector<HTMLElement>('.cursor-arrow');
const cursorEmber = cursorRoot?.querySelector<HTMLElement>('.cursor-ember');
if (cursorRoot && cursorArrow && cursorEmber && 'PointerEvent' in window) {
  run(cursorRoot, cursorArrow, cursorEmber);
}

function run(root: HTMLElement, arrow: HTMLElement, ember: HTMLElement) {
  const frames = Array.from(arrow.querySelectorAll('img'));
  if (!frames.length) return;
  const NATIVE =
    'input, textarea, select, [contenteditable], [role="textbox"], iframe, embed, object, :disabled, [aria-disabled="true"]';
  const ACTION = 'a[href], button, [role="button"], label, summary, .pill';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const docEl = document.documentElement;
  const body = document.body;

  let x = 0; // pointer, viewport px
  let y = 0;
  let pt = 0; // timeStamp of the previous move
  let vx = 0; // smoothed horizontal speed, px/ms
  let travel = 0; // odometer for the flipbook
  let frame = 0;
  let lastFlip = 0;
  let rot = 0; // arrow lean, deg
  let scl = 1; // arrow press
  let ex = 0; // ember offset behind the tip
  let ey = 0;
  let shown = false;
  let native = false;
  let hot = false;
  let down = false;
  let ready = false; // body.cursor-ready
  let raf = 0;
  let last = 0;

  // Device-pixel snapping keeps the bitmap crisp; the offsets are sub-pixel.
  const snap = (v: number) => Math.round(v * devicePixelRatio) / devicePixelRatio;
  // Per-60Hz-frame lerp factor made frame-rate independent.
  const k = (f: number, dt: number) => 1 - (1 - f) ** (dt / 16.7);
  const place = () => {
    root.style.transform = `translate3d(${snap(x)}px,${snap(y)}px,0)`;
  };

  const setDown = (v: boolean) => {
    down = v;
    root.classList.toggle('is-down', v);
  };
  const show = (on: boolean) => {
    if (shown === on) return;
    shown = on;
    root.classList.toggle('is-on', on);
    if (!on) setDown(false);
  };

  function tick(now: number) {
    const dt = Math.min(50, now - last || 16.7);
    last = now;
    place();
    if (now - pt > 40) vx += -vx * k(0.25, dt); // no events arriving: coast to a stop
    const rotT = Math.max(-8, Math.min(8, vx * 6)) + (hot ? -8 : 0);
    const sclT = down ? 0.9 : 1;
    rot += (rotT - rot) * k(0.22, dt);
    scl += (sclT - scl) * k(0.35, dt);
    arrow.style.transform = `rotate(${rot.toFixed(2)}deg) scale(${scl.toFixed(3)})`;
    ex += -ex * k(0.2, dt);
    ey += -ey * k(0.2, dt);
    ember.style.transform = `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px)`;
    const busy =
      Math.abs(rotT - rot) > 0.05 ||
      Math.abs(sclT - scl) > 0.002 ||
      Math.abs(ex) + Math.abs(ey) > 0.3 ||
      Math.abs(vx) > 0.02;
    raf = busy ? requestAnimationFrame(tick) : 0;
  }
  const wake = () => {
    if (raf || reduce) return; // reduced motion: track and hide only, nothing settles
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  function onPointer(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      if (ready) body.classList.remove('cursor-ready');
      ready = false;
      show(false);
      return;
    }
    if (!ready) body.classList.add('cursor-ready');
    ready = true;
    if (e.type === 'pointerover') {
      const t = e.target as Element | null;
      native = !!t?.closest?.(NATIVE);
      hot = !native && !!t?.closest?.(ACTION);
      root.classList.toggle('is-hot', hot);
    }
    const dx = shown ? e.clientX - x : 0;
    const dy = shown ? e.clientY - y : 0;
    x = e.clientX;
    y = e.clientY;
    // Beyond the document box means the browser's own scrollbar, which
    // cursor:none can't reach — let the native cursor own it.
    if (native || x >= docEl.clientWidth || y >= docEl.clientHeight) {
      show(false);
      return;
    }
    if (reduce) {
      place();
      show(true);
      return;
    }
    const dt = e.timeStamp - pt;
    if (dt > 0 && dt < 100) vx += (dx / dt - vx) * k(0.3, dt);
    pt = e.timeStamp;
    ex = Math.max(-24, Math.min(24, ex - dx));
    ey = Math.max(-24, Math.min(24, ey - dy));
    travel += Math.hypot(dx, dy);
    if (travel >= 28 && e.timeStamp - lastFlip >= 60) {
      travel = 0;
      lastFlip = e.timeStamp;
      frames[frame].classList.remove('on');
      frame = (frame + 1) % frames.length;
      frames[frame].classList.add('on');
    }
    if (!shown) place(); // land before fading in, never slide from the old spot
    show(true);
    wake();
  }

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerover', onPointer, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.button === 0 && e.pointerType !== 'touch' && shown) {
      setDown(true);
      wake();
    }
  });
  const release = () => {
    setDown(false);
    wake();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  // Left the window (or moved onto the scrollbar): relatedTarget is null.
  window.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) show(false);
  });
  const hide = () => show(false);
  window.addEventListener('blur', hide);
  window.addEventListener('dragstart', hide); // the native drag ghost takes over
  window.addEventListener('pageshow', hide); // bfcache restore: stale position
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
  });
}

export {};
