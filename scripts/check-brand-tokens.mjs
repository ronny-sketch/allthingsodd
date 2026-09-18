#!/usr/bin/env node
// Fails when brand/tokens/brand-tokens.json disagrees with the website's CSS.
//
// The CSS in src/styles/ is canonical for the web; the JSON mirrors it for
// everything that is not the web (decks, print, Figma, AI agents). A mirror
// that drifts is worse than none, so every JSON entry that names a CSS
// custom property is checked against the value the stylesheet declares on
// :root, plus the type ladder, the spacing scale and both opacity ramps.
// Run by `npm run quality` as `npm run check:brand`.

import { readFileSync } from 'node:fs';
import { buildCss, OUT as CSS_BUNDLE } from '../brand/tokens/build-css.mjs';

const css = ['src/styles/tokens.css', 'src/styles/typography.css']
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = JSON.parse(readFileSync('brand/tokens/brand-tokens.json', 'utf8'));

// Only :root blocks: the theme scope re-points roles, it declares no values.
const declared = new Map();
for (const [, block] of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declared.set(name, value.trim().replace(/\s+/g, ' '));
  }
}

const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, ' ');
const failures = [];
const expect = (name, want, where) => {
  const got = declared.get(name);
  if (got === undefined) failures.push(`${where}: ${name} is not declared on :root`);
  else if (norm(got) !== norm(want))
    failures.push(`${where}: ${name} is "${got}" in CSS, "${want}" in JSON`);
};

// Every { css: "--x", value: "..." } pair anywhere in the file.
(function walk(node, path) {
  if (!node || typeof node !== 'object') return;
  if (
    typeof node.css === 'string' &&
    /^--[\w-]+$/.test(node.css) &&
    typeof node.value === 'string'
  ) {
    // A primitive whose CSS token is an alias of its swatch resolves one step.
    const got = declared.get(node.css);
    const resolved = got?.startsWith('var(') ? declared.get(got.slice(4, -1)) : got;
    if (resolved === undefined) failures.push(`${path}: ${node.css} is not declared on :root`);
    else if (norm(resolved) !== norm(node.value))
      failures.push(`${path}: ${node.css} is "${resolved}" in CSS, "${node.value}" in JSON`);
  }
  for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
})(tokens, 'tokens');

for (const [role, spec] of Object.entries(tokens.typography.roles)) {
  expect(`--font-size-${role}`, spec.size, `typography.roles.${role}.size`);
  expect(`--line-height-${role}`, spec.lineHeight, `typography.roles.${role}.lineHeight`);
  if (spec.tracking !== 'normal')
    expect(`--tracking-${role}`, spec.tracking, `typography.roles.${role}.tracking`);
}
expect('--tracking-eyebrow', tokens.typography.tracking.eyebrow, 'typography.tracking.eyebrow');
expect('--tracking-caps', tokens.typography.tracking.caps, 'typography.tracking.caps');
expect('--measure-prose', tokens.typography.measure.prose, 'typography.measure.prose');

for (const [step, value] of Object.entries(tokens.spacing.scale))
  expect(`--space-${step}`, value, `spacing.scale.${step}`);
for (const [step, value] of Object.entries(tokens.color.opacityRamp.dark))
  expect(`--color-paper-${step}`, value, `opacityRamp.dark.${step}`);
for (const [step, value] of Object.entries(tokens.color.opacityRamp.light))
  expect(`--color-ink-${step}`, value, `opacityRamp.light.${step}`);

// brand/tokens/odd.css is the same CSS assembled for use outside this repo.
// It is generated, so the only way it can be wrong is by being stale.
if (readFileSync(CSS_BUNDLE, 'utf8') !== (await buildCss())) {
  failures.push(`${CSS_BUNDLE} is out of date — run \`node brand/tokens/build-css.mjs\``);
}

if (failures.length) {
  console.error(
    `brand-tokens.json has drifted from src/styles/ (${failures.length}):\n  ${failures.join('\n  ')}`,
  );
  console.error('Update the JSON to match the CSS (the CSS is canonical for the web).');
  process.exit(1);
}
console.log(
  `brand-tokens.json matches src/styles/ (${declared.size} declared tokens checked against).`,
);
