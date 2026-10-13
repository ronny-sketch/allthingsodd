---
name: odd-decks
description: Make an ODD presentation from text, notes or a transcript, all the way to an editable Canva design in the ODD Brand Kit fonts. Builds the deck as a claude.ai Slides artifact in the ODD frame, then exports it to Canva and files it in All Things ODD / 02 Presentations. Use whenever someone asks for an ODD, ODDfest, ODDference, ODDspace or New Nordic Way deck, pitch, presentation, slides or a deck in Canva, or wants an existing ODD Slides deck sent to Canva.
argument-hint: '[what the deck is for, plus text, a transcript, a file path or a link]'
model: claude-opus-5-5
---

# ODD decks

The way Ronny made ODD's decks in October 2026, written down so that Aki's, Upi's or anyone's
Claude gets the same result from one request. Do every step, in order.

**What comes out:**

- a claude.ai Slides artifact (the deck to read, edit by hand and present);
- an editable Canva design of the same deck in Forta and Gabarito from the Brand Kit, filed in
  All Things ODD / 02 Presentations;
- a list of flags.

**Nothing gets sent, shared, posted or invited by Claude.** A person sends the deck.

## 0. Once per person

Check these before the first deck, and say plainly which ones are missing:

1. This repository, pulled, with `npm install` at its root, then `npx playwright install chromium`.
2. Poppler (`brew install poppler`) for `pdftotext`, `pdffonts` and `pdftoppm`.
3. Your own Surge account: `npx surge login`. Never Ronny's: it also serves allthingsodd.co.
4. **Forta 2.0** (`Forta-2.0.ttf`) from Ronny. It is under a commercial licence, so it never goes
   into this repository, a chat or a shared folder. Keep it at
   `~/Projects/AI/Fonts/Forta-2.0.ttf`, or pass `--forta=<path>`. The Brand Kit's Forta is 2.0.
   The deck itself uses the free Forta 1 (`brand/fonts`), which Canva would put in another font.
5. The Canva connector, connected in claude.ai to the All things ODD team.
6. The Artifact tool in Claude Code. If it isn't there, the deck can't be built here: say so.

## 1. The brief

Take what the person gives: pasted text, a transcript, a file, a meeting note in `~/odd-brain`,
or a Notion or Google Doc through its connector. Settle five things before writing:

