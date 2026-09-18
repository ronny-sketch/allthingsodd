# brand/

The All Things ODD brand system: the files everything else is made from.

The designed, illustrated version of all of this is the brand book at
**`/brand-book/`** (`src/pages/brand-book.astro`). Start there if you are a
designer. Start with **`BRAND-GUIDE.md`** if you are about to make something —
or if you are an AI agent.

```
brand/
├── README.md            this file
├── BRAND-GUIDE.md       how to make a page, campaign, sub-brand, deck, poster
├── AUDIT.md             what the 2026-09-18 audit found in the live site
├── CHANGELOG.md         what was standardised, and why
├── tokens/
│   └── brand-tokens.json  every value, machine-readable
├── logos/
│   ├── build.py         generates every lockup from the mark + Forta
│   ├── rasterize.mjs    PNG exports of everything in svg/
│   ├── svg/             the canonical artwork
│   └── png/             480px-tall exports, transparent
├── fonts/               Forta + Gabarito (SIL OFL 1.1), with licences
└── deck/
    ├── all-things-odd-template.pptx   21 slide archetypes
    ├── all-things-odd-example.pptx    a 12-slide example deck
    ├── previews/        JPEGs of every slide, for review
    └── src/             the generator (isolated from the website)
```

## Which file do I want?

| I need                                      | Take                                  |
| ------------------------------------------- | ------------------------------------- |
| The ODD mark for a dark background          | `logos/svg/odd-mark-paper.svg`        |
| The ODD mark for a light background         | `logos/svg/odd-mark-ink.svg`          |
| An ODDfest / ODDference / ODDspace lockup   | `logos/svg/<product>-{paper,ink}.svg` |
| A logo for Office, Keynote or a social tool | the matching file in `logos/png/`     |
| The app icon / favicon                      | `logos/svg/odd-icon.svg`              |
| Fonts to install                            | everything in `fonts/`                |
| A deck to start from                        | `deck/all-things-odd-template.pptx`   |
| The colours and sizes, as data              | `tokens/brand-tokens.json`            |
| The rules                                   | `BRAND-GUIDE.md`, or `/brand-book/`   |

Paper artwork goes on Ink grounds and photographs; Ink artwork goes on Paper.
Clear space is half the mark's height on every side. Minimum size: 12px for the
mark, 16px for a lockup.

## Regenerating

```bash
python3 brand/logos/build.py      # every SVG, plus the website's own copies
node brand/logos/rasterize.mjs    # the PNGs (uses the site's Playwright)
cd brand/deck/src && npm install && npm run build && npm run preview
```

`build.py` also writes `src/assets/logos/*.svg` and `public/favicon.svg`, so the
website and this folder can never hold different artwork. **Do not edit those
files by hand.** To add a product, add one line to `LOCKUPS` in `build.py` and
run it — the construction does the rest.

## Rules that own themselves

- `src/styles/tokens.css` and `src/styles/typography.css` are canonical for the
  web. `tokens/brand-tokens.json` mirrors them for everything else, and
  `npm run check:brand` (part of `npm run quality` and CI) fails the build if
  the two disagree.
- The deck generator lives in `deck/src/` with its own `package.json`. The
  website must never import it, and it must never import the website.
- The fonts are SIL Open Font Licence 1.1. Redistribute them with their licence
  files, never sell them, never rename the families.
- Photographs belong to ODD and its photographers. Credit them:
  "ODDfest / photographer's name".
