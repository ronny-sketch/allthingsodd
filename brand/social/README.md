# brand/social/

ODD on Instagram: the signature, fifty-nine post formats in six families, five
stories, two carousels, two reel covers, the highlight covers, three planned
editions of the profile, and an idea bank of a hundred and four things worth
posting.

- **`IDEAS.md`** — the idea bank. Start here when planning a month.
- **`examples/`** — every format rendered at real size from real ODD material.
  `grid-1..3.jpg` are the three editions as Instagram shows them, `phone.jpg`
  the first at phone width, `thumbs.jpg` every post at 120px.
- **`src/`** — the generator. `posts.mjs` is the posts, the layout and the
  helpers; `extras.mjs` the stories, carousels, reels and covers; `grid.mjs`
  the editions; `build.mjs` the renderer.

Everything is built from `brand/tokens/odd.css` and `brand/fonts/`, so a post
cannot drift from the website: same grounds, same five type roles, same pill,
same hairlines, the mark from the same path the nav uses, the credits from the
same content file the thank-you page reads.

## The idea in one sentence

**The grid is not a billboard. It is the room, posted.** A precise, quiet frame
(Ink, hairlines, five sizes, small tracked labels) built around something alive
(a photograph of real people, one loud word, the mark breathing).

## The signature

Remove the logo and these still say ODD at thumbnail size.

1. **The square is the photograph.** The profile grid shows only the centre
   square of a 4:5 post (135–1215px), so the photograph fills exactly that and
   the words live in the two 135px bands above and below it: eyebrow and credit
   in the top band, one line in the bottom. Nothing ever sits on the
   photograph; there is no scrim in this system. (`post-03`–`06`, `09`–`11`,
   `17`, `18`, `26`–`33`, `50`–`56`)
2. **Type as image.** One word or one figure set bigger than the tile and
   cropped by its edges — the only place anything exceeds the Hero size, and
   only ever a single word or number, never a sentence. Three figures the site
   stands behind make a series: 274 · 150+ · 1,000+. (`post-13`–`15`, `reel-1`)
3. **Through the lobes.** The mark as a window: three lobes on one photograph
   (`post-02`), one lobe bigger than the tile (`post-23`), three nights stacked
   (`post-24`). The shape is ours; the picture is the room.
4. **The strike-through.** The nav habit, used to say what ODD is not: the
   line stays at full figure, the word goes to 40%, the answer sits under it.
   ~~A festival.~~ A week. ~~Coming soon.~~ Not announced yet. ~~Networking.~~
   Lunch. ~~Curated.~~ Made by its hosts. ~~World-class.~~ Helsinki.
   (`post-37`–`41`, `story-4`)
5. **The mark, breathing.** The site's steam displacement frozen on one frame
   — the living layer, as a still. Once an edition, not more. (`post-42`)
6. **Numbered cells and hairline sheets.** 01–04 with 1px rules and the ground
   showing through; nine frames of one night, or two editions side by side,
   with 2px gaps. The catalogue habit inside a festival. (`post-16`, `19`,
   `25`, `57`, `59`)
7. **Premise, then point.** Every line longer than three words is set in two
   halves: the first quiet (40%), the second full. One size, two weights of
   ink. (everywhere)

And the odd one out: **the pill, alone.** One tile in twelve is the only round
thing on a square grid, and nothing else. (`post-46`) Its cousin is **the quiet
tile** — one small photograph in a large Ink square (`post-20`). Both exist to
make the loud tiles louder.

## The series

A single tile is a post. The same layout three times is a habit, and habits are
what a profile is recognised by.

- **The loud figures** — 274 · 150+ · 1,000+ (`13`–`15`).
- **The strikes** — five so far (`37`–`41`); one per edition.
- **The portraits** — greyscale, name in Forta, role quiet; only portraits
  given to us as portraits (`07`, `08`).
- **The highlights** — eight 2026 events, one layout, the host's words in the
  caption (`26`–`33`).
- **The archive** — greyscale, so 2025 reads as history next to 2026 colour
  (`21`, `22`).
- **The rooms** — ODDspace on Paper, what each room is for (`54`–`56`).
- **The studio** — the room, the instruments, the monitoring (`18`, `52`, `53`).
- **The credits** — every name, alphabetically, across a carousel
  (`credits-1..3`) and as one wall (`12`).

## The grid

Plan twelve at a time. `src/grid.mjs` holds three editions — a quarter — and
`examples/grid-1.jpg`, `grid-2.jpg`, `grid-3.jpg` are what they look like.

- **Row one carries the edition's idea.** In edition 1 it is one photograph
  across three tiles (`post-01a/b/c`, posted c, b, a so the newest lands
  top-left). In 2 it is the stack, a dancer and a Paper statement. In 3 the
  launch group, one lobe and the open call.
