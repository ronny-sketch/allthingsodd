# The ODD deck frame

Slide patterns from the ODD decks of October 2026, with the words taken out. Build every slide
from one of them. They are also the shapes `brand/deck/src/canva.mjs` is tested on: a slide
built this way comes into Canva where the deck put it.

The rules behind them are `brand/BRAND-GUIDE.md` §3, §8 and §12, at brand 1.7 (12 Oct 2026).
If the guide and this file disagree, the guide wins: fix this file.

## Numbers

| What                  | Value                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas                | 1920 × 1080. Content margin `padding:128px 128px 160px` (title and body). Outer margin 56px top and bottom (eyebrow, footer, mark).                    |
| Grounds               | Ink `#0e090b` (default), Paper `#e2dfde` (a daylight, data or sources moment). Never a third.                                                          |
| Type colour           | Paper on Ink, Ink on Paper, full strength, everywhere. No accent colour, no grey.                                                                      |
| Hairlines             | `#2e2a2c` on Ink, `#c9c5c5` on Paper. Never a text colour.                                                                                             |
| Titles                | Forta 84px / 1.05 (content), 96px / 1.04 (cover and close, one title and one sentence). Weight 400, written in sentence case (Forta is capitals-only). |
| Cell heads            | Forta 44px / 1.1 (36px in a list column)                                                                                                               |
| Numerals              | Forta 60px / 1                                                                                                                                         |
| Body                  | Gabarito 26–30px / 1.35–1.4; cover sentence 32px                                                                                                       |
| Eyebrow               | `position:absolute; top:56px; left:128px`, Gabarito 26px, `letter-spacing:2px; text-transform:uppercase`                                               |
| Footer                | `position:absolute; bottom:56px; left:128px; width:1480px`, Gabarito 24px (sources, photo credit)                                                      |
| Mark, content slides  | `position:absolute; right:72px; bottom:56px; width:160px; height:51px`                                                                                 |
| Mark, cover and close | `position:absolute; top:56px; right:72px; width:240px; height:76px`                                                                                    |
| Mark files            | `brand/logos/png/odd-mark-paper.png` on Ink, `odd-mark-ink.png` on Paper (1512 × 480, 3.15 : 1). The box keeps that ratio: never a square.             |
| Nothing under         | 24px                                                                                                                                                   |

Faces in `project/deck.json` (upload both files as assets first):
`"faces":{"forta":{"family":"Forta","src":"/_blob/<id of brand/fonts/Forta-Regular.ttf>"},"gabarito":{"family":"Gabarito","src":"/_blob/<id of src/assets/fonts/gabarito-variable.woff2>"}}`

## Cover (the close is the same: the ask or the meeting, and a contact line)

```html
<section id="cover" data-transition="fade" style="display:flex; flex-direction:column; gap:28px; justify-content:end; padding:128px 128px 160px; background:#0e090b">
  <img src="/_blob/<photo>" alt="<what the photo shows>" style="position:absolute; top:0; left:0; width:1920px; height:1080px; object-fit:cover">
  <div style="position:absolute; top:0; left:0; width:1920px; height:1080px; background:linear-gradient(180deg, #0e090b26 0%, #0e090b8c 45%, #0e090bf7 82%)"></div>
  <img src="/_blob/<odd-mark-paper>" alt="ODD" style="position:absolute; top:56px; right:72px; width:240px; height:76px">
  <p style="position:absolute; top:56px; left:128px; font-family:Gabarito, Arial, sans-serif; font-size:26px; letter-spacing:2px; text-transform:uppercase; color:#e2dfde">To <audience> · From ODD, New Nordic Way rf · <Month year></p>
  <h1 style="width:1500px; font-family:Forta, Arial, sans-serif; font-size:96px; font-weight:400; line-height:1.04; color:#e2dfde">One sentence that is the whole deck.</h1>
  <p style="width:1300px; font-family:Gabarito, Arial, sans-serif; font-size:32px; line-height:1.35; color:#e2dfde">What the reader gets from the next ten minutes.</p>
  <p style="position:absolute; bottom:56px; left:128px; width:1480px; font-family:Gabarito, Arial, sans-serif; font-size:24px; line-height:1.3; color:#e2dfde">Photo: <Photographer>, <event>, <year></p>
  <aside>Speaker notes: the argument.</aside>
</section>
```

## Statement with cells (two to five)

