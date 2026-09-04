#!/usr/bin/env node
// Fails the build when a retired project identity reappears in a tracked
// file outside a narrow, documented allowlist.
//
// Added 2026-09-04 with the All Things ODD migration. Its counterpart,
// tests/functional/identity-integrity.spec.ts, asserts on the *rendered*
// site; this asserts on the *source*, which is where the old name actually
// crept back last time — a README heading, a package name, a deploy command
// naming the old GitHub slug. None of those are visible to a browser test,
// and all of them are what a future contributor reads to learn what this
// project is called.
//
// Design notes, because both are easy to get wrong:
//
//   1. Allowlists are per-file, never a directory glob. `docs/**` would let
//      the old identity quietly reassert itself as the active project name in
//      current documentation — the exact failure this exists to prevent.
//      Every entry names one file and one reason.
//
//   2. Three compound forms are *hostnames*, not this project's identity, and
//      are stripped from each line before the bare-slug rule runs — otherwise
//      the allowlist would have to name every file that legitimately mentions
//      the retired host, which is most of the deployment surface, and it
//      would stop meaning anything. See STRIPPED below for what each one is
//      and why it is allowed to survive.
//
// The scan runs over `git ls-files`, so it sees exactly what is committed: no
// node_modules, no dist/, no untracked scratch files, and no dependence on a
// glob library.

import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';

const MIGRATION_RECORD = 'docs/IDENTITY_LAUNCH_MATRIX_2026-09-04.md';
const SELF = 'scripts/check-identity.mjs';

/**
 * Hostnames removed from every line before the identity rules run. Each is a
 * real machine that still answers, named honestly — none of them is a claim
 * about what this project is called.
 */
const STRIPPED = [
  {
    // LEGACY REDIRECT — KEEP. The retired production host, still published
    // with the identical build so no link in the wild 404s, and forwarding
    // visitors to the canonical domain. Retiring it is a separate decision
    // with its own cost; naming it is not a naming defect.
    re: /odd-field-guide\.surge\.sh/g,
  },
  {
    // EXTERNAL SERVICE — KEEP. The Growth OS Worker's own deployed hostname.
    // It lives in ../odd-growth-os and serves the live /api/* boundary;
    // renaming it from this repo would break ticketing and both forms.
    re: /odd-field-guide\.ronny-507\.workers\.dev/g,
  },
  {
    // Retired preview host. Stripped only so the bare-slug rule does not
    // double-report it — its own rule below still restricts where it may
    // appear, because unlike the two above it has no reason to be referenced
    // outside the docs that retire it.
    re: /odd-field-guide-astro\.surge\.sh/g,
    keepRule: 'preview-host',
  },
];

const RULES = [
  {
    id: 'github-slug',
    // Checked before the hostname strip: this form is a repository, not a host.
    pattern: 'ronny-sketch/odd-field-guide',
    preStrip: true,
    reason: 'the retired GitHub slug — the repository is ronny-sketch/allthingsodd',
    allow: { [MIGRATION_RECORD]: 'the migration record', [SELF]: 'this file' },
  },
  {
    id: 'preview-host',
    pattern: 'odd-field-guide-astro.surge.sh',
    preStrip: true,
    reason: 'the retired preview host — publish previews to allthingsodd-preview.surge.sh',
    allow: {
      'docs/deployment.md': 'names the retired preview host it replaces',
      [MIGRATION_RECORD]: 'the migration record',
      [SELF]: 'this file',
    },
  },
  {
    id: 'display-name',
    pattern: 'ODD Field Guide',
    reason: 'the retired human-facing project name — the project is "All Things ODD"',
    allow: {
      'AGENTS.md': 'the constitution names it once, to retire it',
      'README.md': 'the readme names it once, to retire it',
      [MIGRATION_RECORD]: 'the migration record',
      [SELF]: 'this file',
    },
  },
  {
    id: 'package-name',
    pattern: 'odd-field-guide-astro',
    reason: 'the retired npm package name — the package is "allthingsodd"',
    allow: { [MIGRATION_RECORD]: 'the migration record', [SELF]: 'this file' },
  },
  {
    id: 'slug',
    // Whatever survives the hostname strip and the rules above is the retired
    // slug being used as this project's identity.
    pattern: 'odd-field-guide',
    reason: 'the retired machine slug — the project slug is "allthingsodd"',
    allow: {
      'AGENTS.md': 'the constitution names it once, to retire it',
      [MIGRATION_RECORD]: 'the migration record',
      'docs/FINAL_IMPLEMENTATION_MATRIX_2026-09-03.md': 'historical record of the 2026-09-03 pass',
      [SELF]: 'this file',
    },
  },
];

/**
 * The opposite mistake to a stale name: a new one that does not work.
 * `@oddfest.co` is deliberately NOT banned — those mailboxes receive mail and
 * allthingsodd.co has no MX record at all, so cutting the addresses over
 * would break every contact route on the site. See the migration record's
 * B13. What is banned is publishing the pretty, dead address.
 */
const DEAD_ADDRESS = {
  id: 'dead-address',
  re: /[\w.-]+@allthingsodd\.co/,
  reason:
    'allthingsodd.co has no MX record, so this address cannot receive mail — publishing it would break a real contact route',
  allow: {
    [MIGRATION_RECORD]: 'documents the address that is not live yet',
    'tests/functional/identity-integrity.spec.ts': 'asserts it is never published',
    [SELF]: 'this file',
  },
};

const BINARY = /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm|pdf)$/i;

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((f) => !BINARY.test(f))
  // Symlinks (CLAUDE.md -> AGENTS.md) would be scanned twice and reported
  // against a path whose content nobody edits directly.
  .filter((f) => {
    try {
      return !lstatSync(f).isSymbolicLink();
    } catch {
      return false;
    }
  });

const failures = [];

for (const file of tracked) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted-but-still-indexed path; nothing to scan
  }

  text.split('\n').forEach((raw, index) => {
    const report = (rule) => failures.push({ file, line: index + 1, text: raw.trim(), rule });

    let line = raw;

    for (const rule of RULES.filter((r) => r.preStrip)) {
      if (line.includes(rule.pattern)) {
        if (!(file in rule.allow)) report(rule);
        line = line.split(rule.pattern).join('');
      }
    }

    for (const { re, keepRule } of STRIPPED) {
      if (keepRule) continue; // already consumed by its own pre-strip rule
      line = line.replace(re, '');
    }

    // First remaining match wins, so the most specific rule owns the message.
    const rule = RULES.find((r) => !r.preStrip && line.includes(r.pattern));
    if (rule && !(file in rule.allow)) report(rule);

    if (DEAD_ADDRESS.re.test(raw) && !(file in DEAD_ADDRESS.allow)) report(DEAD_ADDRESS);
  });
}

if (failures.length === 0) {
  console.log(`identity: ${tracked.length} tracked files clean`);
  process.exit(0);
}

console.error(`\nidentity: ${failures.length} retired-identity reference(s) found\n`);
for (const f of failures) {
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    ${f.text.slice(0, 140)}`);
  console.error(`    [${f.rule.id}] ${f.rule.reason}`);
  console.error('');
}
console.error(
  'Fix the reference, or — if it genuinely describes a legacy host, an external\n' +
    'service this repo does not own, or a historical record — add that one file to\n' +
    "the matching rule's `allow` map in scripts/check-identity.mjs with a reason.\n" +
    'Do not add a directory.\n',
);
process.exit(1);
