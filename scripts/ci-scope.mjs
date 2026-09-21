#!/usr/bin/env node
import { readFileSync } from 'node:fs';
// How much of the Playwright matrix does this change actually need?
//
// Every push used to run all 838 tests across seven browser/device projects on
// one runner: ~21 minutes, whether you rewrote the layout or fixed a typo (see
// docs/deployment.md#ci-history, run 35586219666). The matrix isn't wrong — it
// is just priced for site-wide change and charged for every change.
//
// So: read the changed paths and pick a tier. Anything that can alter *every*
// page — a layout, a global stylesheet, a shared component, a client script,
// build config, the test suite itself — still pays full price. A page, a
// content entry or an asset touches one route, so one engine is enough
// (Chromium; the cross-engine sweep still runs nightly and on any site-wide
// change). Docs never reach the browser at all.
//
// Deliberately coarse: `src/components/` counts as site-wide even though most
// components are used on one page, because knowing which is which means
// resolving the import graph, and a wrong "fast" is a regression shipped live.
// Over-testing a component edit is cheap; under-testing one is not.
//
// ponytail: path heuristic, not an import graph. If component edits become the
// common slow case, walk the graph from the changed file instead.

const SITE_WIDE = [
  /^src\/layouts\//,
  /^src\/components\//,
  /^src\/styles\//,
  /^src\/scripts\//,
  /^src\/content\.config\.ts$/,
  /^tests\//,
  /^scripts\//,
  /^playwright\.config\.ts$/,
  /^astro\.config\.mjs$/,
  /^tsconfig\.json$/,
  /^package(-lock)?\.json$/,
  /^\.github\//,
];

// Never rendered into the site, so no browser can regress from them alone.
// `brand/` is NOT here: it feeds /brand-book/ and the token drift check.
const DOCS_ONLY = [/^docs\//, /^\.claude\//, /^[^/]+\.md$/];

const CHROMIUM_ONLY =
  '--project=functional-chromium --project=mobile-motion-chromium ' +
  '--project=mobile-reduced-chromium --project=mobile --project=tablet ' +
  '--project=laptop --project=desktop --project=wide';

export function scope(files) {
  // No file list means we can't tell what changed (first push on a branch, a
  // force push, the nightly run) — assume the worst and run everything.
  if (!files.length) return { mode: 'full', projects: '' };
  if (files.every((f) => DOCS_ONLY.some((r) => r.test(f)))) return { mode: 'docs', projects: '' };
  if (files.some((f) => SITE_WIDE.some((r) => r.test(f)))) return { mode: 'full', projects: '' };
  return { mode: 'fast', projects: CHROMIUM_ONLY };
}

function selfTest() {
  const eq = (files, expected) => {
    const got = scope(files).mode;
    if (got !== expected) {
      throw new Error(`scope(${JSON.stringify(files)}) = ${got}, expected ${expected}`);
    }
  };
  eq([], 'full');
  eq(['docs/deployment.md'], 'docs');
  eq(['README.md', 'docs/architecture.md'], 'docs');
  eq(['src/pages/index.astro'], 'fast');
  eq(['src/content/events/oddfest-2026.md'], 'fast');
  eq(['src/assets/hero.jpg', 'public/favicon.svg'], 'fast');
  eq(['brand/BRAND-GUIDE.md'], 'fast'); // renders at /brand-book/
  eq(['src/layouts/Layout.astro'], 'full');
  eq(['src/components/Header.astro'], 'full');
  eq(['src/styles/global.css'], 'full');
  eq(['package-lock.json'], 'full');
  eq(['.github/workflows/ci.yml'], 'full');
  eq(['playwright.config.ts'], 'full');
  // A docs file rides along with a page edit: the page still decides.
  eq(['docs/editing.md', 'src/pages/about.astro'], 'fast');
  // One site-wide file in a big change outranks everything else.
  eq(['src/pages/about.astro', 'src/styles/global.css'], 'full');
  console.log('ci-scope self-test: all cases pass');
}

if (process.argv[2] === '--self-test') {
  selfTest();
} else {
  const files = readFileSync(0, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const { mode, projects } = scope(files);
  console.log(`mode=${mode}`);
  console.log(`projects=${projects}`);
}
