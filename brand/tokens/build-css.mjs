// Builds brand/tokens/odd.css: the website's own CSS, assembled into one file
// that works outside this repository — a standalone page, an email tool, a
// prototype, an agent with no access to src/.
//
//   node brand/tokens/build-css.mjs        # write it
//   npm run check:brand                    # fails if it is out of date
//
// Everything here is COPIED from src/styles/ and src/components/, never
// retyped, so the file cannot drift: the check regenerates it and compares.
// It exists because a guide that says "use .flow" without shipping `.flow` is
// unusable by anyone who cannot read the repo (found by handing BRAND-GUIDE.md
// and brand-tokens.json to an agent with no repo access and reading what it
// had to guess).
import { readFileSync, writeFileSync } from 'node:fs';
import prettier from 'prettier';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8').trim();
export const OUT = 'brand/tokens/odd.css';

/** One rule (or at-rule block) from a stylesheet, by its selector. */
function block(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`block not found: ${selector}`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unterminated block: ${selector}`);
}

/** The assembled stylesheet, formatted the way the repo formats everything
 *  else — so `npm run format:check` and the drift check agree. */
export async function buildCss() {
  const options = await prettier.resolveConfig(join(ROOT, OUT));
  return prettier.format(assemble(), { ...options, parser: 'css' });
}

function assemble() {
  const global = read('src/styles/global.css');
  // Pill's styles are scoped in the component; `:global(x) y` is plain `x y`.
  const pillStyles = read('src/components/primitives/Pill.astro')
    .split('<style>')[1]
    .split('</style>')[0]
    .replace(/:global\(([^)]+)\)/g, '$1')
    .trim();

  return `/*
  ODD — the whole system as one stylesheet.

  GENERATED. Do not edit: run \`node brand/tokens/build-css.mjs\`.
  Everything below is copied verbatim from the website, which is the source of
  truth: src/styles/tokens.css, typography.css, layout.css, motion.css, the
  base rules from global.css, and Pill.astro's own styles.

  Use it when you are building something ODD outside this repository — a
  standalone page, a prototype, an email, an agent with no repo access. Drop it
  in, then:

    <body>                     Ink ground, Gabarito, the desktop scale
      <div class="grain">      optional: the film-grain layer (aria-hidden)
      <section>                owns its own half of the section gap
        <div class="wrap flow"> container + "the parent owns the space"
          <div class="section-head">
            <p class="eyebrow">What ODDfest is</p>
            <h2>One shared week, made by Helsinki's creative communities.</h2>
          </div>
          <p>…</p>
          <a class="pill pill-solid" href="…">Submit an event idea</a>

  Type takes one of five roles and nothing else:

    font: var(--text-heading); letter-spacing: var(--tracking-heading);

  Fonts are in brand/fonts/ (SIL OFL 1.1); this file assumes the families
  "Forta" and "Gabarito" are available — @font-face them yourself, or use the
  fallbacks already in --font-display / --font-body.

  The light theme (ODDspace, print, any Paper surface) is one class on the
  element that owns the ground: <body class="theme-light">.
*/

${read('src/styles/tokens.css')}

${read('src/styles/typography.css')}

${read('src/styles/layout.css')}

${read('src/styles/motion.css')}

/* ---------------------------------------------------------------- base --
   From src/styles/global.css: the desktop root scale, the page ground, the
   keyboard focus ring and the grain layer. */

${block(global, 'html {')}

${block(global, 'body {')}

${block(global, 'a {')}

${block(global, 'a:focus-visible,')}

${block(global, '.grain {')}
${block(global, '@media (prefers-reduced-motion: no-preference) {\n  .grain')}
${block(global, '@keyframes grain {')}

${block(global, '.sr-only {')}

/* ---------------------------------------------------------------- pill --
   From src/components/primitives/Pill.astro. The site's one button:
   <a class="pill pill-solid">, pill-outline, or pill-ticket. */

${pillStyles}
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(join(ROOT, OUT), await buildCss());
  console.log(OUT);
}
