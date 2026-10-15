// The hop into Canva for a PDF from canva.mjs, and the check after it.
//
//   node canva-hop.mjs up <file.pdf>
//     puts the PDF on a random Surge address and prints its link, for the Canva connector's
//     import-design-from-url (Canva imports only from a public link; its upload tool makes a
//     library file, not a design). Surge serves .PDF, not .pdf. Your own Surge account
//     (`npx surge login` once): never Ronny's, it also serves allthingsodd.co.
//   node canva-hop.mjs down <domain>
//     takes it off again: straight after the import, the deck is not public.
//   node canva-hop.mjs check <ours.pdf> <canva.pdf> <out-dir>
//     compares the design exported back out of Canva (export-design, pdf) with ours: pages,
//     fonts (only Forta and Gabarito, or Canva substituted one), the words on every page, and
//     sheets of both side by side (<out-dir>/sheet-N.png) to look at. Canva rebuilds the text
//     boxes, so only a look shows a box that moved.
//
// Needs Node, the repository's Playwright (npx playwright install chromium) and poppler
// (brew install poppler).
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';

const [cmd, a, b, c] = process.argv.slice(2);
const run = (bin, args) =>
  execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const surge = (args) => run('npx', ['--yes', 'surge', ...args]);

if (cmd === 'up') {
  const dir = mkdtempSync(join(tmpdir(), 'odd-hop-'));
  const domain = `odd-${randomBytes(8).toString('hex')}.surge.sh`;
  const name = `${randomBytes(10).toString('hex')}.PDF`;
  copyFileSync(resolve(a), join(dir, name));
  surge([dir, domain]);
  rmSync(dir, { recursive: true });
  const url = `https://${domain}/${name}`;
  const code = run('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url]);
  if (code !== '200') throw new Error(`canva-hop: ${url} answers ${code}`);
  console.log(url);
} else if (cmd === 'down') {
  surge(['teardown', a]);
  console.log(`${a} is down`);
} else if (cmd === 'check') {
  const pages = (f) => +run('pdfinfo', [f]).match(/^Pages:\s+(\d+)/m)[1];
  const n = pages(a);
  console.log(`pages: ${n} ours, ${pages(b)} Canva`);
  const fonts = [
    ...new Set(
      run('pdffonts', [b])
        .split('\n')
        .slice(2)
        .filter(Boolean)
        .map((l) => l.split(/\s+/)[0].replace(/^[A-Z]+\+/, '')),
    ),
  ];
  const odd = fonts.filter((f) => !/^(Forta|Gabarito-(Regular|SemiBold))$/.test(f));
  console.log(
    `fonts in Canva's file: ${fonts.join(', ')}${odd.length ? `  ⚑ substituted: ${odd.join(', ')}` : ''}`,
  );
  const words = (f, p) =>
    run('pdftotext', ['-f', `${p}`, '-l', `${p}`, f, '-'])
      .split(/[\s ]+/)
      .filter(Boolean);
  for (let p = 1; p <= n; p++) {
    const left = words(b, p);
    const lost = [];
    for (const w of words(a, p)) {
      const i = left.indexOf(w);
      if (i < 0) lost.push(w);
      else left.splice(i, 1);
    }
    if (lost.length || left.length)
      console.log(
        `  ⚑ page ${p}: missing in Canva [${lost.join(' ')}], only in Canva [${left.join(' ')}]`,
      );
  }
  const out = resolve(c);
  mkdirSync(out, { recursive: true });
  run('pdftoppm', ['-r', '40', '-png', a, join(out, 'ours')]);
  run('pdftoppm', ['-r', '40', '-png', b, join(out, 'canva')]);
  const png = (k) =>
    readdirSync(out)
      .filter((f) => f.startsWith(`${k}-`))
      .sort();
  const [ours, canva] = [png('ours'), png('canva')];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1612, height: 400 } });
  for (let s = 0; s * 4 < n; s++) {
    const rows = ours
      .slice(s * 4, s * 4 + 4)
      .map(
        (f, i) =>
          `<div style="display:flex;gap:12px;margin-bottom:12px"><img src="file://${join(out, f)}" width="800"><img src="file://${join(out, canva[s * 4 + i])}" width="800"></div>`,
      )
      .join('');
    writeFileSync(
      join(out, 'sheet.html'),
      `<body style="margin:0;background:#ff3b30">${rows}</body>`,
    );
    await page.goto(`file://${join(out, 'sheet.html')}`);
    await page.screenshot({ path: join(out, `sheet-${s + 1}.png`), fullPage: true });
  }
  await browser.close();
  for (const f of [...ours, ...canva, 'sheet.html']) rmSync(join(out, f));
  console.log(`sheets (ours left, Canva right): ${join(out, 'sheet-*.png')}`);
} else {
  console.log(
    'node canva-hop.mjs up <file.pdf> | down <domain> | check <ours.pdf> <canva.pdf> <out-dir>',
  );
  process.exit(1);
}
