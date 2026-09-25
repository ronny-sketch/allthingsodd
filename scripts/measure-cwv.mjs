// Core Web Vitals against a running preview server, with a budget.
//
//   npm run preview          # or: npx astro preview --background
//   node scripts/measure-cwv.mjs
//   node scripts/measure-cwv.mjs --base https://allthingsodd.co
//   node scripts/measure-cwv.mjs --json
//
// Why this exists (2026-09-21). The homepage shipped an LCP of 4.2s and
// /tickets a CLS of 0.26 — both well outside the budget below — for an
// unknown length of time, and nothing in this repo could see either one.
// `npm run build` is fast, all twelve Playwright projects pass, and no test
// here measures a paint or a shift.
//
// It also exists because the first diagnosis was wrong, and only a
// measurement caught that. The homepage had TWO independent causes and
// fixing either one alone changed nothing:
//
//   .mosaic-cell { opacity: 0 } ...... disqualified all twenty eager,
//                                     preloaded mosaic images from being LCP
//                                     candidates at first paint
//   the ambient swap's single 500px
//   src, with no srcset ............. gave each swapped-in photo a larger
//                                     intrinsic size than the initial cells
//                                     rendered, and LCP moves to any larger
//                                     paint until the first interaction
//
// Measured, all four combinations: 4184ms / 4280ms / 4220ms / 152ms. Only
// the last one has both fixes. A confident one-line explanation would have
// shipped three quarters of a fix and a comment claiming victory.
//
// So this is deliberately a measurement, not a lint. It reports what a
// browser actually observes, and it fails on a budget rather than on a
// prediction. Run it before AND after anything that touches the hero, the
// mosaic, an image, a font, a render-blocking asset, or a block of content
// injected after load.
//
// It is NOT in `npm run quality`: it needs a preview server and a browser,
// takes ~50s, and its absolute numbers move with the machine it runs on.
// Treat the pass/fail as meaningful and the milliseconds as relative.
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = flag('base', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321').replace(
  /\/$/,
  '',
);
const JSON_OUT = args.includes('--json');

// AGENTS.md's "Performance & accessibility requirements": LCP <= 2.5s,
// CLS <= 0.1. INP needs a real interaction and is not measured here; total
// long-task time is reported instead as the honest proxy it is, and is not
// part of the budget.
const BUDGET = { lcpMs: 2500, cls: 0.1 };

const ROUTES = [
  '/',
  '/oddference/',
  '/oddspace/',
  '/oddspace/venue/',
  '/tickets/',
  '/work-with-odd/',
  '/contact/',
  '/oddfest/',
];

// Long enough to outlast anything on a timer. The mosaic swaps its first
// image at 2500ms (4000ms until 2026-09-24), and a measurement window
// shorter than that would have reported the homepage as passing while a
// real visitor saw 4.3s.
const SETTLE_MS = 6000;

async function measure(page, route) {
  await page.addInitScript(() => {
    const w = window;
    w.__cwv = { lcp: 0, lcpUrl: '', cls: 0, longTasks: 0, longTaskMs: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        w.__cwv.lcp = entry.startTime;
        w.__cwv.lcpUrl = entry.url || entry.element?.tagName || '';
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) w.__cwv.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        w.__cwv.longTasks += 1;
        w.__cwv.longTaskMs += entry.duration;
      }
    }).observe({ type: 'longtask', buffered: true });
  });

  const transfer = { bytes: 0, requests: 0 };
  const onResponse = async (res) => {
    transfer.requests += 1;
    const len = Number(res.headers()['content-length'] ?? 0);
    if (Number.isFinite(len)) transfer.bytes += len;
  };
  page.on('response', onResponse);

  await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(SETTLE_MS);
  const cwv = await page.evaluate(() => window.__cwv);
  page.off('response', onResponse);

  return { route, ...cwv, ...transfer };
}

const browser = await chromium.launch();
const results = [];
for (const route of ROUTES) {
  // A fresh context per route: a warm cache measures the second visit, and
  // the first is the one that decides whether anyone stays.
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  try {
    results.push(await measure(page, route));
  } catch (err) {
    results.push({ route, error: String(err.message ?? err) });
  }
  await context.close();
}
await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ base: BASE, budget: BUDGET, results }, null, 2));
} else {
  console.log(`\nCore Web Vitals — ${BASE}`);
  console.log(`Budget: LCP <= ${BUDGET.lcpMs}ms, CLS <= ${BUDGET.cls}\n`);
  console.log(
    ['route', 'LCP', 'CLS', 'long tasks', 'reqs', 'KB'].map((h) => h.padEnd(12)).join('') + '\n',
  );
  for (const r of results) {
    if (r.error) {
      console.log(`${r.route.padEnd(24)} ERROR ${r.error}`);
      continue;
    }
    const lcp = `${Math.round(r.lcp)}ms`;
    const cls = r.cls.toFixed(4);
    console.log(
      [
        r.route.padEnd(24),
        (r.lcp > BUDGET.lcpMs ? `${lcp} FAIL` : lcp).padEnd(14),
        (r.cls > BUDGET.cls ? `${cls} FAIL` : cls).padEnd(14),
        `${r.longTasks} (${Math.round(r.longTaskMs)}ms)`.padEnd(14),
        String(r.requests).padEnd(8),
        String(Math.round(r.bytes / 1024)),
      ].join(''),
    );
    if (r.lcpUrl) console.log(`${''.padEnd(24)}LCP element: ${r.lcpUrl}`);
  }
}

const failures = results.filter((r) => !r.error && (r.lcp > BUDGET.lcpMs || r.cls > BUDGET.cls));
if (failures.length) {
  console.error(
    `\n${failures.length} route(s) over budget: ${failures.map((f) => f.route).join(', ')}`,
  );
  process.exit(1);
}
console.log('\nAll routes within budget.');
