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
    const assigned = cells.map((cell) => cell.querySelector('img')?.src ?? '');

    function swap(cellIndex: number) {
      const cell = cells[cellIndex];
      const oldImg = cell.querySelector('img');
      let candidates = pool.filter((u) => !assigned.includes(u));
      if (!candidates.length) candidates = pool;
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      assigned[cellIndex] = next;

      const newImg = document.createElement('img');
      newImg.alt = '';
      newImg.loading = 'lazy';
      newImg.style.opacity = '0';
      newImg.style.transition = 'opacity 2.2s ease';
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
            oldImg.style.transition = 'opacity 2.2s ease';
            oldImg.style.opacity = '0';
            setTimeout(() => oldImg.remove(), 2300);
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
    function scheduleTick() {
      swap(order[oi % order.length]);
      oi++;
      setTimeout(scheduleTick, 2600 + Math.random() * 900);
    }
    setTimeout(scheduleTick, 4000);
  }
}

export {};
