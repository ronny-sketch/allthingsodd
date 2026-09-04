// Build-time helper shared by Hero.astro (which renders the mosaic) and
// index.astro (which preloads its first cell). Not a client script despite
// living next to components — it runs only during the build, through
// astro:assets.
//
// It exists so the two cannot drift: a preload that names a different file
// from the one `srcset` will actually choose is not a head start, it is a
// second download. Before this, index.astro re-derived "the first hero
// image at width 500" by hand and the two happened to agree.
import { getImage } from 'astro:assets';

/** The mosaic is a grid of small cells, not a full-bleed photograph: five
 *  columns above 820px, three below (see Hero.astro's media queries), so a
 *  cell is ~20vw on desktop and ~34vw on a phone. */
export const MOSAIC_SIZES = '(max-width: 820px) 34vw, 20vw';

/** 500 stays in the set and is the plain `src`, so a browser that ignores
 *  srcset renders exactly what it rendered before. The smaller steps are
 *  what stop a 130px phone cell being handed a desktop-sized file, twenty
 *  times over. 640 is the top step because that is the widest these archive
 *  sources actually are — asking for more silently returns a 640px file,
 *  which is why the descriptors below are read back off the generated image
 *  rather than echoing what was requested. A srcset descriptor that
 *  overstates a file's width is worse than no srcset: the browser picks it
 *  believing it has more pixels than it does. */
const MOSAIC_WIDTHS = [220, 320, 440, 500, 640];

export interface MosaicImage {
  src: string;
  srcset: string;
  width: number | string | undefined;
  height: number | string | undefined;
}

export async function mosaicImage(src: ImageMetadata): Promise<MosaicImage> {
  const variants = await Promise.all(
    MOSAIC_WIDTHS.map(async (width) => {
      const image = await getImage({ src, width, format: 'webp' });
      return { requested: width, actual: Number(image.attributes.width) || width, image };
    }),
  );
  const fallback = variants.find((v) => v.requested === 500)!.image;
  // Deduplicated on the real width: two requested steps can clamp to the
  // same file when a source is narrower than either of them, and a srcset
  // listing the same URL twice is a parse error's worth of noise.
  const seen = new Set<number>();
  const srcset = variants
    .filter((v) => !seen.has(v.actual) && seen.add(v.actual) !== undefined)
    .map((v) => `${v.image.src} ${v.actual}w`)
    .join(', ');
  return {
    src: fallback.src,
    srcset,
    width: fallback.attributes.width,
    height: fallback.attributes.height,
  };
}
