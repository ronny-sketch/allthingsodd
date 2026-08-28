import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // CI only — the lightweight `astro preview` static server occasionally
  // 502s a single request under the full concurrent load of every project
  // running at once (reproduced directly: 2 consecutive full local runs,
  // one clean, one with exactly one transient 502 on one route; the same
  // test passed immediately on an isolated re-run). Not masking a real bug —
  // local runs keep 0 retries, so a genuine regression still fails loudly
  // during development; this only absorbs the concurrency-driven flake that
  // blocked a real CI deploy on 2026-08-28 with zero retries configured.
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4321',
    screenshot: 'only-on-failure',
    // The mosaic Ken-Burns pans, hero tilt, filmstrip drift, and marquees are
    // JS rAF loops, not CSS @keyframes, so Playwright's `animations: 'disabled'`
    // can't freeze them. They already self-skip under prefers-reduced-motion
    // (see src/scripts/*), so forcing it here is what makes full-page
    // screenshots deterministic — not a workaround, the real a11y code path.
    // `as const` — this project's @playwright/test .d.ts doesn't surface
    // `reducedMotion` on the top-level `use` type (playwright-core's own
    // BrowserContextOptions has it fine; astro check's TS resolution of the
    // re-exported test types doesn't pick it up). Runtime supports it.
    ...({ reducedMotion: 'reduce' } as const),
  },
  // No `webServer` block: this project's `astro dev`/`astro preview` run as a
  // managed background daemon (see CLAUDE.md) rather than a foreground process
  // Playwright can own the lifecycle of. Start `npm run preview` yourself
  // before `npm test` — see docs/deployment.md#local-preview. CI starts and
  // stops it explicitly as separate workflow steps instead of via this config.
  projects: [
    // Visual regression + per-route console-error check — one representative
    // engine per breakpoint (see tests/visual/pages.spec.ts).
    { name: 'mobile', testDir: './tests/visual', use: { ...devices['iPhone 13'] } },
    {
      name: 'tablet',
      testDir: './tests/visual',
      use: { viewport: { width: 834, height: 1194 } },
    },
    {
      name: 'laptop',
      testDir: './tests/visual',
      use: { viewport: { width: 1366, height: 900 } },
    },
    {
      name: 'desktop',
      testDir: './tests/visual',
      use: { viewport: { width: 1920, height: 1080 } },
    },
    { name: 'wide', testDir: './tests/visual', use: { viewport: { width: 2560, height: 1440 } } },

    // Functional/interaction smoke test — real cross-browser QA (nav, mobile
    // menu, keyboard, 404 routing) across all three engines, separate from
    // the visual matrix above since these don't screenshot-compare and only
    // need one viewport each (see tests/functional/interactions.spec.ts).
    {
      name: 'functional-chromium',
      testDir: './tests/functional',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'functional-firefox',
      testDir: './tests/functional',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'functional-webkit',
      testDir: './tests/functional',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