```html
<section
  id="what"
  data-transition="fade"
  style="display:flex; flex-direction:column; gap:40px; padding:128px 128px 160px; background:#0e090b"
>
  <h2
    style="width:1664px; font-family:Forta, Arial, sans-serif; font-size:84px; font-weight:400; line-height:1.05; color:#e2dfde"
  >
    A claim, not a topic.
  </h2>
  <div
    style="display:grid; gap:1px; grid-template-columns:1fr 1fr 1fr; background:#2e2a2c; border:1px solid #2e2a2c"
  >
    <div style="display:flex; flex-direction:column; gap:12px; padding:32px; background:#0e090b">
      <h3
        style="font-family:Forta, Arial, sans-serif; font-size:44px; font-weight:400; line-height:1.1; color:#e2dfde"
      >
        Cell head
      </h3>
      <p
        style="font-family:Gabarito, Arial, sans-serif; font-size:26px; line-height:1.4; color:#e2dfde"
      >
        <b>Name</b> · what it is, in one or two lines.
      </p>
      <p
        style="font-family:Gabarito, Arial, sans-serif; font-size:24px; line-height:1.3; color:#e2dfde"
      >
        <a href="https://allthingsodd.co/...">allthingsodd.co/...</a>
      </p>
    </div>
    <!-- one div per cell, same markup -->
  </div>
  <p
    style="width:1664px; font-family:Gabarito, Arial, sans-serif; font-size:30px; line-height:1.35; color:#e2dfde"
  >
    The line that joins the cells.
  </p>
  <p
    style="position:absolute; bottom:56px; left:128px; width:1480px; font-family:Gabarito, Arial, sans-serif; font-size:24px; color:#e2dfde"
  >
    Source: allthingsodd.co
  </p>
  <img
    src="/_blob/<odd-mark-paper>"
    alt="ODD"
    style="position:absolute; right:72px; bottom:56px; width:160px; height:51px"
  />
  <aside>…</aside>
</section>
```

## Figures (on Paper)

```html
<section id="figures" data-transition="fade" style="display:flex; flex-direction:column; gap:28px; padding:128px 128px 160px; background:#e2dfde">
  <h2 style="width:1664px; font-family:Forta, Arial, sans-serif; font-size:84px; font-weight:400; line-height:1.05; color:#0e090b">What the figures prove.</h2>
  <div style="display:grid; gap:1px; grid-template-columns:1fr 1fr 1fr 1fr; background:#c9c5c5; border:1px solid #c9c5c5">
    <div style="display:flex; flex-direction:column; gap:8px; padding:24px 28px; background:#e2dfde">
      <p style="font-family:Forta, Arial, sans-serif; font-size:60px; line-height:1; color:#0e090b">5,000+</p>
      <p style="font-family:Gabarito, Arial, sans-serif; font-size:24px; line-height:1.3; color:#0e090b">participants</p>
    </div>
    <!-- one div per figure -->
  </div>
  <p style="position:absolute; bottom:56px; left:128px; width:1480px; font-family:Gabarito, Arial, sans-serif; font-size:24px; color:#0e090b">Figures: allthingsodd.co, <what and when></p>
  <img src="/_blob/<odd-mark-ink>" alt="ODD" style="position:absolute; right:72px; bottom:56px; width:160px; height:51px">
</section>
```

## Rows (a status or a timeline)

```html
<table
  style="width:1664px; font-family:Gabarito, Arial, sans-serif; font-size:26px; line-height:1.4; color:#e2dfde; border:1px solid #2e2a2c"
>
  <tr>
    <td style="padding:14px 20px; width:24%">Name</td>
    <td style="padding:14px 20px; width:76%">Where it stands, in one or two lines.</td>
  </tr>
</table>
```

## Two columns of items (sources, further reading)

On Paper: a two-column hairline grid as in the cells pattern, `padding:28px 32px` and
`gap:14px` in each column, an `<h3>` at 36px for the column head, and one `<p>` an item:
`<p style="font-family:Gabarito, Arial, sans-serif; font-size:26px; line-height:1.4; color:#0e090b"><b>Title</b> · description · <a href="…">link</a></p>`

## What keeps a slide right in Canva

- Text goes in `<h1>`–`<h3>`, `<p>`, `<li>` and table cells.
- Photos and logos go in `<img>` with an `alt`, never as CSS backgrounds: Canva's Replace works
  on images.
- No justified text, no rounded corners, no shadows, and no gradient except the Ink scrim.
- Leave heights out, and don't fill a box past its room. The export shrinks an over-full box
  the way the deck does and names it: that is a slide to cut, not one to ship.
- One-line labels under big numerals, a subtitle under the title, and items stacked in a column
  are all fine: the exporter handles them.
