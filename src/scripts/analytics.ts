// Minimal GA4 loader + event helper. Deliberately NOT the standard "always
// load gtag.js with Consent Mode default-denied" pattern that oddfest.co
// uses via Cookiebot — for a small brand site with one analytics tag the
// simpler, unambiguously-compliant option is to not request gtag.js at all
// until the visitor has actually accepted. GDPR/ePrivacy applies here: ODD
// is a Finnish association, GA4's cookies aren't "strictly necessary," so
// consent has to come before the request, not just before reading the
// cookie. Consent Mode's cookieless pings still reach Google; this doesn't.
//
// What is allowed to run lives in consent.ts; what it is called and why is
// declared in consent-config.ts's `statistics` category.
import { GA_MEASUREMENT_ID } from './analytics-config';
import { onConsentChange } from './consent';

declare global {
  interface Window {
    /** Holds `arguments` objects, not arrays — see loadGtag() below. */
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

function loadGtag(): void {
  if (loaded || !GA_MEASUREMENT_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // `arguments`, NOT a rest-parameter array — this is not a style choice and
  // reverting it silently breaks all measurement. gtag.js reads dataLayer
  // and only treats entries that are `arguments` objects as commands; a real
  // Array is taken for GTM-style data and skipped without any error. From
  // 2026-08-28 until 2026-09-03 this file pushed `[...args]`, so gtag.js
  // loaded, the measurement ID was correct, consent worked — and not one hit
  // was ever sent. Confirmed live against allthingsodd.co: zero /g/collect
  // beacons, and one appeared the instant the same commands were pushed as
  // `arguments`. tests/functional/consent.spec.ts guards the shape now.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Called once per page load from ConsentBanner.astro, which mounts on every
 *  page via Layout.astro. Subscribing (rather than reading storage once)
 *  is what makes an in-banner Accept start measurement on the same page view
 *  instead of the next navigation.
 *
 *  There is deliberately no "unload" path: gtag.js cannot be unloaded once
 *  fetched, so withdrawing statistics consent takes effect on the next page
 *  load. openConsentSettings() clearing the stored value is what guarantees
 *  that — the next load starts from no consent, and this never fires. */
export function initAnalytics(): void {
  onConsentChange((state) => {
    if (state.statistics) loadGtag();
  });
}

// Called by the Growth OS forms and the ticketing funnel on a real
// successful submission/step. A no-op whenever statistics consent hasn't
// been granted or GA4 isn't configured yet — callers don't need to check
// either condition themselves.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}

export { GA_MEASUREMENT_ID };
