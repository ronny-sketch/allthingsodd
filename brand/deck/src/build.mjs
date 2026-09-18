// Builds both decks:
//
//   npm run build     (from brand/deck/src)
//
//   ../all-things-odd-template.pptx   21 archetypes, with notes on each
//   ../all-things-odd-example.pptx    a 12-slide deck made only of those
//
// Photographs come from images/, cut to size by prepare-images.py; the fonts
// (Forta, Gabarito) must be installed locally for anything to render — see
// brand/fonts. Then `npm run preview` for JPEGs of every slide.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pptxgen from 'pptxgenjs';

import { defineMasters } from './odd.mjs';
import { exampleDeck } from './example.mjs';
import { templateDeck } from './template.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function build(fileName, title, subject, fill) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5in
  pres.author = 'New Nordic Way rf';
  pres.company = 'ODD — allthingsodd.co';
  pres.title = title;
  pres.subject = subject;
  defineMasters(pres);
  fill(pres);
  await pres.writeFile({ fileName: join(OUT, fileName) });
  console.log(`brand/deck/${fileName}`);
}

await build(
  'all-things-odd-template.pptx',
  'All Things ODD — presentation template',
  'The ODD slide system: 21 archetypes on five masters.',
  templateDeck,
);
await build(
  'all-things-odd-example.pptx',
  'All Things ODD',
  'What ODD is, in twelve slides.',
  exampleDeck,
);
