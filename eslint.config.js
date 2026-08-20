// @ts-check
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: ['dist/', '.astro/', 'playwright-report/', 'test-results/'],
  },
  {
    rules: {
      // The design-system rule this repo actually cares about: no raw hex
      // colors outside src/styles/tokens.css. ESLint can't see into .astro
      // <style> blocks reliably, so this is enforced by code review + the
      // CLAUDE.md rule, not a lint rule — see docs/design-system.md.
    },
  },
];
