// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Update this at cutover if the production domain changes from the current
  // surge.sh deployment — see docs/deployment.md.
  site: 'https://odd-field-guide.surge.sh',

  integrations: [sitemap()],
});
