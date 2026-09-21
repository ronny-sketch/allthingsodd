// Every social card in public/og must really be 1200x630.
//
// src/layouts/Layout.astro writes `og:image:width` 1200 and
// `og:image:height` 630 as literals for whichever image a page names. That
// is correct for every file there today and becomes a lie the moment someone
// adds one of another size — and a lie in exactly the place nobody looks,
// since the card still renders, just cropped or letterboxed by whichever
// platform believed the numbers.
//
// So the literal is allowed to stay a literal, and this makes it true. Run by
// `npm run quality`, same as the identity, brand-token and served-extension
// scans: a build-time assertion about something no test in a browser can see.
//
// Dimensions are read from the file header directly rather than by shelling
// out to `sips` (macOS-only, and CI is Linux) or adding an image dependency
// for four numbers.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/og';
const WANT = { width: 1200, height: 630 };

/** JPEG: walk the segment chain to SOFn, which carries the real dimensions.
 *  Not the EXIF thumbnail's, which is why this does not just scan for the
 *  first plausible pair of numbers. */
function jpegSize(buf) {
  if (buf.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 — every real frame
    // header. 0xC4 (DHT), 0xC8 (JPG) and 0xCC (DAC) are not frames.
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const length = buf.readUInt16BE(i + 2);
    if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + length;
  }
  return null;
}

/** PNG: IHDR is always the first chunk, at a fixed offset. */
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

let files;
try {
  files = readdirSync(DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
} catch {
  console.error(`check-og-images: ${DIR} is missing. Layout.astro's default card lives there.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`check-og-images: no images in ${DIR}.`);
  process.exit(1);
}

const problems = [];
for (const file of files) {
  const path = join(DIR, file);
  const buf = readFileSync(path);
  const size = /\.png$/i.test(file) ? pngSize(buf) : jpegSize(buf);
  if (!size) {
    problems.push(`${path}: could not read its dimensions — is it a valid JPEG/PNG?`);
    continue;
  }
  if (size.width !== WANT.width || size.height !== WANT.height) {
    problems.push(
      `${path}: ${size.width}x${size.height}, but Layout.astro publishes ` +
        `og:image:width ${WANT.width} / og:image:height ${WANT.height} for it. ` +
        `Either resize the image, or stop hardcoding those two values.`,
    );
  }
  // A 1200x630 card that weighs more than a megabyte is a different problem,
  // and worth saying out loud while the file is already open.
  const kb = Math.round(statSync(path).size / 1024);
  if (kb > 400) problems.push(`${path}: ${kb}KB for a social card — compress it.`);
}

if (problems.length) {
  console.error('check-og-images failed:\n' + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-og-images: ${files.length} social cards, all ${WANT.width}x${WANT.height}.`);
