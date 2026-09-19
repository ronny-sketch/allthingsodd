# brand/social/

ODD's social system: twenty post formats, the story and carousel shapes, the
highlight covers, and an idea bank of fifty-four things worth posting.

- **`IDEAS.md`** — the idea bank. Start here when planning a month.
- **`examples/`** — every format, rendered at real size from real ODD material.
- **`src/`** — the generator. `posts.mjs` is the content, `build.mjs` the layout.

Everything is built from `brand/tokens/odd.css` and `brand/fonts/`, so a post
cannot drift from the website: same grounds, same five type roles, same pill,
same hairlines.

## Rebuild

```bash
npm ci                      # once, at the repo root (Playwright)
cd brand/social/src && node build.mjs
```

Out: `examples/post-NN.jpg` (1080×1350), `story-N.jpg` (1080×1920),
`carousel-N.jpg`, `highlight-N.jpg` (1080×1080). To add a post, add an entry to
`posts.mjs` — layout classes live in `build.mjs`'s stylesheet.

## The rules

**The canvas.** Posts are 4:5 (1080×1350). The profile grid shows only the
**centre square**, so the statement lives inside 135–1215px and the meta line
below it, where only the feed sees it. Stories are 9:16 with a 320px safe inset.

**The grid is one composition.** Plan twelve at a time. Ink is the ground; Paper
lands on a diagonal (tiles 3, 5, 10), never as a column and never two side by
side. Roughly half the tiles are photographs.

**Type.** The five roles, scaled for a 1080px canvas: Hero 104, Display 72,
Heading 46, Body 34, Small 26. Nothing else. Forta never sets a paragraph.

**Accents.** One per tile, as a label or a keyline. Ember and Signal share a
tile only on the two-sides format, and creative comes first.

**Photographs.** Real ODD moments, from the archive. A scrim goes under any type
that sits on an image. No stock, no generated crowds, no renders.

**Two hard rules, both about people:**

1. **Never put a name on a face the source does not name.** Crowd photographs
   caption the night. Only a portrait given to us as that person's portrait
   carries their name (`post-19`).
2. **Credit the photographer.** The archive's terms are editorial use with
   "ODDfest / photographer's name". The examples say "Photo: ODDfest" because
   this generator does not know who shot which frame — replace it before
   posting. Get the names from the photobank.

**Facts.** Numbers, dates, prices and names come from the site's content files
or the ticket backend. The 274 figure in `post-01` and `post-16` is computed
from the credits list in the generator, not typed — a hand-typed count was wrong
once. If something is undecided, say so.

## Where the material came from

- Photographs: the ODDfest photobank on Flickr (2026 editions, Creative Week,
  ODDference) and `src/assets/`.
- Names: `src/content/pages/oddfest.json` (programme) and `oddfest-2026.json`
  (the 274 credits).
- Copy: the site, verbatim or trimmed. Nothing here was invented.

## What this borrowed from elsewhere

Festival identities that work like ODD's — Horst Arts & Music is the clearest —
do four things this system copies deliberately: photographers are credited by
name on every image; the platforms are equal pillars rather than a hierarchy;
editorial storytelling is a recurring series, not an afterthought; and the open
call is permanent content rather than an interruption. The look is ODD's own.
