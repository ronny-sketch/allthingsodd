#!/usr/bin/env python3
"""Rebuild the shipped webfonts in src/assets/fonts/ from the originals in
src/assets/fonts/source/.  Run with `npm run fonts:build`; the output is
committed, so this only needs re-running when a source font changes.

Why this exists (2026-09-11).  The site ships its own fonts, and before this
they were the full original files merely recompressed to WOFF2: Forta 47.5KB
plus three separate Gabarito weights at 31-35KB each, 114KB and four requests
in total.  That is more than the render-blocking stylesheet, so even with the
<head> preloads in Layout.astro the fonts kept landing AFTER first paint and
every new visitor saw the Arial-metric fallback first.  Two cuts fix that:

  1. Subset to the Latin range the site actually uses (UNICODES below).  The
     originals carry glyphs for languages this site does not publish in.

  2. Collapse Gabarito's three static weights into the upstream VARIABLE font.
     One 46KB file now serves 400/600/700 (any weight in 400-700, in fact)
     where three statics cost 94KB and three connections.  Verified before
     adopting it: instancing the variable font at 400, 600 and 700 reproduces
     the three statics' advance widths for all 519 glyphs exactly, and the
     same hhea metrics and upem - so the `size-adjust` / `*-override` numbers
     on the metric-matched fallbacks in styles/global.css, which were measured
     against the statics, remain correct and must NOT be re-derived.

Net: 114KB over four requests -> 67KB over two, with bold now free.

Forta drops hinting; Gabarito keeps it.  Forta is the display face, used at
1rem and up (mostly far up - see typography.css), where TrueType hinting
instructions buy nothing on any renderer in use, and they were more than half
its weight (47.5 -> 21KB).  Gabarito sets body copy down to small sizes, so it
keeps everything; subsetting alone is worth ~23% there anyway.

Requires fontTools with brotli: `pip3 install 'fonttools[woff]'`.
"""

import shutil
import subprocess
import sys
from pathlib import Path

FONTS = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"
SOURCE = FONTS / "source"

# Latin, the punctuation the site's copy and UI actually use (em/en dashes,
# curly quotes, ellipsis, bullet, arrows, euro), and the maths signs that turn
# up in specs and pricing.  Latin Extended-A is in for Nordic and Baltic names,
# which this site prints a lot of.  Widen this rather than let a name render in
# fallback: a missing glyph is a visible defect, 2KB is not.
UNICODES = ",".join(
    [
        "U+0020-007E",  # Basic Latin
        "U+00A0-00FF",  # Latin-1 Supplement (ä ö å ø é ×  °  §  ...)
        "U+0100-017F",  # Latin Extended-A (š ž ō ā ...)
        "U+0192",
        "U+02C6-02C7",
        "U+02D8-02DD",  # spacing modifiers used by the above
        "U+2013-2014",  # – —
        "U+2018-201A",
        "U+201C-201E",  # ' ' ‚ " " „
        "U+2020-2022",  # † ‡ •
        "U+2026",  # …
        "U+2030",  # ‰
        "U+2039-203A",  # ‹ ›
        "U+2044",  # ⁄
        "U+20AC",  # €
        "U+2122",  # ™
        "U+2190-2193",
        "U+2197",  # ← ↑ → ↓ ↗
        "U+2202",
        "U+2206",
        "U+220F",
        "U+2211-2212",
        "U+2215",
        "U+221A",
        "U+221E",
        "U+222B",
        "U+2248",
        "U+2260",
        "U+2264-2265",
        "U+25CA",
        "U+FB01-FB02",  # fi fl
    ]
)

# (source file, output stem, keep TrueType hinting?)
JOBS = [
    ("forta-regular.ttf", "forta-regular", False),
    ("gabarito-variable.ttf", "gabarito-variable", True),
]

# Gabarito's variable axis runs to 900 upstream; the site uses 400, 600 and
# 700, so the heavier end is instanced away.  Keep this in sync with the
# `font-weight: 400 700` range on the @font-face in styles/global.css.
WGHT_RANGE = (400, 700)


def restrict_axis(src: Path, dest: Path) -> None:
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    font = TTFont(src)
    if "fvar" not in font:
        shutil.copyfile(src, dest)
        return
    instantiateVariableFont(font, {"wght": WGHT_RANGE}, inplace=True)
    font.save(dest)


def subset(src: Path, dest: Path, flavor: str, hinting: bool) -> None:
    args = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(src),
        f"--unicodes={UNICODES}",
        # Keep all OpenType layout features: kerning and the ligatures the
        # headlines rely on live here, and dropping them changes the design.
        "--layout-features=*",
        f"--output-file={dest}",
    ]
    if flavor:
        args.append(f"--flavor={flavor}")
    if not hinting:
        args.append("--no-hinting")
        # GDI-era rasterisation tables. No browser still shipping consults
        # them, and they are pure weight.
        args.append("--drop-tables+=LTSH,VDMX,hdmx")
    # `meta` carries only language-support hints and fontTools cannot subset
    # it; dropping it silences a warning and loses nothing.
    args.append("--drop-tables+=meta")
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def main() -> int:
    if not SOURCE.is_dir():
        print(f"no source directory at {SOURCE}", file=sys.stderr)
        return 1

    total_before = total_after = 0
    for filename, stem, hinting in JOBS:
        src = SOURCE / filename
        if not src.is_file():
            print(f"missing source font: {src}", file=sys.stderr)
            return 1

        staged = FONTS / f".{stem}.axis-restricted.ttf"
        restrict_axis(src, staged)
        try:
            for flavor, ext in (("woff2", "woff2"), ("", "ttf")):
                out = FONTS / f"{stem}.{ext}"
                subset(staged, out, flavor, hinting)
                if ext == "woff2":
                    total_before += src.stat().st_size
                    total_after += out.stat().st_size
                    print(f"  {stem}.woff2  {out.stat().st_size:>7,} bytes")
                else:
                    print(f"  {stem}.ttf    {out.stat().st_size:>7,} bytes  (fallback)")
        finally:
            staged.unlink(missing_ok=True)

    print(f"\nWOFF2 shipped: {total_after:,} bytes (from {total_before:,} of source)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
