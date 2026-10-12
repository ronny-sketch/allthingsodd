---
name: odd-social-posts
description: Make ODD's weekly social posts (Instagram carousels, LinkedIn document posts, the three-part mark post) in the approved "news from ODD" style. They are rendered from brand/social/src/whats-next.mjs, checked by canvas.mjs, and opened as an editable claude.ai Design canvas at Instagram size. Use whenever someone asks for ODD, ODDfest, ODDference, ODDspace or New Nordic Way social posts, a carousel, a LinkedIn post or document, "this week's posts" or "what's next" posts, or wants existing posts edited, re-rendered, put on a canvas or turned into Canva files.
---

# ODD social posts

This is the tool Ronny uses for ODD's posts, written down so that anyone's Claude produces the same quality from one prompt. The quality comes from doing **every step, in order**. Each rule below exists because a pass without it was rejected.

## What comes out

For each post (a _carousel_):

- **Instagram:** 1080 × 1350 JPEGs, 9 frames (up to 11 for a story that needs it).
- **LinkedIn:** the same story for organisations, 7 pages, as JPEGs plus one PDF (the document post).
- **An editable claude.ai Design canvas.** Every frame sits at 1080 × 1350 with its words as live text. A note at the end of each row holds the caption credit line, the alt texts and the flags.
- **`NOTES.md`:** every frame with its photo and credit, the facts with their sources, and the flags.
- Only when asked: Canva import files.
- **Option A only.** Ronny chose the Photo cover on 12 October 2026. B and C are retired; don't build or offer them.

**Nothing gets posted, scheduled or sent by Claude.** A person posts. Captions are the person's (Aki writes them). Claude may draft a LinkedIn first line, marked as a draft.

## Ground rules

1. **Facts only from the site.** Every date, price, figure, name and venue comes from `src/content/pages/*.json` (what allthingsodd.co shows). Copy is the site's words, verbatim or trimmed. If a fact is not on the site, it does not go on a frame: write `[TO CONFIRM]`, put a `flag` on the frame and say so. If two sources disagree, flag the conflict and don't choose between them.
2. **Check dates against today.** A price "until 1 November" is wrong on 2 November. Re-read every time-bound fact against the current date before rendering.
3. **Every photograph has its photographer.** Look up the file name without its extension in `src/components/sections/photo-credits.json`:
   - A name there gives the credit `by('Full Name')`, shown as "ODDfest / Full Name".
   - `null`, or missing, means credit `by(null)`, which flags the frame automatically.
   - For a photo from `brand/social/src/images/`, take the name from the Flickr title or tag; the sources are listed at the top of `photo-credits.ts`.
   - Never guess a name, and never build one from a file name or an email address.
4. **Identifiable people** in a partner, sponsor or sales context get a `flag` asking for a consent check.
5. **Names:** ODD in capitals. ODDfest, ODDference, ODDspace, ODDstudio and ODDagency are one word, always. "All Things ODD" is only the website's name. British spelling.
6. **The repository is public.** No internal money, contract, funding or personal details in any file, comment or flag. "Check the price with Ronny" is fine; the price under discussion is not.

## The model

This was approved by Ronny on 9–11 Oct 2026. Do not redesign it.

**News from ODD.** Every other frame is a photograph with a heading, and the text frame after it explains the heading. The reference account is Uusi Juttu (@uusijuttu.fi). Read it for the rhythm, never copy its surface.

**Instagram carousel, 9 frames:**

| Slot  | 1     | 2    | 3     | 4    | 5     | 6    | 7     | 8                 | 9    |
| ----- | ----- | ---- | ----- | ---- | ----- | ---- | ----- | ----------------- | ---- |
| Frame | Cover | Text | Photo | Text | Photo | Text | Photo | Text: **the ask** | Card |

- Exactly one of the photo slots (3, 5 or 7) is the **window**. Move it between carousels.
- Across the week's carousels use a different **lobe** each time: `lobe: 0` is the O, `1` the first D, `2` the last D.
- The text frames come in four kinds: explainer, Q&A, number, list. Mix them so no two text frames in a carousel look alike, and no two carousels use the same order.
- The ask is the last text frame. On Instagram its words end with **"Link in bio."**

