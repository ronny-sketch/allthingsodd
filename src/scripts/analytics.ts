// Minimal GA4 loader + event helper. Deliberately NOT the standard "always
// load gtag.js with Consent Mode default-denied" pattern — for a small
// brand site the simpler, unambiguously-compliant option is to not request
// gtag.js at all until the visitor has actually accepted (see
// analytics-consent.ts for the banner that gates this). GDPR/ePrivacy
// applies here: ODD is a Finnish association, GA4's cookies aren't
// "strictly necessary," so consent has to come before the request, not
// just before reading the cookie.
import { GA_MEASUREMENT_ID } from './analytics-config';

const CONSENT_KEY = 'odd_analytics_consent_v1';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

export function getConsent(): 'granted' | 'denied' | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* private browsing / storage blocked — consent still applies for this page view */
  }
  if (value === 'granted') loadGtag();
}

export function loadGtag(): void {
  if (loaded || !GA_MEASUREMENT_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

// Called by the two Growth OS forms on a real successful submission. A
// no-op whenever consent hasn't been granted or GA4 isn't configured yet —
// callers don't need to check either condition themselves.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}

export { GA_MEASUREMENT_ID };
