// Hero mosaic: Ken Burns pan/zoom per cell, plus photos that self-swap on a
// randomized, staggered schedule (one shared timer moving through a shuffled cell
// order, not 20 independent timers landing on top of each other).
const mosaic = document.getElementById('heroMosaic');
if (mosaic) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pool: string[] = JSON.parse(mosaic.dataset.pool ?? '[]');
  const cells = Array.from(mosaic.querySelectorAll<HTMLElement>('.mosaic-cell'));

  function randomKenBurns(img: HTMLImageElement) {
    const kd = `${(12 + Math.random() * 9).toFixed(0)}s`;
    const kox = `${(15 + Math.random() * 70).toFixed(0)}%`;
    const koy = `${(15 + Math.random() * 70).toFixed(0)}%`;
    const kx = `${((Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 3)).toFixed(1)}%`;
    const ky = `${((Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2)).toFixed(1)}%`;
    img.style.setProperty('--kd', kd);
    img.style.setProperty('--kox', kox);
    img.style.setProperty('--koy', koy);
    img.style.setProperty('--kx', kx);
    img.style.setProperty('--ky', ky);
  }

  cells.forEach((cell, i) => {
    cell.style.setProperty('--ex', `${((Math.random() - 0.5) * 60).toFixed(0)}px`);
    cell.style.setProperty('--ey', `${((Math.random() - 0.5) * 60).toFixed(0)}px`);
    cell.style.setProperty('--er', `${((Math.random() - 0.5) * 10).toFixed(1)}deg`);
    cell.style.animationDelay = `${(i * 0.03).toFixed(2)}s`;
    const img = cell.querySelector('img');
    if (img) randomKenBurns(img);
  });

  if (!reduceMotion && pool.length) {
    // Source of truth for "what's showing (or about to show) in each cell" — reserved
    // the instant a swap is decided, not scanned from the DOM, so two swaps landing
    // back to back can never both grab the same photo.
    //
    // getAttribute('src'), not the .src IDL property — a real bug caught by
    // an actual duplicate-detection test, not assumed: .src always returns
    // the browser-resolved ABSOLUTE URL (e.g. "http://host/_astro/x.webp"),
    // but `pool` (parsed from the data-pool JSON attribute) holds the
    // root-relative form Astro wrote into the HTML (e.g. "/_astro/x.webp").
    // Comparing those two formats in swap()'s `pool.filter((u) =>
    // !assigned.includes(u))` never matched, so every cell's initial image
    // was invisible to the "already showing" check until that exact cell
    // had itself been swapped at least once — letting the same photo get
    // assigned to two cells at once. getAttribute('src') returns the
    // literal, unresolved attribute value, matching `pool`'s format exactly.
    const assigned = cells.map((cell) => cell.querySelector('img')?.getAttribute('src') ?? '');

    function swap(cellIndex: number) {
      const cell = cells[cellIndex];
      const oldImg = cell.querySelector('img');
      let candidates = pool.filter((u) => !assigned.includes(u));
      if (!candidates.length) candidates = pool;
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      assigned[cellIndex] = next;

      const newImg = document.createElement('img');
      newImg.alt = '';
      // NOT loading="lazy" — a real bug caught by an actual instrumented
      // reproduction, not assumed: this element is created detached (not
      // yet in the DOM) and immediately decode()'d below; lazy-loading's
      // viewport-proximity check doesn't apply to a detached node, so
      // Chrome/Firefox/WebKit can leave its fetch (and so its decode()
      // promise) stalled indefinitely. When that happened, `assigned[]`
      // above had already moved on (correct in isolation), but reveal()
      // below never ran — the old image stayed visually on screen while
      // the bookkeeping considered its slot filled by something else,
      // eventually freeing the OLD image's own src to be handed to a
      // different cell too. Confirmed by instrumenting swap() and the
      // actual DOM: only a fraction of logged swaps ever produced a
      // corresponding appendChild. This element is swapped in deliberately
      // and immediately — "lazy" was never the right loading mode for it.
      newImg.style.opacity = '0';
      // 1.4s, not the original 2.2s — tuned down alongside the faster swap
      // cadence below (roughly the same crossfade-to-interval ratio as
      // before) so a cell's own fade still reads as smooth/continuous
      // rather than still resolving when its neighbors are already several
      // swaps ahead — see the 2026-08-30 homepage revision's "hero feels
      // alive" brief.
      newImg.style.transition = 'opacity 1.4s ease';
      randomKenBurns(newImg);
      newImg.src = next;

      // Decode fully off the critical path before it ever touches the DOM — assigning
      // .src and painting in the same frame is what read as a "blink": the browser had
      // to decode the full photo synchronously mid-transition.
      const reveal = () => {
        cell.appendChild(newImg);
        requestAnimationFrame(() => {
          newImg.style.opacity = '1';
          if (oldImg) {
            oldImg.style.transition = 'opacity 1.4s ease';
            oldImg.style.opacity = '0';
            setTimeout(() => oldImg.remove(), 1500);
          }
        });
      };
      if (newImg.decode) newImg.decode().then(reveal, reveal);
      else reveal();
    }

    const order = cells.map((_, i) => i);
    for (let s = order.length - 1; s > 0; s--) {
      const j = Math.floor(Math.random() * (s + 1));
      [order[s], order[j]] = [order[j], order[s]];
    }
    let oi = 0;
    let timer: number | null = null;

    // Added 2026-09-02 (mobile experience pass). The swap loop and the 20
    // Ken-Burns keyframe animations used to run forever, whether or not the
    // hero was on screen and whether or not the tab was even visible — on a
    // phone that is a continuous decode-plus-composite cost paid for
    // something nobody is looking at, for the entire time someone reads the
    // rest of the homepage. Both are now suspended whenever the hero is
    // offscreen or the document is hidden, and resumed on return.
    //
    // Deliberately NOT a reduction in what the hero does while it is being
    // looked at: the cadence, the crossfade and the pan are all unchanged.
    // The saving comes from not doing the work at all when it can't be seen.
    let onScreen = true;

    function running() {
      return onScreen && !document.hidden;
    }

    function scheduleTick() {
      timer = null;
      if (!running()) return;
      swap(order[oi % order.length]);
      oi++;
      // 1.6–2.2s between swaps (was 2.6–3.5s) — the hero read as slightly
      // too quiet/slow at the old cadence; see the 2026-08-30 homepage
      // revision brief. The shared-timer/shuffled-order/one-swap-per-tick
      // structure above is unchanged, so the "no two cells ever show the
      // same source image at once" invariant (the `assigned` reservation in
      // swap()) still holds at the faster rate.
      timer = window.setTimeout(scheduleTick, 1600 + Math.random() * 600);
    }

    function sync() {
      const go = running();
      // `.mosaic-is-idle` parks the CSS pan animations and drops their
      // `will-change` hint (see Hero.astro) — a paused animation with
      // will-change still holds its own compositor layer.
      mosaic!.classList.toggle('mosaic-is-idle', !go);
      if (go && timer === null) {
        timer = window.setTimeout(scheduleTick, 1600 + Math.random() * 600);
      } else if (!go && timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => {
          onScreen = entries[0]?.isIntersecting ?? true;
          sync();
        },
        { threshold: 0 },
      ).observe(mosaic);
    }

    timer = window.setTimeout(scheduleTick, 4000);
  }
}

export {};
