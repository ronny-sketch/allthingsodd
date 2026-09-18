// Renders every brand/deck/*.pptx to JPEG previews for visual QA:
//
//   npm run preview            (from brand/deck/src)
//
// macOS only: it drives Keynote, which renders Forta and Gabarito from the
// installed fonts (install brand/fonts/*.ttf first) and is the closest local
// stand-in for PowerPoint. Two Keynote quirks shape this script:
//   - Keynote is sandboxed, so the file is staged inside its own container;
//   - AppleScript `open` crashes Keynote 14 on a .pptx, so the file is opened
//     with `open -a` and only the export is scripted.
// Output: brand/deck/previews/<deck>/slide-NN.jpg (1600px wide) and a
// contact sheet, brand/deck/previews/<deck>.jpg.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deckDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = join(
  homedir(),
  'Library/Containers/com.apple.iWork.Keynote/Data/tmp/odd-deck-preview',
);
mkdirSync(stage, { recursive: true });
const sleep = (s) => execFileSync('sleep', [String(s)]);

const decks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(deckDir).filter((f) => f.endsWith('.pptx'));

for (const file of decks) {
  const name = basename(file, '.pptx');
  const pptx = join(stage, `${name}.pptx`);
  const pdf = join(stage, `${name}.pdf`);
  copyFileSync(join(deckDir, `${name}.pptx`), pptx);
  rmSync(pdf, { force: true });
  execFileSync('open', ['-a', 'Keynote', pptx]);
  sleep(10);
  execFileSync('osascript', [
    '-e',
    `tell application "Keynote"
       set d to front document
       export d to POSIX file "${pdf}" as PDF
       close d saving no
     end tell`,
  ]);
  const out = join(deckDir, 'previews', name);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  execFileSync('pdftoppm', [
    '-jpeg',
    '-jpegopt',
    'quality=82',
    '-scale-to-x',
    '1600',
    '-scale-to-y',
    '-1',
    pdf,
    join(out, 'slide'),
  ]);
  // Contact sheet: four across, via Python's Pillow (present wherever the
  // brand scripts run).
  execFileSync('python3', [
    '-c',
    `import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/slide-*.jpg')); ims=[Image.open(f) for f in fs]
w,h=400,225; cols=4; rows=(len(ims)+cols-1)//cols; pad=16
sheet=Image.new('RGB',(cols*w+(cols+1)*pad, rows*h+(rows+1)*pad),(60,57,58))
for i,im in enumerate(ims):
    sheet.paste(im.resize((w,h)),(pad+(i%cols)*(w+pad), pad+(i//cols)*(h+pad)))
sheet.save(sys.argv[2], quality=85)`,
    out,
    `${out}.jpg`,
  ]);
  console.log(`brand/deck/previews/${name}/ (${readdirSync(out).length} slides) + ${name}.jpg`);
}
