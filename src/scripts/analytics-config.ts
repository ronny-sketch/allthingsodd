// Single source of truth for the GA4 property this site reports to.
// Ronny: replace with the real Measurement ID from
// analytics.google.com → Admin → Data Streams → (this site) → Measurement ID
// (format "G-XXXXXXXXXX"). Leaving this as null keeps analytics fully off —
// the consent banner still won't appear, and no gtag.js request is ever
// made — so this is safe to ship before the real ID exists.
export const GA_MEASUREMENT_ID: string | null = null;
