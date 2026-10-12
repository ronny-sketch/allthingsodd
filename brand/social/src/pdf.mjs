// LinkedIn document posts are PDFs: one page per rendered frame, same 1080×1350.
//   node pdf.mjs --out=<dir with the jpgs> li-oddfest li-oddference …   → <dir>/<name>.pdf
// A deck takes only its own numbered frames (li-oddfest-1.jpg …), never a longer name's.
import { readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
const dir = process.argv
  .find((a) => a.startsWith('--out='))
  ?.slice(6)
  .replace(/^~/, process.env.HOME);
const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = dir;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of names) {
  const files = readdirSync(dir)
    .filter((f) => new RegExp(`^${name}-\\d+\\.jpg$`).test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>@page{size:1080px 1350px;margin:0}html,body{margin:0}img{display:block;width:1080px;height:1350px;page-break-after:always}</style></head><body>${files.map((f) => `<img src="file://${join(dir, f)}">`).join('')}</body></html>`;
  const tmp = join(dir, `.pdf-${name}.html`);
  writeFileSync(tmp, html);
  await page.goto(`file://${tmp}`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: join(out, `${name}.pdf`),
    width: '1080px',
    height: '1350px',
    printBackground: true,
    preferCSSPageSize: true,
  });
  rmSync(tmp);
  console.log(`${name}.pdf`, files.length, 'pages');
}
await browser.close();
