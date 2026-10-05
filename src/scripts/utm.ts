// Where a form submission came from: the campaign tags (utm_*) in the
// address, the page and the referrer, sent with every form and with ticket
// checkout. Renamed from captureSubmitSource on 2026-10-05: it never captured
// the first touch. Nothing is read or stored on arrival (consent-config.ts
// declares it as written only at submit), so `landing_page` is the page the
// visitor submitted from, and a campaign link followed by internal
// navigation reaches the form without its UTMs. What it does keep is the
// source of the first submission in this tab, so a second form sent from
// the same tab reports the same one. True first-touch capture would mean
// storing on arrival, which needs its own consent decision first. The
// payload field names stay as the Worker expects them.
const STORAGE_KEY = 'odd_submit_source_v1';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export interface SubmitSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
}

export function captureSubmitSource(): SubmitSource {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing) as SubmitSource;
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — fall through
    // and just use the current page's values with no persistence.
  }

  const params = new URLSearchParams(window.location.search);
  const touch: SubmitSource = {
    landing_page: window.location.pathname,
    referrer: document.referrer || undefined,
  };
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) touch[key] = value;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
  } catch {
    // Non-fatal — the submission still gets this page's own UTM values.
  }
  return touch;
}
