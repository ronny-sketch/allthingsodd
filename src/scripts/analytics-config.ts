// Single source of truth for the GA4 property this site reports to.
//
// Stream "All things ODD" (stream ID 15816308905) on property 555204778,
// created 2026-09-21 for the allthingsodd.co launch with the stream URL
// correct from the start.
//
// This replaces stream "ODDpage" (G-9Q90CQMBK8, stream 15519249031) on
// the pre-launch property 551982005, which this site reported to from
// 2026-08-28 until the launch. That property still holds ~2,000 sessions
// and is not deleted: GA4 properties cannot be merged and a measurement-ID
// change starts a property's history at zero, so the old one is the only
// place that traffic exists. Growth OS reads **both** property IDs
// (GA4_PROPERTY_ID is a comma-separated list in that repo's .dev.vars) so
// allthingsodd.co's numbers stay continuous across the cutover rather than
// dropping to zero on launch day.
//
// Not to be confused with property 527983299 (G-40BNRGTY1T), which is
// oddfest.co — a genuinely separate live site with its own Google Tag
// Manager container and Cookiebot. It is deliberately out of scope here
// and out of Growth OS.
//
// The measurement ID is host-independent, so a future domain change needs
// no edit here.
//
// Corrected 2026-09-21: this comment used to say Search Console had no
// property for allthingsodd.co and listed adding one as outstanding. It has
// one — https://allthingsodd.co/ was added and auto-verified as site owner,
// and the sitemap was submitted, on 2026-09-21 (docs/analytics.md's
// "Configured, for the record", and ../odd-growth-os/ops/CURRENT_STATE.md's
// D27). Search Console lags about two days and does not backfill, so zero
// rows for the first days is expected and is not a misconfiguration.
//
// Search Console is not analytics tracking and shares nothing with this
// file but a vendor; keep the two responsibilities apart when reading
// docs/analytics.md.
export const GA_MEASUREMENT_ID: string | null = 'G-FCGTBXT9KS';
