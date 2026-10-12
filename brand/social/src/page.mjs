// The page every render sits on: the brand tokens, the fonts, the type ladder at
// social scale and each family's css. build.mjs screenshots it; canva.mjs takes
// it apart into layers. Paths are relative to this folder (pages load by file://).
import { css as postCss } from './posts.mjs';
import { highlightCss } from './extras.mjs';
import { css as weeklyCss } from './whats-next.mjs';

// The ladder at social scale: the same ratios, lifted so Small still reads on a
// tile roughly 400px wide on a phone. Everything else lives in the family's module.
export const css = `
@font-face { font-family: 'Forta'; src: url('../../fonts/Forta-Regular.ttf') }
@font-face { font-family: 'Gabarito'; src: url('../../fonts/Gabarito-Regular.ttf'); font-weight: 400 }
@font-face { font-family: 'Gabarito'; src: url('../../fonts/Gabarito-SemiBold.ttf'); font-weight: 600 }

html, body { margin: 0; padding: 0 }
body { position: relative; overflow: hidden; background: var(--color-bg);
  color: var(--color-paper); font-family: var(--font-body) }
body.paper { --color-bg: #e2dfde; --color-paper: #0e090b;
  --color-paper-80: rgb(14 9 11 / 80%); --color-paper-60: rgb(14 9 11 / 70%);
  --color-paper-40: rgb(14 9 11 / 62%); --color-paper-20: rgb(14 9 11 / 20%);
  --color-paper-12: rgb(14 9 11 / 12%); --color-paper-06: rgb(14 9 11 / 6%) }

.t-hero    { font: 400 104px/0.98 var(--font-display); letter-spacing: -0.02em; margin: 0 }
.t-display { font: 400 72px/1.04 var(--font-display); letter-spacing: -0.015em; margin: 0 }
.t-heading { font: 400 46px/1.12 var(--font-display); letter-spacing: -0.01em; margin: 0 }
.t-body    { font: 400 34px/1.5 var(--font-body); margin: 0 }
.t-small   { font: 400 26px/1.4 var(--font-body); margin: 0 }
.eyebrow   { font: 600 26px/1.4 var(--font-body); letter-spacing: 0.16em;
             text-transform: uppercase; color: var(--color-paper-40); margin: 0 }
.quiet { color: var(--color-paper-40) } .muted { color: var(--color-paper-60) }
${postCss}
${highlightCss}
${weeklyCss}
`;

export const page = (body, cls, w, h) => `<!doctype html><html><head><meta charset="utf-8">
     <link rel="stylesheet" href="../../tokens/odd.css">
     <style>${css}\nbody{width:${w}px;height:${h}px}</style></head>
     <body class="${cls}">${body}</body></html>`;
