// Every photograph a page shows must have an entry in photo-credits.json.
//
// The footer names the photographers behind a page's photos
// (src/components/sections/photo-credits.ts). A photo with no entry is not
// an error at render time — it just goes uncredited, silently, which is
// exactly how the site ran until 2026-09-25. So adding a photo now means
// deciding who took it: a name, or `null` for ODDspace's own house photos,
// supplied portraits and film frames the archive names nobody for.
//
// Scans what the site can render: content JSON, images imported by pages and
// section components, and the hero mosaic folder. Logos, partner marks, the
// cursor and the brand book are not photographs of anyone's.
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const credits = JSON.parse(readFileSync('src/components/sections/photo-credits.json', 'utf8'));
const IMG =
  /assets\/((?!logos\/|partners\/|press\/|cursor\/|fonts\/)[^'"\s]+\.(?:jpe?g|png|webp|avif))/gi;

const files = (dir, ext) =>
  readdirSync(dir, { recursive: true })
    .map((f) => join(dir, f))
    .filter((f) => ext.some((e) => f.endsWith(e)));

const used = new Map();
const scan = (file) => {
  // In .astro files only real imports count — a path in a comment explaining
  // why a photo was removed is not a photo on the page.
  const text = readFileSync(file, 'utf8');
  const src = file.endsWith('.astro')
    ? text
        .split('\n')
        .filter((l) => /^import\s.+\sfrom\s/.test(l))
        .join('\n')
    : text;
  for (const [, path] of src.matchAll(IMG)) {
    used.set(basename(path, extname(path)), `${file} → assets/${path}`);
  }
};
[
  ...files('src/content', ['.json']),
  ...files('src/pages', ['.astro']),
  ...files('src/components/sections', ['.astro']),
].forEach(scan);
for (const f of readdirSync('src/assets/mosaic'))
  used.set(basename(f, extname(f)), `src/assets/mosaic/${f}`);

const missing = [...used].filter(([name]) => !(name in credits));
if (missing.length) {
  console.error(`check:credits — ${missing.length} photo(s) with no entry in photo-credits.json:`);
  for (const [, where] of missing) console.error(`  ${where}`);
  console.error('Add the photographer, or null if the archive names nobody.');
  process.exit(1);
}
console.log(`check:credits — ${used.size} photos, every one has a credit entry.`);
