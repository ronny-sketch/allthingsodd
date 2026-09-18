#!/usr/bin/env python3
"""Build every ODD logo file from two sources: the mark's one path and Forta.

    python3 brand/logos/build.py            # SVGs + the website's copies
    node brand/logos/rasterize.mjs          # PNGs from those SVGs

Why generated rather than drawn. The sub-brand lockups are all the same
construction — the ODD mark, then the product suffix set in Forta — and the
hand-exported files had drifted apart: the ODDspace file sat its suffix 17
units closer to the mark than the ODDfest master (the designer's file in the
approved Drive kit), ODDference only existed as a PNG, and every file baked in
#EAE5E1, an off-white that is not in the palette. Measured from the ODDfest
master, the construction is exact and simple:

    mark height                      H
    suffix cap height                0.484 H   (Forta cap = 758/1000 em)
    suffix baseline                  0.7398 H  from the top
    mark -> suffix origin            0.2709 H
    suffix tracking                  0.09 em, plus Forta's own kerning

Those four numbers reproduce the master's FEST to within 0.05 units, so a
new product (ODDcity, or anything after it) gets a lockup that is identical in
construction to the ones already in use, by adding one line to LOCKUPS.
Forta is unicase, so the suffix reads as capitals whatever case is passed.
"""

from pathlib import Path
import re

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "svg"
SITE = ROOT / "src" / "assets" / "logos"
FORTA = ROOT / "src" / "assets" / "fonts" / "source" / "forta-regular.ttf"

INK = "#0E090B"
PAPER = "#E2DFDE"

# The mark: one path, read from the website's Logo primitive so there is a
# single source for it (434.41 x 137.892).
MARK_W, MARK_H = 434.41, 137.892
LOGO_ASTRO = (ROOT / "src/components/primitives/Logo.astro").read_text()
MARK_D = re.search(r'\sd="([^"]+)"', LOGO_ASTRO).group(1)

# Geometry in units of the mark's height (see module docstring).
CAP = 0.484
BASELINE = 0.7398
GAP = 0.2709
TRACK_EM = 0.09

# name -> suffix. The website ships the first three.
LOCKUPS = {
    "oddfest": "fest",
    "oddference": "ference",
    "oddspace": "space",
    "oddstudio": "studio",
    "oddagency": "agency",
    "oddcity": "city",
}


def kern(gpos, left, right):
    total = 0
    for lookup in gpos.LookupList.Lookup:
        for st in lookup.SubTable:
            if st.LookupType == 9:
                st = st.ExtSubTable
            if type(st).__name__ != "PairPos" or left not in st.Coverage.glyphs:
                continue
            if st.Format == 1:
                pairs = st.PairSet[st.Coverage.glyphs.index(left)].PairValueRecord
                total += sum(getattr(p.Value1, "XAdvance", 0) or 0
                             for p in pairs if p.SecondGlyph == right)
            else:
                c1 = st.ClassDef1.classDefs.get(left, 0)
                c2 = st.ClassDef2.classDefs.get(right, 0)
                total += getattr(st.Class1Record[c1].Class2Record[c2].Value1,
                                 "XAdvance", 0) or 0
    return total


def suffix_paths(word, height, x0):
    """Forta outlines for `word`, positioned for a mark `height` tall."""
    font = TTFont(FORTA)
    cmap, glyphs, hmtx = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
    gpos = font["GPOS"].table
    upem = font["head"].unitsPerEm
    scale = CAP * height / font["OS/2"].sCapHeight
    baseline = BASELINE * height
    track = TRACK_EM * upem
    paths, x, right = [], 0.0, 0.0
    names = [cmap[ord(c)] for c in word.upper()]
    for i, g in enumerate(names):
        pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        glyphs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x0 + x * scale, baseline)))
        paths.append(pen.getCommands())
        # The viewBox ends at the last glyph's ink, not its advance.
        bp = BoundsPen(glyphs)
        glyphs[g].draw(bp)
        right = x0 + (x + bp.bounds[2]) * scale
        if i + 1 < len(names):
            x += hmtx[g][0] + track + kern(gpos, g, names[i + 1])
    return paths, right


def svg(width, height, paths, fill, title):
    body = "".join(f'<path d="{d}"/>' for d in paths)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {height:.2f}" '
        f'role="img" aria-label="{title}"><title>{title}</title>'
        f'<g fill="{fill}">{body}</g></svg>\n'
    )


def build():
    OUT.mkdir(exist_ok=True)
    written = []
    # The mark alone.
    for colour, fill in (("paper", PAPER), ("ink", INK)):
        (OUT / f"odd-mark-{colour}.svg").write_text(svg(MARK_W, MARK_H, [MARK_D], fill, "ODD"))
        written.append(f"odd-mark-{colour}.svg")
    # Lockups, built at the mark's native height so the mark path is untouched.
    H = MARK_H
    for name, suffix in LOCKUPS.items():
        paths, right = suffix_paths(suffix, H, MARK_W + GAP * H)
        title = "ODD" + suffix
        for colour, fill in (("paper", PAPER), ("ink", INK)):
            (OUT / f"{name}-{colour}.svg").write_text(svg(right, H, [MARK_D, *paths], fill, title))
            written.append(f"{name}-{colour}.svg")
    # App icon / favicon: the paper mark centred on an ink tile. Same
    # composition as public/favicon.svg, which is copied from here.
    s = 104 / MARK_W
    icon = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="ODD">'
        f'<rect width="128" height="128" rx="24" fill="{INK.lower()}"/>'
        f'<g transform="translate(12,{(128 - MARK_H * s) / 2:.2f}) scale({s:.4f})">'
        f'<path fill="{PAPER.lower()}" d="{MARK_D}"/></g></svg>\n'
    )
    (OUT / "odd-icon.svg").write_text(icon)
    written.append("odd-icon.svg")

    # The website's copies. Paper artwork: the site paints its wordmarks as
    # <img> on dark heroes and as a currentColor mask on the rails, so the
    # light version is the one it needs; ODDspace's light theme recolours
    # through the mask. The ink mark stays ink (media downloads use it).
    for name in ("oddfest", "oddference", "oddspace"):
        (SITE / f"{name}-wordmark.svg").write_text((OUT / f"{name}-paper.svg").read_text())
    (SITE / "odd-mark.svg").write_text((OUT / "odd-mark-ink.svg").read_text())
    (ROOT / "public" / "favicon.svg").write_text(icon)
    return written


if __name__ == "__main__":
    for f in build():
        print("brand/logos/svg/" + f)
