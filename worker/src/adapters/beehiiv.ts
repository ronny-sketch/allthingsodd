// beehiiv v2 REST API adapter — replaces the footer's old
// `<form action="https://oddfest.beehiiv.com" method="get" target="_blank">`
// redirect with a real inline subscribe that preserves source/UTM data,
// per ops/GROWTH_OS_GUIDE.md §19 Option B ("use when it materially improves
// UTM/source capture"). ODD's beehiiv publication itself is NOT touched —
// no fields renamed, no automations changed, this only adds a subscriber.
//
// ⚠ UNVERIFIED AGAINST THE REAL PUBLICATION. No beehiiv API key is
// configured yet (ops/SETUP_STATUS.md). Endpoint shape follows beehiiv's
// documented v2 subscriptions API as of this writing. Before the first real
// submission:
//   1. confirm the publication ID for oddfest.beehiiv.com in beehiiv's
//      dashboard (Settings → Publication) and set BEEHIIV_PUBLICATION_ID;
//   2. confirm write access is included on the current plan (guide §18.1 —
//      MCP/API write capability may depend on plan);
//   3. run the controlled test in guide §42 with an ODD-owned test address
//      and update this comment with the verification date.

import type { NewsletterAdapter } from '../types';

const BASE = 'https://api.beehiiv.com/v2';

export function createBeehiivAdapter(apiKey: string, publicationId: string): NewsletterAdapter {
  return {
    async subscribe({ email, source, utm }) {
      const res = await fetch(`${BASE}/publications/${publicationId}/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: utm.utm_source ?? source ?? 'website_form',
          utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`beehiiv subscribe failed: ${res.status} ${text.slice(0, 300)}`);
      }

      return { status: 'subscribed' };
    },
  };
}