**LinkedIn deck, 7 pages.** The reader is an organisation (a partner, a company booking the space, a buyer of tickets for staff), not a visitor.

1. Cover: the hook for that reader.
2. Explainer.
3. Photo.
4. Q&A.
5. Window.
6. The ask, with the page URL on the frame (`url: 'allthingsodd.co/…'`).
7. Card with the same URL.

LinkedIn has no link in bio and PDF pages are not clickable, so the address is always printed. The carousel gets a `hook`: a draft of the post's first line, for the person to rewrite.

**Three-part post (occasional):** the whole mark across three frames, one product a lobe. Use `three(panels)` on a frame with `wide: 3`. The LinkedIn version is one 2580 × 1350 image: `three(panels, true)` with `w: 2580`.

### The frames

The helpers in `whats-next.mjs` set every size, colour and position. Never restyle inside a frame.

| Frame     | Call                                                    | What the helper draws                                                                                                                                                                           | Copy limits                                                                                                                                                 |
| --------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cover     | `cover({ img, pos, zoom, dateline, title, t, credit })` | The photo under a 52 % Ink veil. The dateline in Gabarito SemiBold 26 px caps, tracked, Paper 80 %. The title in Forta 104 px through the website's warp. "Photo: Name" runs up the right edge. | Dateline ≤ 45 characters. Title ≤ 45 characters, ending in a full stop. `t` is the instant of the warp: a new value (0.5–4) for every carousel in the week. |
| Photo     | `ph({ img, pos, zoom, point })`                         | The photo full-bleed with an Ink scrim (64 % at the bottom, gone by 44 %). The heading in Forta, Paper, bottom left, 64 px from the left and 148 px from the bottom.                            | ≤ 4 words at 72 px. Longer: add `long: true` (52 px) and keep it ≤ 40 characters.                                                                           |
| Window    | `ph({ win, lobe, point })`                              | The photo seen through one lobe of the mark, the heading on Ink below.                                                                                                                          | The subject must sit in the middle third of the photo. ≤ 4 words. Once per carousel.                                                                        |
| Explainer | `tx({ lead, body, url })`                               | Ink. The lead in Gabarito SemiBold 64 px at the top, the body in Gabarito 50 px at Paper 80 % at the bottom.                                                                                    | Lead ≤ 90 characters. Body ≤ 340 characters with **one** `<b>…</b>` phrase.                                                                                 |
| Q&A       | `qa({ q, a, url })`                                     | A Forta 72 px question at the top, the answer at the bottom.                                                                                                                                    | Question ≤ 50 characters, taken from the site's FAQ where one exists. Answer ≤ 340 characters.                                                              |
| Number    | `num({ big, lead, body, url })`                         | A Forta 200 px figure with a SemiBold line under it, the body at the bottom.                                                                                                                    | Figure ≤ 6 characters (€299, 5,000+). Only a figure the site states.                                                                                        |
| List      | `list({ lead, items })`                                 | The lead at the top, Forta 56 px lines at the bottom.                                                                                                                                           | ≤ 5 lines, each ≤ 34 characters.                                                                                                                            |
| Card      | `card({ fill, line, url })`                             | Paper, with the mark (760 px) filled with the cover photo, the address and one line.                                                                                                            | Line ≤ 45 characters. `fill` is the cover photo.                                                                                                            |

The character limits are guides. `canvas.mjs render` checks the real layout, and its verdict is what counts.

## Non-negotiables

1. **Never add a device.** No eyebrow, counter, rail, pill, grain, sticker, edge word or extra logo. If a frame needs explaining, that is the caption's job.
2. **The mark only where it does a job:** the window, the card, the three-part post. Never as decoration in an empty corner.
3. **Text frames use the whole frame:** the lead at the top, the explanation at the bottom. Never a small block with an empty half above it.
4. **On a photograph, Paper or Ink only.** No colour, no grey type on a photo. The scrim is Ink.
5. **148 px clear at the top and bottom of every frame.** The profile grid crops posts to the centre square.
6. **One idea a frame.** The photo frame says it in a few words; the next text frame explains it.
7. **Forta is for display, in caps:** cover titles, headings, questions, figures, list lines. Gabarito for everything else.
8. **Take a reference's thinking, never its surface.** One pass copied another account's caption-size type and corner stickers, and was worse than the version before it.
9. **Choose photos that survive 4:5:** a portrait, or a subject in the middle. A 3:2 photo with three people across it cannot be cropped without chopping someone.