- **audience;**
- **the one decision** the deck asks for;
- **the proof;**
- **length** (default 8–12 slides);
- **language** (the person's language, British spelling in English).

Ask one question only if the audience or the decision can't be read from the material.

## 2. Facts

- **Dates, prices, figures, names and venues come from allthingsodd.co**, which is
  `src/content/pages/*.json` in this repository. Anything else is the person's, from their
  material.
- **Never invent a figure, quote or name.** A missing fact is `[TO CONFIRM]` on the slide and in
  the flags. Two sources that disagree get a flag, not a choice.
- **Check every time-bound fact against today's date.**
- **Finances, contracts, funding, board, HR and personal details** go into a deck only when the
  person put them in this brief for this audience.
- **Third parties are named only with their consent.** Until then, name the category ("a
  Nordic foundation").
- **ODD is in capitals.** ODDfest, ODDference, ODDspace, ODDstudio and ODDagency are always one
  word. "All Things ODD" is only the website's name.

## 3. Words first

Run the `deck-editorial-director` skill (in this repository) on the story before any layout:

- one sentence a slide;
- titles that are claims, not topics;
- one statement a slide;
- the deck reads without a presenter;
- speaker notes (`<aside>`) carry the argument.

Show the person the outline (the titles, one line each) and go on unless they stop you.

## 4. Build the Slides artifact

Follow the Slides type's own instructions for the mechanics. They arrive when the deck is
created. Create with the Slides type, `type_url` `https://claude.ai/artifact/8jTsAFQMFDb2oA8MsPJ2eL`,
and `title` = the deck's name. Then:

1. **No design system.** ODD has none in the gallery yet, so the deck sets its own faces.
2. **Upload these as assets first:**
   - `brand/fonts/Forta-Regular.ttf` and `src/assets/fonts/gabarito-variable.woff2`: the faces;
   - `brand/logos/png/odd-mark-paper.png` and `odd-mark-ink.png`: the mark;
   - the photos.
     Use these exact files: they are what the exporter measures against.
3. **Photos** come from `src/assets/{hero,mosaic,news,about,oddfest-2026}`, `public/oddspace` and
   `brand/social/src/images`.
   - Every photo is credited in the footer: photographer, event, year. The photographer is in
     `src/components/sections/photo-credits.json` (file name without extension).
   - No name there means a flag. Never guess a name.
   - Identifiable people in a sales or partner context get a consent flag.
4. **Build every slide from a pattern in `frame.md`** (next to this file): grounds, type scale,
   hairline cells, footer and mark exactly as there. The deck rules are `brand/BRAND-GUIDE.md`
   §3, §8 and §12. The most-repeated mistakes:
   - grey or coloured text;
   - a mark in a square box;
   - a footer that sits inside the text block.
5. **Give the person the link.** The artifact is private: they share it from claude.ai if
   teammates should edit it. They read it and change it, by hand or by asking.

## 5. Into Canva

Always re-read the deck before this step: people edit it by hand. Don't use the deck's own
Share › Send to Canva: it goes through PowerPoint, and Canva never gives a PowerPoint the Brand
Kit fonts.

1. **Fetch the deck into a folder outside this repository.** The repository is public, and decks
   carry figures and asks.
   - `read` `project/deck.json`, then list the deck's files (`list`, scope `files`).
   - Read every `project/slides/<id>.html` with `paths`.
   - Read every `/_blob/<id>` the slides and faces name, one `read` with `path: "<id>"` each.
     A list of asset ids in `paths` fails.
   - Lay it out as `<deck>/project/deck.json`, `<deck>/project/slides/<id>.html` and
     `<deck>/_blob/<id>.<ext>`.
2. **Export:** `node brand/deck/src/canva.mjs --deck=<deck> --out=<deck>/<name>.pdf`. Act on
   what it prints:
   - `over-full in the deck, shrunk to fit`: the slide holds more than it has room for, and the
     deck shrinks it too. Cut words on that slide in the artifact, then start step 5 again.
     Ship it shrunk only if the person says so.
   - `breaks differently from the deck`: Forta 2.0 is narrower than Forta 1, so a line wraps in a
     different place. Look at that slide in Canva.
3. **Hop:** `node brand/deck/src/canva-hop.mjs up <pdf>` prints a link. Import it with the
   Canva connector's `import-design-from-url`:
   - name `Deck · <audience> · <title> · <d.m.yyyy>`;
   - `intended_design_type` `presentation`.

   Then run `node brand/deck/src/canva-hop.mjs down <domain>` at once, even if the import failed.

4. **Check:** export the new design as a PDF (`export-design`), download it, then run
   `node brand/deck/src/canva-hop.mjs check <ours.pdf> <canva.pdf> <dir>`.
   - Pages and fonts must match, and there must be no missing words.
   - Look at every `sheet-*.png` (ours left, Canva right).
   - A paragraph that came in **justified**: set it to left in Canva, by hand or with
     `edit-design` → `format_text` `text_align: "start"` after showing the person the preview
     and getting their OK.
   - **Anything else** (a lost word, a box in the wrong place): don't patch it in Canva. It's an
     exporter case. Tell Ronny, with the slide.
5. **File it:** `move-item-to-folder` to **02 Presentations** (`FAHX3y9BbnE`). A copy it
   replaces goes to **To delete** (`FAHXyuQ72LI`), where a person bins it. The connector has no
   delete tool: never say something was deleted.

Speaker notes don't travel to Canva. Offer to add them with `edit-design` →
`replace_speaker_notes`, after the person's OK on the preview.

## 6. Hand over

- the Slides link;
- the Canva edit link;
- the flags, in this order:
  - facts to confirm;
  - consent;
  - slides that were over-full;
  - anything left to fix in Canva.
