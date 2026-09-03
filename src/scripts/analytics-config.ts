// Single source of truth for the GA4 property this site reports to.
// Stream "ODDpage" (stream ID 15519249031).
//
// The measurement ID is host-independent — GA4 keeps collecting through a
// domain change without any code edit here, which is why the 2026-09-03
// cutover from odd-field-guide.surge.sh to allthingsodd.co touches only
// this comment. Two things do still need doing by hand in the Google
// consoles, and neither is code (see docs/deployment.md#domain-migration):
//   1. GA4 → Admin → Data streams → "ODDpage": set the stream URL to
//      https://allthingsodd.co. Cosmetic for collection, but it is what
//      the Realtime/DebugView "open site" links and cross-domain settings
//      use, and leaving it on a retired host is how it silently rots.
//   2. Search Console: add https://allthingsodd.co as a new property and
//      submit https://allthingsodd.co/sitemap-index.xml. The existing
//      google181860bcd4b9963d.html verification file in public/ ships with
//      every build, so the new host verifies with the same token. Keep the
//      old surge.sh property until Google has migrated the index across.
export const GA_MEASUREMENT_ID: string | null = 'G-9Q90CQMBK8';
