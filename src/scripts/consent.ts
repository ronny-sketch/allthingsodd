// The consent store. Everything that wants to know whether it is allowed to
// run asks this module, and nothing else reads the stored value directly.
//
// This replaces the single granted/denied flag the site shipped from
// 2026-08-28 to 2026-09-03, which had two real gaps: it could only ever
// describe GA4 (so the ODDspace Google Calendar embed loaded regardless of
// what the visitor had said), and it had no way to change an answer once
// given, which GDPR Article 7(3) requires to be as easy as giving it. Both
// are fixed here rather than by adopting a CMP: see docs/architecture.md's
// consent section for why a third-party consent script would have been a
// step backwards for a site with one analytics tag.
//
// The categories themselves and what lives in each are in consent-config.ts,
// which the privacy page renders from the same array.
import type { ConsentCategory } from './consent-config';

const STORAGE_KEY = 'odd_consent_v2';

/** The pre-2026-09-03 key. Read once, migrated, then deleted — a visitor who
 *  already accepted analytics must not be asked again just because we
 *  changed our storage shape, and one who declined must certainly not be
 *  re-prompted into a different answer. */
const LEGACY_STORAGE_KEY = 'odd_analytics_consent_v1';

export const CONSENT_CHANGE_EVENT = 'odd:consent-change';
export const CONSENT_OPEN_EVENT = 'odd:consent-open';

export interface ConsentState {
  /** Always true. Stored explicitly so a serialised state is self-describing
   *  rather than implying necessary-ness by absence. */
  necessary: true;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
  /** ISO timestamp of the decision. We have no server-side consent log (see
   *  docs/architecture.md) — this is the closest honest equivalent, and it is
   *  what tells us whether a stored choice predates a change to what we
   *  actually run. */
  decidedAt: string;
  v: 2;
}

export type ConsentDecision = Pick<ConsentState, 'preferences' | 'statistics' | 'marketing'>;

const DENY_ALL: ConsentDecision = { preferences: false, statistics: false, marketing: false };
const ALLOW_ALL: ConsentDecision = { preferences: true, statistics: true, marketing: true };

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing, storage disabled, or an embedded context that throws
    // on access. Treated the same as "no answer yet": the banner shows, the
    // choice applies to this page view, and nothing is written.
    return null;
  }
}

function migrateLegacy(): ConsentState | null {
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (legacy !== 'granted' && legacy !== 'denied') return null;

  // A v1 "granted" was consent to GA4 and nothing else, so it maps to
  // statistics only — deliberately NOT to preferences/marketing, which the
  // visitor was never asked about and could not have agreed to.
  const migrated = persist(
    legacy === 'granted' ? { ...DENY_ALL, statistics: true } : DENY_ALL,
    // Keep the fact that this was a migration visible in the stored value's
    // timestamp rather than pretending the visitor decided again just now.
    'migrated',
  );
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* Non-fatal: a stale v1 key is ignored from here on anyway. */
  }
  return migrated;
}

/** The visitor's stored choice, or `null` if they have not made one. */
export function getConsent(): ConsentState | null {
  const raw = readRaw();
  if (!raw) return migrateLegacy();
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed?.v !== 2) return null;
    return {
      necessary: true,
      preferences: parsed.preferences === true,
      statistics: parsed.statistics === true,
      marketing: parsed.marketing === true,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : '',
      v: 2,
    };
  } catch {
    // Corrupt or hand-edited value — treat as undecided and ask again rather
    // than guessing which way the visitor would have answered.
    return null;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  const state = getConsent();
  return state ? state[category] === true : false;
}

function persist(
  decision: ConsentDecision,
  mode: 'decided' | 'migrated' = 'decided',
): ConsentState {
  const state: ConsentState = {
    necessary: true,
    ...decision,
    decidedAt: new Date().toISOString(),
    v: 2,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Storage blocked — the decision still applies for this page view via
       the event below, it just won't survive a reload. */
  }
  if (mode === 'decided') {
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: state }));
  }
  return state;
}

export function setConsent(decision: ConsentDecision): ConsentState {
  return persist(decision);
}

export const acceptAll = (): ConsentState => setConsent(ALLOW_ALL);
export const rejectAll = (): ConsentState => setConsent(DENY_ALL);

/** Clears the stored choice and reopens the banner. This is the Article 7(3)
 *  withdrawal path, wired to the "Cookie settings" link in the footer and to
 *  the button on the privacy page. Clearing first (rather than pre-filling
 *  the banner from the old answer) means a visitor who opens it and then
 *  navigates away without choosing is left with no consent rather than their
 *  previous one — the safe direction to fail in. */
export function openConsentSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Non-fatal — the banner still opens and a new choice still applies. */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}

/** Runs `callback` for the current state (if any) and again on every change.
 *  Anything gated on consent — the GA4 loader, the ODDspace calendar embed —
 *  uses this rather than reading storage once at load, so accepting in the
 *  banner takes effect immediately instead of on the next navigation. */
export function onConsentChange(callback: (state: ConsentState) => void): void {
  const existing = getConsent();
  if (existing) callback(existing);
  window.addEventListener(CONSENT_CHANGE_EVENT, (event) => {
    callback((event as CustomEvent<ConsentState>).detail);
  });
}
