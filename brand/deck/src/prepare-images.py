#!/usr/bin/env python3
"""Cuts the deck's photographs out of the website's assets.

    python3 prepare-images.py            (from brand/deck/src)

Every photograph in the decks is cropped here, once, to the exact aspect of the
box it sits in on the slide, and written to images/ at a size that survives a
projector without bloating the file (~150 dpi at its printed size). The build
script then places it at 1:1 — no cropping, no scaling surprises between
Keynote and PowerPoint.

Each entry is (source, output, aspect w/h, focal point, long edge), where the
focal point is where the crop should keep its weight: 0.5/0.5 is the middle,
0.5/0.38 keeps faces when a tall frame is cut to a short one.

Partner logos are a different job: the site renders other people's marks in the
figure colour (filter: brightness(0) invert(1)), so the SVGs are rasterised
flat and tinted to Paper with the alpha channel kept.
"""

import json
import pathlib
import subprocess
import sys

from PIL import Image

SRC = pathlib.Path(__file__).resolve().parents[3] / "src" / "assets"
OUT = pathlib.Path(__file__).resolve().parent / "images"
PAPER = (226, 223, 222)

# The aspect of the box each photograph sits in, to four decimals. A slide
# stretches whatever it is given, so the crop has to match the box exactly:
# odd.mjs holds the same numbers (see ASPECT there) and the build fails if a
# file and its frame ever drift apart.
MOSAIC = 3.31825 / 2.48667  # cover mosaic cell, 4 x 3 with 0.02in gaps
HALF = 5.5138 / 7.5  # half-slide photo, bleeding to one edge
FULL = 13.333 / 7.5  # full-bleed
STRIP = 2.4306 / 7.5  # edge strip on the two-sides slide
FACE = 1.54  # speaker portrait in the people grid
ROOM = 5 / 3  # ODDspace space card
WALL = 0.8  # photo-wall cell

PHOTOS = [
    # cover mosaic — twelve nights, days and rooms from the archive
    *[
        (f"hero/archive-{n}.jpg", f"mosaic-{i + 1:02d}.jpg", MOSAIC, (0.5, 0.45), 880)
        for i, n in enumerate(
            ["03", "05", "08", "09", "12", "13", "14", "15", "16", "19", "23", "28"]
        )
    ],
    # half-slide photographs
    ("examples/oddtheatre-vanha-ylioppilastalo.jpg", "oddfest-oddtheatre.jpg", HALF, (0.5, 0.5), 1040),
    ("oddfest-2026/oddference-jussi-venalainen.jpg", "oddference-stage.jpg", HALF, (0.45, 0.45), 1040),
    ("examples/odd-deep-space-kamppi-chapel.jpg", "case-odd-deep-space.jpg", HALF, (0.5, 0.5), 1040),
    # full-bleed
    ("cases/oddfest-2026-valerie-june.jpg", "fullbleed-valerie-june.jpg", FULL, (0.5, 0.45), 1760),
    # two-sides strips: ember on the creative side, a conference room on the other
    ("oddfest-2026/amber-silhouette.jpg", "strip-creative.jpg", STRIP, (0.78, 0.45), 1730),
    ("about/oddfest-2026-talk.jpg", "strip-business.jpg", STRIP, (0.66, 0.5), 1730),
    # ODDspace: the four spaces, in daylight
    ("oddspace/coworking-laptop-sofa.jpg", "oddspace-coworking.jpg", ROOM, (0.5, 0.5), 880),
    ("oddspace/opening-full-house.jpg", "oddspace-gallery.jpg", ROOM, (0.5, 0.5), 880),
    ("oddspace/auditorium-tiered.jpg", "oddspace-auditorium.jpg", ROOM, (0.5, 0.5), 880),
    ("oddstudio/studio-room-sofa.jpg", "oddspace-studio.jpg", ROOM, (0.5, 0.5), 880),
]

