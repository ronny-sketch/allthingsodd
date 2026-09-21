#!/usr/bin/env node
// Fails the build when a file lands in public/ with an extension the
// production host refuses to serve.
//
// Right now that list has exactly one entry: lowercase `.pdf`.
//
// Surge (this site's production host — see docs/deployment.md) answers 404
// for any path ending in lowercase `.pdf`, whatever the file contains. It is
// the extension, not the bytes: verified 2026-09-21 on a throwaway project
// with the same 30 KB file published four ways.
//
//   /root.pdf      404   a real PDF
//   /fake.pdf      404   the text "not a pdf"
//   /upper.PDF     200   the same real PDF, uppercase extension,
//                        served as content-type: application/pdf
//   /asbin.dat     200   the same real PDF, renamed
//
// This shipped as a silent regression: the three Sturenportti safety
// documents were committed, built into dist/, counted in Surge's own "575
// files" upload summary, and still 404'd on allthingsodd.co. Nothing in the
// build, the tests or the deploy's own verification could see it — the
// functional suite runs against `astro preview`, which serves lowercase
// `.pdf` perfectly well. Only production disagrees, so only a check on the
// filename catches it.
//
// If the site ever leaves Surge, delete this file rather than working
// around it.
import { execFileSync } from 'node:child_process';

const REFUSED = [
  {
    pattern: /\.pdf$/,
    fix: 'rename it to .PDF (uppercase) — Surge serves that, with content-type: application/pdf',
  },
];

const tracked = execFileSync('git', ['ls-files', 'public'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const failures = tracked.flatMap((file) =>
  REFUSED.filter((r) => r.pattern.test(file)).map((r) => ({ file, fix: r.fix })),
);

if (failures.length === 0) {
  console.log(`served-extensions: ${tracked.length} file(s) in public/, none refused by the host`);
  process.exit(0);
}

console.error(`\nserved-extensions: ${failures.length} file(s) production would 404\n`);
for (const f of failures) {
  console.error(`  ${f.file}`);
  console.error(`    ${f.fix}\n`);
}
process.exit(1);