## The steps

### 0. Once per machine

```bash
git clone https://github.com/ronny-sketch/allthingsodd && cd allthingsodd
npm ci && npx playwright install chromium
(cd brand/deck/src && npm ci)        # only needed for Canva files
```

Run Claude Code from the repository root; this skill loads from `.claude/skills/`. Pull `main` before each new week.

### 1. The brief

Find out four things: what is new (the news), which product or products, the platforms (default: Instagram and LinkedIn) and the week. If you were only given a topic, propose the carousels in a short list (one per piece of news, with a one-line angle each) and carry on. Don't stall on a question you can answer from the site.

### 2. Read, every time

- `brand/social/README.md`, the "Rebuild" section.
- `brand/social/src/whats-next.mjs`, the whole file. It is the template and the record of what is approved.
- The page JSON for each product, `src/content/pages/<page>.json`. The copy and every fact come from here.
- `brand/BRAND-GUIDE.md` §3 (non-negotiables) and §9 (posts).

### 3. Facts and lines

Before writing a frame, make a table of every fact you will use, with the JSON file and field it came from. Take the lines from the same JSON, verbatim or trimmed. Anything you can't source becomes `[TO CONFIRM]` plus a `flag`.

### 4. Photos

- **Sources:** `src/assets/**` (the constant `A` in the code) and `brand/social/src/images/` (`I`).
- **A new photo from the ODDfest Flickr:** download the 2048 px version. On the photo page, the `"displayUrl"` JSON gives the `_k` size, and no API key is needed. Save it to `brand/social/src/images/` under a descriptive name.
- **Check every photo:**
  - it crops to 4:5 around its subject (move it with `pos: 'x% y%'`, enlarge with `zoom`);
  - a window photo has its subject in the middle third;
  - the credit is traced as in ground rule 3;
  - identifiable people are flagged where ground rule 4 applies.
- **Don't reuse a photo** from this week's other carousels, except the cover photo on its own card.

### 5. Write the carousel in `whats-next.mjs`

Copy the closest existing carousel block, rename it, fill it in, and register it in `carousels`. An Instagram carousel looks like this:

```js
const weekCover = `${A}/about/<file>.jpg`;
const weekFest = num1([
  { alt: '<what the photo shows>. <the frame’s words>. Photo: <Name>.',
    credit: by('<Name>'), html: cover({ img: weekCover, pos: 'center 40%', dateline: '<dateline>', title: '<Title.>', t: 2.3, credit: '<Name>' }) },
  { alt: 'Text on Ink. <lead> <body>',
    credit: null, html: tx({ lead: '<lead>', body: '<body with one <b>phrase</b>>' }) },
  { alt: '<photo>. <heading>', credit: by('<Name>'), html: ph({ img: `${A}/<file>.jpg`, point: '<Heading.>' }) },
  // … text, window (ph({ win, lobe, point })), text, photo, the ask (ends 'Link in bio.')
  { alt: 'A Paper card: the ODD mark filled with <cover photo>. allthingsodd.co. <line>.',
    credit: by('<Name>'), html: card({ fill: weekCover, line: '<line>' }) },
]);
// in `carousels`:
...set([{ name: '<kebab-name>', title: '<Title>', frames: weekFest }], 'instagram', ['a']),
...set([{ name: 'li-<kebab-name>', hook: '<draft first line>', title: '<Title>', frames: weekLiFest }], 'linkedin', ['a']),
```