# the ODDfest 2026 photo wall, in the order the thank-you page runs them
WALL_PHOTOS = [
    "oddference-elisabet-lahti", "salome-daoudi-talk", "chicken-foot-soup-dj",
    "creator-tv-head", "harlequin-steps", "valiobeats-live-painting",
    "flower-umbrella", "blomqvist-piano-beams", "lamp-post-climber",
    "balustrade-dancer", "staircase-dancer", "red-light-dancer",
    "suit-at-the-door", "veiled-figure", "oddference-jussi-venalainen",
]
PHOTOS += [
    (f"oddfest-2026/{n}.jpg", f"wall-{i + 1:02d}.jpg", WALL, (0.5, 0.42), 520)
    for i, n in enumerate(WALL_PHOTOS)
]

# ODDference speakers, greyscale, in the order the page lists them
SPEAKERS = [
    ("sanna-kaisa-niikko.png", 0.40), ("siamak-naghian.png", 0.42),
    ("ashley-jex-wagner.png", 0.36), ("atte-jaaskelainen.jpg", 0.40),
    ("perttu-polonen.png", 0.42), ("galit-ariel.png", 0.38),
    ("alf-rehn.png", 0.35), ("rolf-ekroth.png", 0.40),
    ("samppa-lappalainen.png", 0.38), ("anna-brchisky.png", 0.36),
]
PHOTOS += [
    (f"speakers/{f}", f"speaker-{f.rsplit('.', 1)[0]}.jpg", FACE, (0.5, fy), 760)
    for f, fy in SPEAKERS
]


def crop(src, out, aspect, focal, long_edge, grey=False):
    im = Image.open(SRC / src).convert("L" if grey else "RGB")
    if grey:
        im = im.convert("RGB")
    w, h = im.size
    # the largest rectangle of the target aspect that fits INSIDE the source:
    # wider source, cut the sides; taller source, cut top and bottom
    cw, ch = (h * aspect, h) if w / h > aspect else (w, w / aspect)
    fx, fy = focal
    left = min(max(fx * w - cw / 2, 0), w - cw)
    top = min(max(fy * h - ch / 2, 0), h - ch)
    im = im.crop((round(left), round(top), round(left + cw), round(top + ch)))
    im = im.resize((long_edge, round(long_edge / aspect)) if aspect >= 1
                   else (round(long_edge * aspect), long_edge), Image.LANCZOS)
    im.save(OUT / out, quality=78, optimize=True, progressive=True)


def logos():
    """Rasterise the partner SVGs through the repo's Playwright, then tint the
    silhouette to Paper — the site's brightness(0) invert(1), done once."""
    root = pathlib.Path(__file__).resolve().parents[3]
    names = [p["logo"].rsplit("/", 1)[-1] for p in
             json.loads((root / "src/content/site/global.json").read_text())["partners"]]
    script = f"""
import {{ chromium }} from '{root}/node_modules/@playwright/test/index.mjs';
import {{ readFileSync }} from 'node:fs';
const names = {json.dumps(names)};
const browser = await chromium.launch();
const page = await browser.newPage({{ deviceScaleFactor: 1 }});
for (const name of names) {{
  const svg = readFileSync('{root}/src/assets/partners/' + name, 'utf8');
  const box = svg.match(/viewBox="0 0 ([\\d.]+) ([\\d.]+)"/);
  const w = Math.round(Number(box[1]) * 4), h = Math.round(Number(box[2]) * 4);
  await page.setViewportSize({{ width: w, height: h }});
  await page.setContent(`<style>html,body{{margin:0;padding:0}}svg{{display:block;width:${{w}}px;height:${{h}}px;filter:brightness(0)}}</style>` + svg);
  await page.screenshot({{ path: '{OUT}/tmp-' + name.replace('.svg', '.png'), omitBackground: true }});
}}
await browser.close();
"""
    subprocess.run(["node", "--input-type=module", "-e", script], check=True)
    for tmp in sorted(OUT.glob("tmp-*.png")):
        im = Image.open(tmp).convert("RGBA")
        tint = Image.new("RGBA", im.size, PAPER + (0,))
        tint.putalpha(im.getchannel("A"))
        tint.save(OUT / tmp.name.replace("tmp-logo-", "partner-"))
        tmp.unlink()


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for src, out, aspect, focal, long_edge in PHOTOS:
        crop(src, out, aspect, focal, long_edge, grey=src.startswith("speakers/"))
    logos()
    total = sum(f.stat().st_size for f in OUT.iterdir())
    print(f"images/: {len(list(OUT.iterdir()))} files, {total / 1e6:.1f} MB", file=sys.stderr)
