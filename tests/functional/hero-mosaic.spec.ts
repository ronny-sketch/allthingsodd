import { test, expect } from '@playwright/test';

// Hero mosaic invariants — see src/scripts/mosaic.ts and the 2026-08-30
// homepage revision brief ("no two cells can ever show the same source image
// at once", plus a faster, still-reduced-motion-safe swap cadence).

test('hero mosaic never shows two cells with the same source image at once', async ({ page }) => {
  await page.goto('/');
  const cellImages = page.locator('.mosaic-cell img');
  await expect(cellImages.first()).toBeVisible();

  async function currentSrcs(): Promise<string[]> {
    return page.locator('.mosaic-cell').evaluateAll((cells) =>
      cells.map((cell) => {
        // A cell mid-crossfade briefly holds two <img>s (old fading out,
        // new fading in) — the *last* one is always the most recently
        // assigned/reserved image, matching mosaic.ts's own `assigned[]`
        // bookkeeping, which is what the uniqueness guarantee is actually
        // about.
        const imgs = cell.querySelectorAll('img');
        const last = imgs[imgs.length - 1] as HTMLImageElement | undefined;
        return last?.getAttribute('src') ?? '';
      }),
    );
  }

  // Poll across several real swap cycles (swaps start 2.5s in, then every
  // ~0.55-0.85s — see mosaic.ts) rather than a single snapshot, so this
  // actually exercises the ongoing self-swap loop, not just the initial
  // fly-in state.
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(2000);
    const srcs = (await currentSrcs()).filter(Boolean);
    const unique = new Set(srcs);
    expect(unique.size, `duplicate source image(s) across mosaic cells: ${srcs.join(', ')}`).toBe(
      srcs.length,
    );
  }
});

// Swapped-in photos are created by mosaic.ts, so Hero.astro's scoped `img`
// rules never reached them: every one rendered at its intrinsic size from the
// cell's top-left corner, uncropped and unpanned (fixed 2026-09-24 with
// :global(img)). This checks the photos that arrived by swap, not the twenty
// server-rendered ones, which were always fine.
test('hero mosaic: swapped-in photos are cover-fit and keep their crop point', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mosaic-cell img').first()).toBeVisible();
  await page.waitForTimeout(7000); // first swap at 2.5s, then one every ~0.7s
  // Server-rendered cells carry loading="eager"; mosaic.ts sets no loading.
  const swapped = await page.locator('.mosaic-cell img:not([loading])').evaluateAll((imgs) =>
    imgs.map((img) => {
      const cs = getComputedStyle(img);
      return {
        fit: cs.objectFit,
        position: cs.position,
        crop: (img as HTMLElement).style.objectPosition,
      };
    }),
  );
  expect(swapped.length, 'no photo had been swapped in after 7s').toBeGreaterThan(0);
  for (const s of swapped) {
    expect(s.fit).toBe('cover');
    expect(s.position).toBe('absolute');
    expect(s.crop, 'swapped photo lost its mosaic-focus.ts crop point').not.toBe('');
  }
});

test('reduced motion: hero mosaic renders statically and never self-swaps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const cellImages = page.locator('.mosaic-cell img');
  await expect(cellImages.first()).toBeVisible();

  const before = await cellImages.evaluateAll((imgs) =>
    imgs.map((img) => (img as HTMLImageElement).src),
  );
  // Long enough to span several would-be swap ticks under normal motion.
  await page.waitForTimeout(7000);
  const after = await cellImages.evaluateAll((imgs) =>
    imgs.map((img) => (img as HTMLImageElement).src),
  );
  expect(after, 'mosaic cells changed under prefers-reduced-motion: reduce').toEqual(before);
});
