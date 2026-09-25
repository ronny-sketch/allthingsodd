// Hero mosaic: Ken Burns pan/zoom per cell, plus photos that self-swap on a
// randomized, staggered schedule (one shared timer moving through a shuffled cell
// order, not 20 independent timers landing on top of each other).
const mosaic = document.getElementById('heroMosaic');
if (mosaic) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Each pool entry carries the same responsive set the rendered cells use
  // (src + srcset + intrinsic width/height), not a bare URL — see
  // Hero.astro's `pool` for why, and what it cost when it was one 500px file.
  interface PoolImage {
    src: string;
    srcset: string;
    width?: number | string;
    height?: number | string;
    /** CSS object-position that keeps the subject in frame (mosaic-focus.ts). */
    position?: string;
  }
  const pool: PoolImage[] = JSON.parse(mosaic.dataset.pool ?? '[]');
  // The `sizes` the cells are laid out with, kept on the element so the
  // browser picks from `srcset` the same way it does for the initial images.
  const MOSAIC_SIZES = mosaic.dataset.sizes ?? '';
  const cells = Array.from(mosaic.querySelectorAll<HTMLElement>('.mosaic-cell'));

  function shuffled<T>(items: T[]): T[] {
    const out = items.slice();
    for (let s = out.length - 1; s > 0; s--) {
      const j = Math.floor(Math.random() * (s + 1));
      [out[s], out[j]] = [out[j], out[s]];
    }
    return out;
  }

  // The zoom origin sits within 10% of the photo's focus point (its
  // object-position), so the pan closes in on the subject instead of
  // drifting a face out of a small cell. No focus: anywhere in the middle 70%.
  function origin(focus: string | undefined, axis: 0 | 1) {
    const f = Number.parseFloat(focus?.split(' ')[axis] ?? '');
    if (Number.isNaN(f)) return 15 + Math.random() * 70;
    return Math.min(100, Math.max(0, f - 10 + Math.random() * 20));
  }

  // How far the pan may drift (as a % translate, the unit ken-burns uses)
  // without uncovering an edge of the cell. The 1.16 zoom only grows the
  // photo past an edge in proportion to how far the origin is from it, so an
  // origin near the top (a face near the top of a photo) leaves almost no
  // room to drift down. An unbounded drift showed a strip of the empty cell
  // there. 1.16 is the ken-burns keyframe's scale in Hero.astro.
  function pan(originPct: number, max: number) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const room = (0.16 / 1.16) * (dir > 0 ? originPct : 100 - originPct);
    return `${(dir * Math.min(max, room) * (0.3 + 0.7 * Math.random())).toFixed(1)}%`;
  }

  function randomKenBurns(img: HTMLImageElement) {
    const kd = `${(12 + Math.random() * 9).toFixed(0)}s`;
    const ox = Math.round(origin(img.style.objectPosition, 0));
    const oy = Math.round(origin(img.style.objectPosition, 1));
    img.style.setProperty('--kd', kd);
    img.style.setProperty('--kox', `${ox}%`);
    img.style.setProperty('--koy', `${oy}%`);
    img.style.setProperty('--kx', pan(ox, 4));
    img.style.setProperty('--ky', pan(oy, 3));
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

    // A shuffled deck, not a random pick per swap (2026-09-24). Picking at
    // random let a few photos come round again and again while others never
    // showed; the deck deals every photo once, in a fresh random order each
    // visit, before any repeats. The first deal leaves out the twenty already
    // on screen, so the photos a visitor has not seen come first.
    let deck = shuffled(pool.filter((p) => !assigned.includes(p.src)));

    function draw(): PoolImage {
      for (let attempt = 0; attempt < 2; attempt++) {
        const i = deck.findIndex((p) => !assigned.includes(p.src));
        if (i !== -1) return deck.splice(i, 1)[0];
        deck = shuffled(pool);
      }
      // Only reachable with a pool no bigger than the grid.
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function swap(cellIndex: number) {
      const cell = cells[cellIndex];
      const oldImg = cell.querySelector('img');
      const next = draw();
      assigned[cellIndex] = next.src;

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
      // 1s (was 1.4s, originally 2.2s), shortened with the faster cadence
      // below so each change lands as a change rather than a slow dissolve.
      // A cell is only revisited every twenty swaps (~14s), far longer than
      // its own fade, so fades never overlap within one cell.
      newImg.style.transition = 'opacity 1s ease';
      if (next.position) newImg.style.objectPosition = next.position;
      randomKenBurns(newImg);
      // srcset + sizes, not just src. Without them this element loaded the
      // widest pool file into a cell a fraction of its size, and its larger
      // intrinsic size made every swap a fresh, later LCP candidate.
      if (next.srcset) newImg.srcset = next.srcset;
      if (MOSAIC_SIZES) newImg.sizes = MOSAIC_SIZES;
      if (next.width) newImg.width = Number(next.width);
      if (next.height) newImg.height = Number(next.height);
      newImg.src = next.src;

      // Decode fully off the critical path before it ever touches the DOM — assigning
      // .src and painting in the same frame is what read as a "blink": the browser had
      // to decode the full photo synchronously mid-transition.
      const reveal = () => {
        cell.appendChild(newImg);
        requestAnimationFrame(() => {
          newImg.style.opacity = '1';
          if (oldImg) {
            oldImg.style.transition = 'opacity 1s ease';
            oldImg.style.opacity = '0';
            setTimeout(() => oldImg.remove(), 1100);
          }
        });
      };
      // A photo that fails to load is skipped, not revealed (2026-09-25).
      // Revealing on rejection too faded a broken image in over a good one,
      // so a flaky connection left empty cells behind. The cell keeps its
      // photo and gives its slot back; the next tick tries another cell.
      const skip = () => {
        assigned[cellIndex] = oldImg?.getAttribute('src') ?? '';
      };
      if (newImg.decode) newImg.decode().then(reveal, skip);
      else reveal();
    }

    const order = shuffled(cells.map((_, i) => i));
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

    // 0.55–0.85s between swaps (2026-09-24; was 1.6–2.2s, originally
    // 2.6–3.5s). With 73 photos and 20 cells, the old pace needed well over
    // a minute to show the other 53, so most visitors never saw the range of
    // the archive. At this pace every photo has appeared within ~40s. Still
    // one swap per tick through a shuffled cell order, so the `assigned`
    // reservation in swap() keeps any photo from showing in two cells.
    const gap = () => 550 + Math.random() * 300;

    function scheduleTick() {
      timer = null;
      if (!running()) return;
      swap(order[oi % order.length]);
      oi++;
      timer = window.setTimeout(scheduleTick, gap());
    }

    function sync() {
      const go = running();
      // `.mosaic-is-idle` parks the CSS pan animations and drops their
      // `will-change` hint (see Hero.astro) — a paused animation with
      // will-change still holds its own compositor layer.
      mosaic!.classList.toggle('mosaic-is-idle', !go);
      if (go && timer === null) {
        timer = window.setTimeout(scheduleTick, gap());
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

    // First swap once the fly-in (~1.5s with its stagger) has settled.
    timer = window.setTimeout(scheduleTick, 2500);
  }
}

export {};
