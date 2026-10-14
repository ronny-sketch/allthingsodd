// node --test worker/video-range.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker, { parseRange } from './video-range.js';

test('parses the ranges browsers send', () => {
  assert.deepEqual(parseRange('bytes=0-1', 100), [0, 1]); // Safari's probe
  assert.deepEqual(parseRange('bytes=0-', 100), [0, 99]); // Chrome, Firefox
  assert.deepEqual(parseRange('bytes=40-', 100), [40, 99]); // a seek
  assert.deepEqual(parseRange('bytes=90-500', 100), [90, 99]);
  assert.deepEqual(parseRange('bytes=-10', 100), [90, 99]);
  assert.equal(parseRange(null, 100), null);
  assert.equal(parseRange('bytes=0-1,5-6', 100), null);
  assert.equal(parseRange('bytes=100-', 100), 'invalid');
});

const bytes = Uint8Array.from({ length: 1000 }, (_, i) => i % 251);
const env = {
  ASSETS: {
    async fetch() {
      // Several chunks, as the asset store streams them.
      const body = new ReadableStream({
        start(c) {
          for (let i = 0; i < bytes.length; i += 128) c.enqueue(bytes.subarray(i, i + 128));
          c.close();
        },
      });
      return new Response(body, {
        headers: { 'X-Asset-Size': '1000', 'Content-Type': 'video/mp4' },
      });
    },
  },
};
const get = (range) =>
  worker.fetch(
    new Request('https://x/video/a.mp4', { headers: range ? { Range: range } : {} }),
    env,
  );

test('answers a range with 206 and exactly those bytes', async () => {
  const res = await get('bytes=300-649');
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('Content-Range'), 'bytes 300-649/1000');
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), bytes.slice(300, 650));
});

test('sends the whole file, marked as rangeable, when no range is asked for', async () => {
  const res = await get();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Accept-Ranges'), 'bytes');
  assert.equal((await res.arrayBuffer()).byteLength, 1000);
});

test('answers "bytes=0-" with 206 and the whole file', async () => {
  const res = await get('bytes=0-');
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('Content-Range'), 'bytes 0-999/1000');
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), bytes);
});

test('refuses a range past the end with 416', async () => {
  assert.equal((await get('bytes=5000-')).status, 416);
});
