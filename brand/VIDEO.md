# VIDEO — the bar every ODD video clears

Set 8 October 2026, after the All Things ODD teasers. This is the minimum, not the
ambition: a video that does not clear every line here is not shown, not even to the
team. The teaser build is the reference for how it is done; its checks are the gate.

## 1. The idea

One idea per video, and the picture serves it. If a shot, a word or a move is there
because it looks good rather than because the idea needs it, it goes. It does not need
more. It needs to be better.

## 2. Picture

- **Real ODD footage only.** Our events, our space, our people. No stock, no generated
  footage, no footage we do not have the right to use. A person's name never sits on a
  face.
- **The brand's own type and marks.** The mark and the lockups as `brand/logos/build.py`
  draws them, names in Forta, the address in Gabarito, Ink and Paper, a scrim under any
  type that sits on a photograph. The mark keeps its clear space.
- **Three formats from one build**, and a cover frame for each: 4:5 (1080×1350) for the
  feed and LinkedIn, 9:16 (1080×1920) for Stories, and 9:16 for Reels and TikTok with
  the lockup and the address clear of the caption and the buttons down the right.
- **The picture never stops.** One real frame per output frame. No frame held unless the
  hold is the point (an end card), no repeated frame inside a moving shot (no 25-in-30
  pulldown), no black frame, no blown highlight, no flash. Every move eases, and
  anything that turns fast carries motion blur, so a cut reads as a cut and a move as a
  move.
- **The file:** 30 fps, H.264 High, 4:2:0, limited range, BT.709 in the matrix and in
  the stream's tags (check them: ffmpeg's own colour flags do not write them), crf 16 or
  better at a slow preset, faststart. AAC 256k at 48 kHz.

## 3. Sound

- **The music as the composers made it.** Nothing looped, cut, stretched or held; a
  fade only at the ends and only under −24 dBFS. The picture is cut to the music, never
  the music to the picture.
- **−14 LUFS integrated, ±0.5. True peak −1.5 dBTP or lower.** No dropout: no silence
  over a quarter of a second, except under a held end card.
- **Rights before render.** ODD-owned or licensed, and the composers credited in the
  caption. Ask for the clean file; a separated stem is a stopgap.

## 4. Rhythm

This is the line the teasers missed first, so it is the strictest.

- **Every change sits on a hit the track actually has.** A cut, a landing, a tick of a
  name: on an attack in the sound, never on a grid someone typed from a tempo. Nothing
  changes where the track is silent. Nothing runs at a subdivision the track does not
  play: if the hi-hats are eighths, the text ticks eighths, not sixteenths.
- **Cues are measured, not typed.** Detect the attacks in the mix and build the timeline
  from them. A typed 140 BPM grid sat 13 ms after the real hits; with frames shown at
  k/30 the picture landed up to a frame and a half late, and the eye caught it.
- **The landing frame sits within half a frame of the sound.** The renderer shows frame
  k at k/30, so a cue is the attack less half a frame.
- **Measured on the render.** Read the finished file back (`sync.py`): the type is the
  bright shape in its band, and at every cue it must come to rest in the cue's own frame.
  A name that stands must still be moving the frame before and be at rest the frame
  after; a name that ticks (lands and leaves at once) must be stillest on that frame.
  An ease whose last frame moves half a pixel reads as landed a frame early: use one
  whose last frame still moves (sine, not cubic).

## 5. Words

- No words on screen but the names and the address, unless a voice carries them.
- ODD in capitals, product names one word: ODDfest, ODDference, ODDspace. "All Things
  ODD" is the website's name only. British spelling.
- Dates, prices and figures only from allthingsodd.co, and only when confirmed.

## 6. How it is made, and checked

- **Every frame is a function of time.** A page (or a timeline) draws frame k at k/30;
  a script renders the three formats, lays the sound under them and runs the checks.
  No hand-edited export that cannot be rebuilt.
- **The checks run on every build**, and a build that fails one is not a video yet:
  - `qa.py`: FREEZE, DARK, BLOWOUT, FLASH, STUTTER, SILENCE, LOUDNESS; warnings for
    inky stretches, dim shots and still shots.
  - `sync.py`: every landing comes to rest in its hit's frame; a stand not early, not
    late, a tick stillest on the hit.
  - the page itself refuses a cue the track has no hit for.
- **Nothing is posted by an agent.** Files are handed over with a README: what each cut
  is, timed from the music, the checks it passes, and what to check before posting.
- **The bar rises.** When a note from the team finds something the checks let through,
  the check is added before the fix, so the next video cannot have it. Aki's note on the
  text's rhythm became `sync.py` and the page's refusal.

## Where the reference build lives

The All Things ODD teasers (October 2026): `source/` in the export folder holds the
pages, `render.mjs`, `build5.sh`, `teaser5-mix.sh` (the measured cues), `qa.py` and
`sync.py`. When the next video starts, move the checks into `brand/video/` here, so
there is one copy.