- **Fields on every frame:** `alt` (what the photo shows, then the frame's words), `credit` (`by('Name')`, `by(null)` for a photo whose photographer is unknown, `null` for text frames), and `flag` wherever a person must check something before posting.
- **Names** are kebab-case and unique. LinkedIn names start `li-`.
- **Keep the approved posts that are already in the file.** Add, don't replace.

### 6. Render and check

Set `OUT` to a folder outside the repository, for example `~/ODD social/2026-10-19-ideas-open`.

```bash
cd brand/social/src
node build.mjs --only=<name>,li-<name> --out=$OUT
node pdf.mjs --out=$OUT/linkedin/A li-<name>
node canvas.mjs render --only=<name>,li-<name> --out=$OUT/canvas
```

`canvas.mjs render` has to print **`checks: ok`**. Anything it lists (text in the 148 px band, off the edge, two blocks touching) gets fixed in the copy or the photo choice, then re-rendered. Never patch it in CSS.

Then **look**. Read every `$OUT/canvas/sheet-*.jpg`, and each cover and window at full size. Every frame has to pass:

- [ ] The cover title is legible: Forta's counters are open and the warp hasn't swallowed a letter. If not, change `t`.
- [ ] Every face and subject is uncropped and the window's subject is inside the lobe.
- [ ] No heading wraps a single word onto its own line. Rephrase it, or use `long: true`.
- [ ] Each text frame has its lead at the top and its body at the bottom.
- [ ] The words on the frames match the fact table.
- [ ] Every photo frame has a credit or a flag.

Fix, re-render and re-check until everything passes. Only then does anyone else see the posts.

### 7. The editable canvas

1. `Artifact` with `action: "quickstart"` and `intent: "design"`. Then publish with the Design `type_url` it returns, a `title` of "ODD social — <week>" and `auto_open: "after_first_write"`. Keep the `url`.
2. Upload every file in `$OUT/canvas/img` (the frame backgrounds plus `Forta-Regular.ttf`) to that `url`, using `asset: true` and `file_paths`, at most 25 a call.
3. From the upload replies, write `$OUT/canvas/blobs.json`: `{ "<file name>": "/_blob/<id>", … }`.
4. Generate the canvas files:
   ```bash
   node canvas.mjs design --out=$OUT/canvas --title="ODD social — <week>"
   ```
5. Publish them, with `root` set to `$OUT/canvas/design`:
   1. `file_path` = `project/canvas.json`, plus `project/Main.dc.html` in `files`;
   2. then every other `project/*.dc.html`, in one more call.
6. Share the link. Everyone in the ODD organisation can open it; editing needs the owner to share it from the Share menu.

### 8. `NOTES.md` in `$OUT`

For each carousel, write:

- a table with the frame number, kind, words, photo file and credit;
- the caption credit line ("Photos: A, B, C.");
- the LinkedIn first-line draft;
- the fact table with its sources;
- every flag.

### 9. Hand over

Reply with:

- the canvas link and the `$OUT` folder;
- the flags and anything marked `[TO CONFIRM]`;
- one line on what you assumed.

Say plainly that nothing has been posted.

### 10. Keep it

Once the person approves, run `npm run quality` from the repository root. Then commit `whats-next.mjs` and any new images straight to `main`, with the message "Social: <week>". Exports never go in the repository.

## After review

- **Words changed on the canvas:**
  1. Read each changed artboard (`Artifact` `read` with `path: "project/<id>.dc.html"`).
  2. Carry the text into `whats-next.mjs`.
  3. Re-render and re-check.
  4. Republish the changed artboards (`canvas.mjs design`, then publish only those files).
- **A new photo or cover title:**
  1. Change `whats-next.mjs` and re-render.
  2. Upload the new background for that frame and add it to `blobs.json`.
  3. Run `canvas.mjs design` and publish that artboard.
- **A comment on the canvas** asking for a change: make it the same way, then answer the comment.

## Canva, only when asked

- **Canva files:** `node canva.mjs --out=$OUT/canva`. The upload steps are in `brand/social/README.md`. Canva's PowerPoint import never uses uploaded Brand Kit fonts, so the files carry three stand-ins (League Spartan = Forta, Montserrat = Gabarito SemiBold, Poppins = Gabarito). In Canva, one **Change all** per stand-in puts the brand font back. The steps are in the export's `canva/README.md`.
- **A new warped title as a PNG:** `node canva.mjs --title="Your title." --t=1.4 --out=title.png`.
- Every new set is `set(…, ['a'])`. B and C stay in `variant()` for the record only.

## Changing the system

The model above is an approved decision. A new frame kind, device or colour, or a change to a size, goes to Ronny first. Once agreed, change `whats-next.mjs`, `brand/social/README.md` and this skill in the same pull request.
