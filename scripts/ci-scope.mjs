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
// `src/components/` was site-wide in the first version of this file, on the
// reasoning that you cannot tell which page a component reaches without
// resolving the import graph. That reasoning does not survive contact with
// what the tiers actually do: **neither tier narrows by route**. The fast tier
// runs every test on every page and drops only the non-Chromium engines. So
// the real question a component edit asks is "can this break webkit but not
// chromium?", not "which page did I just touch?".
//
// That risk is real — components carry scoped <style> — but it is the same
// risk `src/pages/` already takes, and those pages carry <style> blocks too.
// Global CSS (`src/styles/`) and layouts stay site-wide, which is where
// cross-cutting rendering actually lives. A component-only engine regression
// now surfaces at the nightly sweep instead of pre-merge: up to a day live,
// against ~4 minutes saved on every component edit. Reversible in one line if
// that trade turns out wrong.

const SITE_WIDE = [
  /^src\/layouts\//,
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

// `mobile` is NOT in this list although it is a visual project: it is
// `devices['iPhone 13']`, which is WebKit. With only Chromium's OS packages
// installed it fails at browser start (libevent missing — PR #78, 2026-09-21).
// The nightly full run still covers it.
const CHROMIUM_ONLY =
  '--project=functional-chromium --project=mobile-motion-chromium ' +
  '--project=mobile-reduced-chromium --project=tablet ' +
  '--project=laptop --project=desktop --project=wide';

// Installing an engine this run will never launch costs ~30s on every shard.
const ALL_ENGINES = 'chromium webkit firefox';

export function scope(files) {
  // No file list means we can't tell what changed (first push on a branch, a
  // force push, the nightly run) — assume the worst and run everything.
  if (!files.length) return { mode: 'full', projects: '', browsers: ALL_ENGINES };
  if (files.every((f) => DOCS_ONLY.some((r) => r.test(f))))
    return { mode: 'docs', projects: '', browsers: 'chromium' };
  if (files.some((f) => SITE_WIDE.some((r) => r.test(f))))
    return { mode: 'full', projects: '', browsers: ALL_ENGINES };
  return { mode: 'fast', projects: CHROMIUM_ONLY, browsers: 'chromium' };
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
  eq(['src/components/Header.astro'], 'fast'); // engines, not routes — see the header
  eq(['src/styles/global.css'], 'full');
  eq(['package-lock.json'], 'full');
  eq(['.github/workflows/ci.yml'], 'full');
  eq(['playwright.config.ts'], 'full');
  // A docs file rides along with a page edit: the page still decides.
  eq(['docs/editing.md', 'src/pages/about.astro'], 'fast');
  // A component edit alongside global CSS is still site-wide.
  eq(['src/components/Header.astro', 'src/styles/global.css'], 'full');
  // One site-wide file in a big change outranks everything else.
  eq(['src/pages/about.astro', 'src/styles/global.css'], 'full');
  // The browser install list must never be narrower than the engines the
  // chosen projects will launch, or the run fails at browser start.
  const engines = (files) => scope(files).browsers;
  if (engines(['src/styles/global.css']) !== ALL_ENGINES)
    throw new Error('full tier must install all engines');
  if (engines(['src/pages/index.astro']) !== 'chromium')
    throw new Error('fast tier should install chromium only');
  if (/--project=mobile(\s|$)/.test(scope(['src/pages/index.astro']).projects))
    throw new Error('fast tier must not run the WebKit `mobile` project');
  if (engines([]) !== ALL_ENGINES) throw new Error('unknown diff must install all engines');
  console.log('ci-scope self-test: all cases pass');
}

if (process.argv[2] === '--self-test') {
  selfTest();
} else {
  const files = readFileSync(0, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const { mode, projects, browsers } = scope(files);
  console.log(`mode=${mode}`);
  console.log(`projects=${projects}`);
  console.log(`browsers=${browsers}`);
}
