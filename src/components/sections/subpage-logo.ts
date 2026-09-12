// The product mark for a subpage rail/ticker, and the one asset width both of
// them request.
//
// Shared for two reasons, the first measured:
//
//  1. getImage() keys its emitted asset on (src, width, ...). While SubpageRail
//     and SubpageTicker each derived their own request width from their own
//     LOGO_THICK, one page ended up referencing the same wordmark under two
//     different hashed URLs and dist/_astro accumulated five byte-identical
//     copies of each SVG — /oddfest pulling 4.9KB of wordmark twice, /oddspace
//     8KB twice, for no rendered difference. One shared width collapses every
//     request onto a single asset.
//  2. The two components are twins by design (see SubpageTicker's header).
//     Anything that has to agree between them belongs here rather than being
//     duplicated into both frontmatters, where it can silently drift.
//
// 360px is comfortably above 3x the longest mark either component renders
// (ODDference at 116px in the rail), so the PNG still downscales with retina
// headroom; for the three SVGs a width is a no-op on the emitted bytes.
import type { ImageMetadata } from 'astro';
import oddfestWordmark from '../../assets/logos/oddfest-wordmark.svg';
import oddferenceMark from '../../assets/logos/oddference-mark.png';
import oddspaceWordmark from '../../assets/logos/oddspace-wordmark.svg';
import oddMark from '../../assets/logos/odd-mark.svg';

export type SubpageSlug = 'oddfest' | 'oddference' | 'oddagency' | 'oddspace' | 'oddstudio';

export const LOGO_ASSET_WIDTH = 360;

export function logoFor(slug: SubpageSlug): ImageMetadata {
  if (slug === 'oddfest') return oddfestWordmark;
  if (slug === 'oddference') return oddferenceMark;
  if (slug === 'oddspace') return oddspaceWordmark;
  // oddagency dropped SubpageFrame entirely and oddstudio's rail data carries
  // no logo beat, so this fallback renders nowhere today — it exists so a new
  // subpage can't crash for want of a mark.
  return oddMark;
}
