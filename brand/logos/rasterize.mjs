// PNG exports of every SVG in ./svg, for tools that cannot place an SVG
// (Office, Keynote, most social schedulers). Run after build.py:
//
//   node brand/logos/rasterize.mjs
//
// Uses the website's own Playwright Chromium, so it needs `npm ci` at the
// repo root and nothing else. Logos render 480px tall on a transparent
// ground (roughly 1500-3100px wide); the app icon renders at 512 x 512.
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const svgDir = join(here, 'svg');
const pngDir = join(here, 'png');
mkdirSync(pngDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of readdirSync(svgDir).filter((f) => f.endsWith('.svg'))) {
  const svg = readFileSync(join(svgDir, file), 'utf8');
  const [, , , w, h] = svg.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).map(Number);
  const height = file === 'odd-icon.svg' ? 512 : 480;
  const width = Math.round((w / h) * height);
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`,
  );
  await page.screenshot({ path: join(pngDir, file.replace('.svg', '.png')), omitBackground: true });
  console.log(`brand/logos/png/${file.replace('.svg', '.png')}  ${width}x${height}`);
}
await browser.close();
