// Astro integration: writes dist/_headers, which Cloudflare's static assets
// (wrangler.jsonc) attach to every response. Surge ignores the file.
//
// The Content-Security-Policy allows inline scripts by SHA-256 only, so an
// inline script that this build did not produce runs nowhere. The hashes are
// computed from the HTML being deployed, which is why they cannot go stale.
// Inline STYLES stay allowed: 200+ style="" attributes carry layout values,
// and injected CSS cannot run code.
//
// It also stamps each film with its size (X-Asset-Size): the asset store does
// not tell worker/video-range.js how long a file is, and a range answer needs it.

import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every origin outside the site that a page loads from or talks to. A new
// third party goes in here first, or browsers will refuse it.
// Stripe: docs.stripe.com/security/guide#content-security-policy (Stripe.js,
// embedded Checkout, Link). GA4: Google's tag platform CSP guide. Turnstile:
// challenges.cloudflare.com. Forms API: *.ronny-507.workers.dev (production
// and staging Workers). Instagram wall: feeds.behold.so plus images (https:).
const POLICY = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://www.googletagmanager.com',
    'https://js.stripe.com',
    'https://*.js.stripe.com',
    'https://checkout.stripe.com',
    'https://challenges.cloudflare.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'"],
  'media-src': ["'self'"],
  'connect-src': [
    "'self'",
    'https://*.ronny-507.workers.dev',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
    'https://*.g.doubleclick.net',
    'https://*.google.com',
    'https://api.stripe.com',
    'https://checkout.stripe.com',
    'https://link.com',
    'https://*.link.com',
    'https://feeds.behold.so',
    'https://challenges.cloudflare.com',
  ],
  'frame-src': [
    'https://js.stripe.com',
    'https://*.js.stripe.com',
    'https://hooks.stripe.com',
    'https://checkout.stripe.com',
    'https://link.com',
    'https://*.link.com',
    'https://challenges.cloudflare.com',
  ],
  'form-action': ["'self'", 'https://oddfest.beehiiv.com'],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

const HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

// Cloudflare's own limit for one line of _headers.
// ponytail: one site-wide policy, so every inline script costs ~52 characters
// of it. 12 now (1,611 chars); about 19 fit. Past that the build fails here,
// and the fix is fewer inline scripts or a per-page <meta> policy.
const MAX_LINE = 2000;

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => join(e.parentPath, e.name));
}

/** SHA-256 sources for every executable inline script in the build. */
export async function inlineScriptHashes(dir) {
  const hashes = new Set();
  for (const file of await htmlFiles(dir)) {
    // Comments first: one in <head> mentions "<script>" in its prose.
    const html = (await readFile(file, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\ssrc=/.test(attrs)) continue;
      // Data blocks (JSON-LD) are not scripts and CSP does not apply to them.
      if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
      hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    }
  }
  return [...hashes].sort();
}

/** [url path, bytes] for every file under dist/video. */
export async function videoSizes(dir) {
  const entries = await readdir(join(dir, 'video'), { withFileTypes: true }).catch(() => []);
  const files = entries.filter((e) => e.isFile());
  return Promise.all(
    files.map(async (e) => [`/video/${e.name}`, (await stat(join(dir, 'video', e.name))).size]),
  );
}

export function headersFile(scriptHashes, videos = []) {
  const policy = Object.entries(POLICY)
    .map(([name, values]) =>
      [name, ...(name === 'script-src' ? [...values, ...scriptHashes] : values)].join(' '),
    )
    .join('; ');
  const lines = [
    '/*',
    ...Object.entries(HEADERS).map(([k, v]) => `  ${k}: ${v}`),
    `  Content-Security-Policy: ${policy}`,
    '',
    // Content-hashed file names: safe to cache for a year.
    '/_astro/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    ...videos.flatMap(([path, size]) => [path, `  X-Asset-Size: ${size}`, '']),
  ];
  const long = lines.find((l) => l.length > MAX_LINE);
  if (long) throw new Error(`_headers line is ${long.length} characters, over ${MAX_LINE}`);
  return lines.join('\n');
}

export default function securityHeaders() {
  return {
    name: 'security-headers',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const hashes = await inlineScriptHashes(out);
        const videos = await videoSizes(out);
        await writeFile(join(out, '_headers'), headersFile(hashes, videos));
        logger.info(
          `_headers written, ${hashes.length} inline script hashes, ${videos.length} film sizes`,
        );
      },
    },
  };
}