- **Ink by default.** Light lands on a diagonal — tiles 3, 8, 10 — never two
  side by side, never a column. A light photograph counts as light.
- **At least seven of twelve are photographs**, and at least three of those are
  people at eye level rather than stages.
- **One loud figure, one or two strikes, one numbered tile per edition.** The
  pill, alone, once a quarter. The mark, breathing, once a quarter.
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
- Colour stays — the archive's stage light is where Ink came from. Greyscale is
  a series marker (portraits, archive), never a mood.
- The crop is the square; `sq({ pos, zoom })` anchors the zoom on the point
  that matters. A panorama needs a photograph at least 1800px wide.
- **Anything on the photograph is Paper or Ink**, full strength: the word, the
  credit, the mark. No accent and no opacity step over a photo (guide §3).
- **Credit is part of the design**: "Photo: ODDfest / name" in the top band,
  right. The examples say "Photo: ODDfest" because this generator does not
  know who shot which frame. Replace it before posting; the names are in the
  photobank.
- **Never put a name on a face the source does not name.** Crowd photographs
  caption the night. A name goes on a tile only when the file or the page
  names that person (`post-05`, `06`, `07`, `08`, `23`).

## The words

Headlines are sentences and end with a full stop. Premise quiet, point full. A
bottom-band line is at most two lines of Heading (about 60 characters).

Every post carries three texts: the **tile** (one line), the **caption** (first
sentence the fact and under 125 characters so Instagram does not cut it, then
context, then the credit, then the ask if there is one) and the **alt text**
(what is in the picture, for the alt field). The build warns when a first
sentence is too long or alt text is missing.

Numbers, dates, prices and names come from the site's content files, never
from a draft: 274 credited, more than 150 acts to five venues, more than 1,000
people at Creative Week partner events, €150 / month, €20 / hour. ODDfest 2027
and ODDference 2027 dates are not announced, so no post announces them — that
is what `post-38` is for.

## Optimised for the feed

- 1080×1350 JPEG at quality 90, sRGB — Instagram's own ceiling; anything larger
  is recompressed harder.
- The centre square is the composition; the bands are the feed's bonus. Check
  `thumbs.jpg`: one thing per tile must read at 120px — a face, a figure, a
  struck word, a pill. If nothing does, the tile is a caption, not a post.
- Stories keep every word inside the 320px safe area top and bottom.
- Reel covers are stills in the grid's own language, so a video does not punch
  a hole in the profile.
- A carousel's every frame stands alone; nobody swipes.

## Rebuild

```bash
npm ci                                          # once, at the repo root (Playwright)
cd brand/social/src && node build.mjs           # everything, ~3 min
node build.mjs --only=post-2,story-5,grid        # just these (prefix match)
```

The week's posts live in `src/whats-next.mjs` (the four "what's next"
carousels and the three-frame post of October 2026) and render outside
`examples/` with `--out`. Their model, set on 9 Oct 2026 after reading Uusi
Juttu (@uusijuttu.fi): these are news from ODD, so every other frame is a
photograph and every other frame is text on Ink. A photograph always carries
a heading, Forta in Paper bottom left; the text frame after it explains and
uses the whole frame: the lead at the top, the explanation at the bottom,
the same 64px left edge as the headings, and no mark (11 Oct: no logo in
every empty space). Text frames come in four kinds so no two in a carousel
look alike: the explainer (Gabarito SemiBold 64 lead + Regular 50 body, one
bold phrase), the Q&A (a Forta 72 question, the site's own FAQ answer), the
number (a 200px Forta figure, the one size outside the ladder, because a
price or a count is the frame) and the list (Forta 56 lines). The cover is the website's hero: the dateline in Gabarito
caps, the Forta title through the site's warp (the maths of
`src/scripts/warping-text.ts` frozen at one instant as static SVG filters,
blur capped at fs × 0.035 so Forta's counters stay open; the cover is the
only frame that uses it) and the photographer up the right edge. Once a
carousel the photograph is seen through one lobe of the mark, any of the
three (`lobe: 0|1|2`; their x-extents are `LOBES`), lifted so the heading
lands on Ink. The last text frame is the ask and ends "Link in bio."; every
carousel closes on the Paper card with the mark filled with the cover
photograph and allthingsodd.co (the vision card carries the mission with the
flat mark). A frame with `wide: 3` renders at 3240px and is cut into a, b, c:
the three-frame post spreads the whole mark across the swipe, one lobe a
frame. Photographers beyond the cover are credited in the caption, and
NOTES.md in the export folder lists them per frame. Earlier passes (band
layouts, big edge words, caption-sized type, photo-only with wordless frames,
one text-frame shape) were rejected or superseded.

