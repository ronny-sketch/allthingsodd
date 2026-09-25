// Who took each photograph on the site. The names live in photo-credits.json,
// keyed by the asset's file name without its extension — every file name in
// src/assets is unique, and the built URL keeps it (/_astro/<name>.<hash>.webp),
// so a rendered image can be traced back without threading credits through
// every component. `null` means checked and deliberately unnamed: ODDspace's
// own house and phone photos, speakers' supplied portraits, frames from a
// film, floor plans. `npm run check:credits` fails when a page uses a photo
// that has no entry at all.
//
// Sources (2026-09-25): the photographer in each Flickr title or tag on
// flickr.com/photos/oddfest (2025) and flickr.com/photos/204686183@N06
// (2026); the ODDspace opening is Remu Shemeikka's "ODDSpace Avajaiset"
// Drive folder; ODDstudio is Erica Dahlström Dezonne's shoot. basti.visuals
// is Sebastian Hiemann (his own file names in the 2025 upload).
import CREDITS from './photo-credits.json';

const credits = CREDITS as Record<string, string | null>;

const nameOf = (src: string) => src.split('/').pop()!.split('?')[0].split('.')[0];

/** Every photographer behind the images found anywhere in `sources` (content
 *  entries, image imports, arrays of either), deduplicated, alphabetical. */
export function photographers(...sources: unknown[]): string[] {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if (typeof o.src === 'string' && typeof o.width === 'number') {
      const who = credits[nameOf(o.src)];
      if (who) found.add(who);
      return;
    }
    Object.values(o).forEach(walk);
  };
  sources.forEach(walk);
  const key = (n: string) => n.replace(/^@/, '');
  return [...found].sort((a, b) => key(a).localeCompare(key(b), 'fi', { sensitivity: 'base' }));
}
