// Serves /video/* with HTTP Range support. Cloudflare's static assets answer
// a Range request with 200 and the whole file, and Safari will not play a
// video from a server that does that, so on an iPhone every film on the
// site would stay blank. Nothing else reaches this script:
// wrangler.jsonc sets assets.run_worker_first to ["/video/*"].

/** [start, end] inclusive, null for "send the whole file", or 'invalid'. */
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!m || (m[1] === '' && m[2] === '')) return null; // absent, or several ranges
  let start, end;
  if (m[1] === '') {
    start = Math.max(size - Number(m[2]), 0); // "bytes=-500": the last 500
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start >= size || start > end ? 'invalid' : [start, end];
}

/** The bytes [start, end] of a stream, without copying a chunk. */
function slice(body, start, end) {
  let pos = 0;
  return body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        const from = Math.max(start - pos, 0);
        const to = Math.min(end + 1 - pos, chunk.length);
        pos += chunk.length;
        if (from < to) controller.enqueue(chunk.subarray(from, to));
        if (pos > end) controller.terminate();
      },
    }),
  );
}

export default {
  async fetch(request, env) {
    // The asset store gets everything but the Range, so a revalidation
    // (If-None-Match) still comes back 304.
    const ask = new Headers(request.headers);
    ask.delete('Range');
    const asset = await env.ASSETS.fetch(
      new Request(request.url, { method: request.method, headers: ask }),
    );
    // The asset store sends no Content-Length to a Worker, so the build puts
    // each film's size in _headers (scripts/security-headers.mjs).
    const size = Number(asset.headers.get('X-Asset-Size'));
    const headers = new Headers(asset.headers);
    headers.delete('X-Asset-Size');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('X-Content-Type-Options', 'nosniff');
    if (asset.status !== 200 || !size)
      return new Response(asset.body, { status: asset.status, headers });

    const range = parseRange(request.headers.get('Range'), size);
    if (range === null) return new Response(asset.body, { headers });
    if (range === 'invalid') {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }

    const [start, end] = range;
    const length = end - start + 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(length));
    if (length === size) return new Response(asset.body, { status: 206, headers }); // "bytes=0-": no copying
    let body = request.method === 'HEAD' || !asset.body ? null : slice(asset.body, start, end);
    // Workers drop Content-Length from a streamed body unless it is fixed.
    if (body && typeof FixedLengthStream === 'function') {
      body = body.pipeThrough(new FixedLengthStream(length));
    }
    return new Response(body, { status: 206, headers });
  },
};
