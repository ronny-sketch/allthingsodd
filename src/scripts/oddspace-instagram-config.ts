// ODDspace Instagram feed — provider config.
//
// The feed is served by Behold (https://behold.so), which mirrors an
// Instagram Business/Creator account into a plain JSON document on its own
// CDN. Chosen over an Instagram embed or Elfsight for three reasons that
// matter to this site specifically:
//
//   1. It is data, not a widget. GET https://feeds.behold.so/<feedId>
//      returns JSON, so the gallery is our own markup in our own design
//      system — no provider chrome, no iframe, no imported stylesheet.
//   2. No visitor storage. Behold's widget/API set no cookies and no
//      localStorage, so this is not a consent-gated tracker the way the
//      Google Calendar embed on this same page is (see consent-config.ts).
//      Elfsight, the obvious alternative, sets an `elfsight_viewed_recently`
//      cookie and would have had to be gated, declared and network-tested.
//      Verified by tests/functional/instagram-gallery.spec.ts, which fails
//      if the gallery ever starts writing storage.
//   3. Media comes back pre-sized (400/700/1000/2000px webp, with real
//      dimensions), which is what lets the grid reserve space and ship a
//      responsive srcset instead of hotlinking full-resolution originals
//      from Instagram's CDN behind expiring URLs.
//
// A feed ID is public by design — it ships in the page HTML either way (in
// Behold's own widget it is a `feed-id` attribute) — so this is not a secret
// and does not belong in a Worker. It is read from the environment so the
// account can be connected without a code change:
//
//   PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID=<id from behold.so dashboard>
//
// Ships null (same "inert until configured" contract as
// analytics-config.ts's GA_MEASUREMENT_ID and tickets/config.ts's
// STRIPE_PUBLISHABLE_KEY): with no ID, the gallery section is not rendered
// at all, so production never shows an empty shell or a broken feed. See
// docs/architecture.md#oddspace-instagram for the one-time human setup step
// that is still outstanding.
const rawFeedId = import.meta.env.PUBLIC_ODDSPACE_INSTAGRAM_FEED_ID;

export const ODDSPACE_INSTAGRAM_FEED_ID: string | null =
  typeof rawFeedId === 'string' && rawFeedId.trim() !== '' ? rawFeedId.trim() : null;

export const ODDSPACE_INSTAGRAM_HANDLE = 'oddspace.co';
export const ODDSPACE_INSTAGRAM_URL = 'https://www.instagram.com/oddspace.co/';

/** How many posts the grid is laid out for. Six is also the free plan's
 *  per-feed maximum; the 3-column wall below is composed around exactly this
 *  number (one 2x2 lead tile + five singles = a full 3x3), so raising it
 *  means revisiting the grid, not just this constant. */
export const ODDSPACE_INSTAGRAM_POST_COUNT = 6;

export const BEHOLD_FEED_ENDPOINT = 'https://feeds.behold.so';
