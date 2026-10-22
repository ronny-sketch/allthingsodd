// The only paths that reach a script: wrangler.jsonc's assets.run_worker_first
// names them, and every other path is served straight from the asset store.
import videoRange from './video-range.js';
import { handleAvailability } from './availability.js';

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/oddspace/availability.json') return handleAvailability();
    return videoRange.fetch(request, env);
  },
};