The same file holds the LinkedIn set (`li-` decks, 11 Oct 2026): the same
frames for a different reader, the organisation. Each deck is seven pages
(the drop-off studies put the fall after page six or seven), the ask and
the card print the address because LinkedIn has no link in bio and PDF
pages are not clickable (`url` on `tx/qa/num` and `card`), and the
three-part post is one 1.91:1 image (`three(panels, true)`, `w: 2580` on
the frame) because LinkedIn shows several images as a collage. `pdf.mjs`
turns a rendered deck into the document post, one 1080 × 1350 page a frame.

Every set comes in three variants that test the hook (`variant()` in the same
file): A is the approved set, B fills the mark with the cover photograph on
Paper and turns the text frames, windows and card Paper (photo frames stay Ink:
type on a photograph is Paper on the Ink scrim), C sets the title alone on Ink
at 128px. Carousels carry a `dir` (instagram/B …) and frames a body `cls`, which
build.mjs honours. `canva.mjs` turns every set, plus a 14-page template kit,
into PowerPoint files Canva imports as editable designs: it renders each frame
and takes it apart into photos (replaceable), one full-frame overlay of the
ground with the mark cut out, the scrim and veil, the warped title as a
transparent PNG and live text where the render put it. `--title` makes a
warped title for a new cover. The page itself lives in `page.mjs`, shared by
both scripts.

```bash
node build.mjs --only=instagram/,linkedin/    # or --only=instagram/B, --only=oddfest-whats … --out=~/Projects/AI/exports/odd-social/2026-10-whats-next
node pdf.mjs --out=~/Projects/AI/exports/odd-social/2026-10-whats-next/linkedin/B \
  li-oddfest li-oddference li-oddspace li-vision   # → …/linkedin/B/*.pdf, likewise A and C
node canva.mjs --out=~/Projects/AI/exports/odd-social/2026-10-whats-next/canva   # once: cd ../../deck/src && npm ci
```

`canvas.mjs` puts a set on an editable claude.ai Design canvas at Instagram
size: every frame an artboard of its own (1080 × 1350), a flattened background
(photo, scrim, mark, warped title) under the words as live Forta and Gabarito
text at the render's positions, one row a post, a note per row with the
caption credit line, the alt texts and the flags (`flag` on a frame, `hook` on
a LinkedIn carousel; a photo with no credit flags itself). Its `render` step is
also the layout check: it fails on any text in the 148px clearance, past the
frame edge or touching another block, and writes a contact sheet per carousel.
The whole weekly routine, rules included, is the project skill
`.claude/skills/odd-social-posts/SKILL.md`, so anyone's Claude Code in this
repository makes the posts the same way.

```bash
node canvas.mjs render --only=oddfest-whats,li-oddfest --out=<dir>   # → img/, frames.json, sheet-*.jpg; must say "checks: ok"
# upload <dir>/img/* to the canvas artifact, write <dir>/blobs.json ({ file: "/_blob/<id>" })
node canvas.mjs design --out=<dir> --title="ODD social — <week>"     # → <dir>/design/project: canvas.json + *.dc.html
```

Out: `examples/post-NN.jpg` (1080×1350; a `wide: 3` post becomes `a/b/c`),
`story-N.jpg` (1080×1920), `carousel-N.jpg`, `credits-N.jpg`, `reel-N.jpg`,
`highlight-N.jpg` (1080×1080), `grid-1..3.jpg`, `phone.jpg`, `thumbs.jpg`. To
add a post, add an entry to `posts.mjs` with `kind`, `family`, `why`, `alt`,
`caption` and `html` built from the helpers; add it to an edition in `grid.mjs`
if it belongs in one.

## Where the material came from

- Photographs: the ODDfest photobank on Flickr (2026 editions, Creative Week,
  ODDference) and `src/assets/` (ODDspace opening and everyday, ODDstudio,
  ODDfest 2026, the 2026 highlight events, the speaker portraits).
- Names: `src/content/pages/oddfest-2026.json` (the credits, read at build
  time), `oddfest.json` (programme and highlights), `oddference.json`
  (speakers), file names in `src/assets/` for the named people.
- Copy: the site, verbatim or trimmed. Nothing here was invented.

## What this borrowed from elsewhere

Festival identities that work like ODD's — Horst Arts & Music is the clearest
— do four things this system copies deliberately: photographers are credited by
name on every image; the platforms are equal pillars rather than a hierarchy;
editorial storytelling is a recurring series, not an afterthought; and the open
call is permanent content rather than an interruption. The look is ODD's own.
