// What the two Canva exporters share (social/src/canva.mjs, deck/src/canva.mjs): the page a
// PDF is printed from, in the fonts the ODD Brand Kit holds, and the page-box crop.
//
// Fonts (tested 12 Oct 2026): Canva's PDF import matches an embedded font to the Brand Kit by
// the font file's own name. The Brand Kit's Forta is Forta 2.0 (internal name "Forta"; the OFL
// Forta 1 the site and the Slides decks use says "FORTA" and lands elsewhere). Forta 2.0 is under
// a commercial EULA, so it stays out of the repository: the exporters take its path.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = resolve(dirname(fileURLToPath(import.meta.url)), '../../fonts');

// One <section> a page, w × h px. Without Forta 2.0 the PDF falls back to another face, which
// Canva can't match to the Brand Kit: stop there instead.
export function pdfDoc(forta, w, h, body) {
  if (!existsSync(forta))
    throw new Error(
      `canva: Forta 2.0 not found at ${forta}. Ask Ronny for Forta-2.0.ttf (licensed, never in this repository) and pass --forta=<path>`,
    );
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Forta'; src: url('file://${forta}') }
@font-face { font-family: 'Gabarito'; src: url('file://${FONTS}/Gabarito-Regular.ttf'); font-weight: 400 }
@font-face { font-family: 'Gabarito'; src: url('file://${FONTS}/Gabarito-SemiBold.ttf'); font-weight: 600 }
@page { size: ${w}px ${h}px; margin: 0 }
html, body { margin: 0 }
/* No kerning: kerned glyphs with negative tracking read to Canva as word gaps ("1 ,000 +"). */
body { font-kerning: none }
section { position: relative; width: ${w}px; height: ${h}px; overflow: hidden; break-after: page }
</style></head><body>${body}</body></html>`;
}

// Chrome sizes a PDF page in 1/75-inch steps, so 1350px comes out 1350.72 and Canva makes the
// design 1351 tall. Crop the page box to the exact size, from the bottom (pages are laid out from
// the top), padded to its old length so the file's byte offsets still hold.
export function crop(file, w, h) {
  const s = readFileSync(file, 'latin1').replace(
    /\/MediaBox \[0 0 [\d.]+ ([\d.]+)\]/g,
    (box, H) => {
      const fit = `/MediaBox [0 ${+(H - h * 0.75).toFixed(2)} ${w * 0.75} ${+(+H).toFixed(2)}]`;
      if (fit.length > box.length) throw new Error(`canva: can't crop ${box}`);
      return fit.padEnd(box.length);
    },
  );
  writeFileSync(file, s, 'latin1');
}
