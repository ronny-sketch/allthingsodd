#!/usr/bin/env node
import {
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// Every internal link in the built site points at a page, file or anchor that
// exists. Static, over dist/, no browser (2026-10-11).
//
// tests/functional/site-integrity.spec.ts asserts the same thing in a real
// browser, but the content lane (scripts/ci-scope.mjs) deploys copy edits
// without the browser suite, and an edited `href` is exactly what a copy edit
// can break. So this runs before every publish, in seconds. It is stricter in
// one way — it reads every built page, not a hand-kept route list — and weaker
// in one: links and ids that only client-side JavaScript creates are invisible
// to it. The browser test still covers those on every code change and nightly.
//
// Resolves a path the way Surge serves it: `/x/` -> x/index.html; `/x` ->
// the file x, x.html or x/index.html. Query strings are ignored; external,
// protocol-relative, mailto: and tel: links are not this site's to check.

export function brokenLinks(dist) {
  const pages = readdirSync(dist, { recursive: true }).filter((f) => f.endsWith('.html'));
  const html = new Map(pages.map((f) => [f, readFileSync(join(dist, f), 'utf8')]));
  const ids = new Map();
  const idsOf = (file) => {
    if (!ids.has(file))
      ids.set(file, new Set([...html.get(file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    return ids.get(file);
  };
  const resolve = (path) => {
    const p = decodeURI(path).replace(/^\//, '');
    const candidates =
      p === '' || p.endsWith('/') ? [`${p}index.html`] : [p, `${p}.html`, `${p}/index.html`];
    return candidates.find((c) => existsSync(join(dist, c)) && statSync(join(dist, c)).isFile());
  };

  const broken = [];
  for (const [file, src] of html) {
    for (const [, raw] of src.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
      const href = raw.replaceAll('&amp;', '&');
      if (!/^[/#]/.test(href) || href.startsWith('//')) continue;
      const [beforeHash, hash = ''] = href.split('#');
      const path = beforeHash.split('?')[0];
      const target = path ? resolve(path) : file;
      if (!target) broken.push(`${file}: "${href}" -> no such page or file`);
      else if (hash && html.has(target) && !idsOf(target).has(decodeURIComponent(hash)))
        broken.push(`${file}: "${href}" -> no id="${hash}" on ${target}`);
    }
  }
  return [...new Set(broken)];
}

function selfTest() {
  const dist = mkdtempSync(join(tmpdir(), 'check-links-'));
  mkdirSync(join(dist, 'about'));
  writeFileSync(join(dist, 'logo.png'), '');
  writeFileSync(join(dist, 'about', 'index.html'), '<h2 id="team">Team</h2>');
  writeFileSync(
    join(dist, 'index.html'),
    [
      '<a href="/about">ok</a><a href="/about/">ok</a><a href="/about/#team">ok</a>',
      '<a class="x" href="/about?offer=a&amp;lane=b">ok</a><a href="/logo.png">ok</a>',
      '<a href="#top">self</a><b id="top"></b><a href="#">ok</a>',
      '<a href="https://example.com/x">ext</a><a href="//cdn.example.com">ext</a><a href="mailto:a@b.c">ext</a>',
      '<a href="/missing">bad</a><a href="/about/#nope">bad</a><a href="#gone">bad</a>',
    ].join('\n'),
  );
  const got = brokenLinks(dist).map((l) => l.split('"')[1]);
  const want = ['/missing', '/about/#nope', '#gone'];
  if (JSON.stringify(got) !== JSON.stringify(want))
    throw new Error(
      `check-links self-test: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`,
    );
  console.log('check-links self-test: all cases pass');
}

if (process.argv[2] === '--self-test') {
  selfTest();
} else {
  const broken = brokenLinks(process.argv[2] ?? 'dist');
  if (broken.length) {
    console.error(`${broken.length} broken internal link(s):\n  ${broken.join('\n  ')}`);
    process.exit(1);
  }
  console.log('check-links: every internal link resolves');
}
