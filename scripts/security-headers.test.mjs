// node --test scripts/security-headers.test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { headersFile, inlineScriptHashes, videoSizes } from './security-headers.mjs';

const sha = (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

test('hashes each executable inline script once, and nothing else', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'headers-'));
  await mkdir(join(dir, 'about'));
  await writeFile(
    join(dir, 'index.html'),
    '<!-- an inline <script> in prose --><script type="module">a()</script><script>b()</script>' +
      '<script type="application/ld+json">{"x":1}</script><script src="/x.js"></script>',
  );
  await writeFile(join(dir, 'about', 'index.html'), '<script type="module">a()</script>');
  assert.deepEqual(await inlineScriptHashes(dir), [sha('a()'), sha('b()')].sort());
});

test('puts the hashes in script-src and frames nowhere', () => {
  const file = headersFile([sha('a()')]);
  assert.match(file, new RegExp(`script-src 'self' [^;]*${sha('a()').replace(/[+/]/g, '\\$&')}`));
  assert.match(file, /frame-ancestors 'none'/);
  assert.match(file, /Strict-Transport-Security: max-age=31536000/);
});

test('refuses a policy longer than Cloudflare accepts', () => {
  assert.throws(() => headersFile(Array(40).fill(sha('x'))), /over 2000/);
});

test("stamps each film with its size for the video Worker's ranges", async () => {
  const dir = await mkdtemp(join(tmpdir(), 'headers-'));
  await mkdir(join(dir, 'video'));
  await writeFile(join(dir, 'video', 'a.mp4'), Buffer.alloc(1234));
  const videos = await videoSizes(dir);
  assert.deepEqual(videos, [['/video/a.mp4', 1234]]);
  assert.match(headersFile([], videos), /\n\/video\/a\.mp4\n {2}X-Asset-Size: 1234\n/);
});
