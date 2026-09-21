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
import { hasConsent, onConsentChange } from './consent';

declare global {
  interface Window {
    /** Holds `arguments` objects, not arrays — see loadGtag() below. */
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

// Query parameters that must never reach Google.
//
// GA4's automatic page_view sends the full URL as `page_location`, query
// string included, and the next navigation sends it again as `page_referrer`.
// Stripe returns a buyer to
// /tickets/confirmation/?session_id=…&order_token=… (built by the Worker —
// see ../odd-growth-os/worker/src/tickets/checkout.ts), and `order_token` is
// not an identifier, it is a bearer capability: it authorises reading an
// order's status and buyer details and reassigning its attendees. Anyone with
// read access to the GA4 property could lift live order tokens straight out
// of the Pages report.
//
// tickets/ecommerce.ts already takes care never to put the token in an event
// (it hashes it for transaction_id), which is exactly the care that made the
// page_view leak easy to miss: the events were clean and the page view was
// not. Stripped here, in the one place every page's URL passes through,
// rather than per page — the next secret query parameter is then covered
// before anyone adds it.
const SECRET_QUERY_PARAMS = ['order_token', 'session_id'];

function withoutSecrets(raw: string): string {
  if (!raw) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    let stripped = false;
    for (const param of SECRET_QUERY_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        stripped = true;
      }
    }
    return stripped ? url.toString() : raw;
  } catch {
    // An unparseable URL is not worth risking: send the path only.
    return window.location.pathname;
  }
}

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
  // page_location/page_referrer passed explicitly so the automatic page_view
  // reports the sanitised URL rather than whatever is in the address bar.
  // page_referrer is omitted entirely when there is none — an empty string
  // is not the same thing as "arrived directly" to GA4.
  const referrer = withoutSecrets(document.referrer);
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    page_location: withoutSecrets(window.location.href),
    ...(referrer ? { page_referrer: referrer } : {}),
  });
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
  initCtaTracking();
}

// One delegated listener, not five hand-wired events.
//
// The launch brief asked for partner_cta_click, oddspace_membership_click,
// oddspace_venue_enquiry_click and email_click as separate names. They are the
// same question — "which call to action did someone act on" — and four names
// means four places to forget. `cta_click` with a `cta_id` answers it in one
// event, and keeps answering it for the next CTA without a code change.
//
// external_social_click is deliberately NOT here: GA4's enhanced measurement
// already reports outbound http(s) clicks with link_domain/link_url. Adding
// our own would double-count them. mailto: is not covered by that, which is
// why it is.
//
// `cta_location` is the pathname only. Never the full URL — see
// SECRET_QUERY_PARAMS above for what can be in a query string on this site.
function initCtaTracking(): void {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute('href') ?? '';

      if (href.startsWith('mailto:')) {
        trackEvent('cta_click', { cta_id: 'email', cta_location: window.location.pathname });
        return;
      }

      // The commercial deep links: /work-with-odd/?interest=<product>, which
      // is how every partner, ODDnetwork, ODDagency and ODDspace call to
      // action on this site reaches the enquiry form. The product value is an
      // enum from ../odd-growth-os/schemas/products.yml, and `intent`
      // distinguishes ODDspace's two CTAs from each other.
      const interest = /[?&]interest=([a-z_]+)/.exec(href)?.[1];
      if (interest) {
        const intent = /[?&]intent=([a-z_]+)/.exec(href)?.[1];
        trackEvent('cta_click', {
          cta_id: interest,
          ...(intent ? { cta_intent: intent } : {}),
          cta_location: window.location.pathname,
        });
      }
    },
    // Capture, so a CTA that stops propagation is still counted.
    { capture: true },
  );
}

// GA4 reads these three event parameters as traffic-source attribution, so
// sending one on an ordinary event silently rewrites the session's source
// and every later event in that session inherits it. The newsletter form
// passed `source: 'footer_newsletter'` and that is exactly what happened:
// on 2026-09-20, 22 of 24 ticket-funnel events in the property were
// attributed to a source called "footer_newsletter" rather than to where
// those visitors actually came from. Dropping them here rather than in the
// one caller keeps the next caller from rediscovering it the same way.
const GA4_ATTRIBUTION_PARAMS = ['source', 'medium', 'campaign'];

// Called by the Growth OS forms and the ticketing funnel on a real
// successful submission/step. A no-op whenever statistics consent hasn't
// been granted or GA4 isn't configured yet — callers don't need to check
// either condition themselves.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window.gtag !== 'function') return;
  // Re-checked on every event, not just at load. gtag.js cannot be unloaded
  // once fetched, so without this a visitor who accepts, then withdraws via
  // the footer, keeps sending events for the rest of the page view — the
  // stored value is already gone, so honouring it here costs one lookup and
  // makes withdrawal effective immediately rather than on the next load.
  if (!hasConsent('statistics')) return;
  let safe = params;
  if (params) {
    const clashes = GA4_ATTRIBUTION_PARAMS.filter((k) => k in params);
    if (clashes.length) {
      safe = { ...params };
      for (const k of clashes) delete safe[k];
      console.warn(
        `trackEvent("${name}"): dropped ${clashes.join(', ')} — GA4 treats ` +
          'these as traffic-source attribution. Use a distinct name, e.g. signup_source.',
      );
    }
  }
  window.gtag('event', name, safe);
}

export { GA_MEASUREMENT_ID };
