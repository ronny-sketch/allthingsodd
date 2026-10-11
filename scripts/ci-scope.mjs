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

// The content lane (2026-10-05, narrowed and made a lane of its own
// 2026-10-11). A change made only of these files skips the browser suite
// AND the separate `checks` job: the deploy job validates and publishes in
// one go (~2 min from push to live; ci.yml's deploy job lists what it
// runs). What still guards it: the build parses every entry against the
// Zod schema in src/content.config.ts (malformed JSON or a wrong field type
// fails it), CloudCannon's config, photo credits, the identity check, and
// scripts/check-links.mjs on the exact build being published. The ceiling:
// copy long enough to break a layout, or wording the editorial/identity
// specs guard, surfaces at the nightly sweep, not before it is live.
//
// An allowlist of exact files, not a directory: an image or a script that
// lands under src/content/ is not copy. Most of Aki's and CloudCannon's
// edits land here.
const CONTENT_ONLY = /^src\/content\/(pages|site)\/[a-z0-9-]+\.json$/;

// Content files that are also wiring, so they keep the browser suite:
// - oddference.json: `syncSlug` hands a ticket card to the live ticket
//   backend's catalog and checkout (src/scripts/oddference-tickets.ts).
// - oddspace-venue.json: rate `id`s travel as `?offer=` into the booking and
//   work enquiry forms, and `price`/`vatRate` feed the calculator's sums.
// - oddspace-event-info-pack.json: the booking form's SPACE_INFO repeats its
//   capacities; booking-enquiry.spec.ts fails if the two drift apart.
const WIRED = [
  'src/content/pages/oddference.json',
  'src/content/pages/oddspace-venue.json',
  'src/content/pages/oddspace-event-info-pack.json',
];

const isContent = (f) =>
  DOCS_ONLY.some((r) => r.test(f)) || (CONTENT_ONLY.test(f) && !WIRED.includes(f));

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
  // Docs used to be a tier of their own; it behaved exactly like content.
  if (files.every(isContent)) return { mode: 'content', projects: '', browsers: 'chromium' };
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
  eq(['docs/deployment.md'], 'content');
  eq(['README.md', 'docs/architecture.md'], 'content');
  eq(['src/pages/index.astro'], 'fast');
  eq(['src/content/pages/about.json'], 'content');
  eq(['src/content/site/global.json'], 'content');
  eq(['src/content/pages/index.json', 'docs/editing.md'], 'content');
  // Not copy, although it sits under src/content/.
  eq(['src/content/pages/hero.jpg'], 'fast');
  eq(['src/content/pages/helpers.ts'], 'fast');
  // Content that is also wiring (tickets, booking form) keeps the browser suite.
  eq(['src/content/pages/oddference.json'], 'fast');
  eq(['src/content/pages/oddspace-venue.json'], 'fast');
  eq(['src/content/pages/oddspace-event-info-pack.json'], 'fast');
  eq(['src/content/pages/about.json', 'src/content/pages/oddference.json'], 'fast');
  // Copy plus global CSS in one push is a code change.
  eq(['src/content/pages/about.json', 'src/styles/global.css'], 'full');
  // Copy plus a component (Aki's #111) still gets the browser suite.
  eq(['src/content/pages/index.json', 'src/components/sections/BuiltAround.astro'], 'fast');
  eq(['src/content.config.ts'], 'full'); // the schema itself is site-wide
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
