// Shared first-touch UTM/source capture for both forms (work-enquiry-form.ts,
// newsletter-form.ts). "First touch" matters more than "last touch" for a
// relationship-driven B2B enquiry that might be filled in days after the
// visitor arrived from a campaign link — see
// ../odd-growth-os/ops/GROWTH_OS_GUIDE.md §32.4 (primary_source vs latest_conversion_source).
const STORAGE_KEY = 'odd_first_touch_v1';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export interface FirstTouch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
}

export function captureFirstTouch(): FirstTouch {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing) as FirstTouch;
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — fall through
    // and just use the current page's values with no persistence.
  }

  const params = new URLSearchParams(window.location.search);
  const touch: FirstTouch = {
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
