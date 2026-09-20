# brand/social/

ODD on Instagram: the signature, thirty-seven post formats, five stories, a
carousel, two reel covers, the highlight covers, one planned edition of the
profile, and an idea bank of a hundred and four things worth posting.

- **`IDEAS.md`** — the idea bank. Start here when planning a month.
- **`examples/`** — every format rendered at real size from real ODD material;
  `grid.jpg` and `phone.jpg` are the profile as Instagram shows it.
- **`src/`** — the generator. `posts.mjs` is the first twenty, `formats/v2.mjs`
  the signature formats, `grid.mjs` the edition order, `build.mjs` the renderer.

Everything is built from `brand/tokens/odd.css` and `brand/fonts/`, so a post
cannot drift from the website: same grounds, same five type roles, same pill,
same hairlines, the mark from the same path the nav uses.

## The idea in one sentence

**The grid is not a billboard. It is the room, posted.** A precise, quiet frame
(Ink, hairlines, five sizes, small tracked labels) built around something alive
(a photograph of real people, one loud word, the mark breathing).

## The signature

Remove the logo and these still say ODD at thumbnail size.

1. **The square is the photograph.** The profile grid shows only the centre
   square of a 4:5 post (135–1215px), so the photograph fills exactly that and
   the words live in the two 135px Ink bands above and below it. Eyebrow and
   credit in the top band, one line in the bottom. Nothing ever sits on the
   photograph; there is no scrim in this system. (`post-27` … `post-32`, `36`,
   `37`, `reel-2`)
2. **Type as image.** One word or one figure set bigger than the tile and
   cropped by its edges — the only place anything exceeds the Hero size, and
   only ever a single word or number, never a sentence. (`post-21`, `reel-1`)
3. **Through the lobes.** The mark as a window: a photograph seen through the
   three-lobe shape, on Ink. The shape is ours; the picture is the room.
   (`post-22`, `story-5`)
4. **The strike-through.** The nav habit, used to say what ODD is not: the
   line stays at full figure, the word goes to 40%, the answer sits under it.
   ~~A festival.~~ A week. ~~Coming soon.~~ Not announced yet. (`post-23`,
   `post-24`, `story-4`)
5. **The mark, breathing.** The site's steam displacement frozen on one frame
   — the living layer, as a still. Once an edition, not more. (`post-34`)
6. **Numbered cells and hairline sheets.** 01–03 with 1px rules and the ground
   showing through; nine frames of one night with 2px gaps. The catalogue
   habit inside a festival. (`post-33`, `post-26`)
7. **Premise, then point.** Every line longer than three words is set in two
   halves: the first quiet (40%), the second full. One size, two weights of
   ink. (everywhere)

And the odd one out: **the pill, alone.** One tile in twelve is the only round
thing on a square grid, and nothing else. (`post-35`)

## The grid

Plan twelve at a time — `src/grid.mjs` is one edition, and `examples/grid.jpg`
is what it looks like.

- **Row one is the room.** One wide photograph across three tiles
  (`post-25a/b/c`). Post c first, then b, then a: the newest lands top-left.
- **Ink by default.** Light lands on a diagonal — tiles 6, 8, 10 — never two
  side by side, never a column. A light photograph counts as light.
- **Eight of twelve are photographs**, and at least three of those are people
  at eye level rather than stages.
- **One loud tile, two strikes, one numbered.** The rest are photographs.
  The pill, alone, opens the next edition — one tile in twelve, never two.
- **Any three consecutive tiles must compose on their own** — a new post
  shifts everything one place, so the edition has to survive being read from
  any offset.
- **The six highlight covers** carry the lockup suffixes alone: FEST, FERENCE,
  SPACE, STUDIO, ARCHIVE, OPEN CALLS. They make the top of the profile read as
  one system before a single tile is seen.

## The photograph

- Real ODD moments only, from the photobank or `src/assets/`. No stock, no
  generated people, no renders.
- Get close: faces at eye level, hands doing the thing, the room from inside
  the crowd. A stage seen from the back is the last choice.
- Colour stays. The archive's stage light is where Ink came from.
- The crop is the square; `sq({ pos, zoom })` anchors the zoom on the point
  that matters. A panorama needs a photograph at least 1800px wide (it
  scales 1.8×; Instagram's compression hides most of it, a bigger source
  hides all of it).
- **Credit is part of the design**: "Photo: ODDfest / name" in the top band,
  right. The examples say "Photo: ODDfest" because this generator does not
  know who shot which frame. Replace it before posting; the names are in the
  photobank.
- **Never put a name on a face the source does not name.** Crowd photographs
  caption the night. A name goes on a tile only when the file or the page
  names that person (`post-19`, `32`, `36`).

## The voice at feed size

Headlines are sentences and end with a full stop. Premise quiet, point full.
A bottom-band line is at most two lines of Heading (about 60 characters). The
caption carries the rest: first line the fact, then the context, then the
credit, then the ask if there is one. When something is not decided, the post
says so — that is what `post-24` is for.

Numbers, dates, prices and names come from the site's content files or the
ticket backend, never from a draft. The 274 in `post-01`, `16` and `21` is the
credited total on the thank-you page. ODDfest 2027 and ODDference 2027 dates
are not announced, so no post announces them.

## Rebuild

```bash
npm ci                                         # once, at the repo root (Playwright)
cd brand/social/src && node build.mjs          # everything, ~2 min
node build.mjs --only=post-22,story-5,grid     # just these (prefix match)
```

Out: `examples/post-NN.jpg` (1080×1350; a `wide: 3` post becomes `a/b/c`),
`story-N.jpg` (1080×1920), `reel-N.jpg`, `carousel-N.jpg`, `highlight-N.jpg`
(1080×1080), `grid.jpg`, `phone.jpg`. To add a format, add an entry to
`formats/v2.mjs` (or a new module in `formats/` exporting `css`, `posts`,
`stories`, `reels`), then add it to `grid.mjs` if it belongs in the edition.

## Retired from the first pass

- **The footer bar** (mark + URL on every tile). It made every post look like
  a template. The mark now appears only in the highlight covers, the repost
  frame, and as the window or the breathing still.
- **Scrims.** Type no longer sits on photographs at all.
- `post-16` (the 260px figure) is superseded by `post-21`. It stays as the
  quieter option.

## Where the material came from

- Photographs: the ODDfest photobank on Flickr (2026 editions, Creative Week,
  ODDference) and `src/assets/` (ODDspace opening and everyday, ODDstudio,
  ODDfest 2026).
- Names: `src/content/pages/oddfest.json` (programme), `oddfest-2026.json`
  (the 274 credits), file names in `src/assets/` for the three named people.
- Copy: the site, verbatim or trimmed. Nothing here was invented.

## What this borrowed from elsewhere

Festival identities that work like ODD's — Horst Arts & Music is the clearest
— do four things this system copies deliberately: photographers are credited by
name on every image; the platforms are equal pillars rather than a hierarchy;
editorial storytelling is a recurring series, not an afterthought; and the open
call is permanent content rather than an interruption. The look is ODD's own.
