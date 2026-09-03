// The cookie declaration — the single source of truth for what this site
// stores on a visitor's device, in which consent category, and why.
//
// This file is deliberately pure data with no browser API in it, because it
// is imported from two places that cannot share a runtime: `consent.ts` (in
// the browser, to decide what a stored choice actually unlocks) and
// `src/pages/privacy.astro` (at build time, to render the declaration table).
// Cookiebot generates that table by crawling the site; we don't have a
// crawler, so the equivalent guarantee here is that the banner and the
// privacy page are rendered from this same array. A tracker added to the
// site without an entry here is a bug, and the reason the table can't
// silently drift out of date is that removing an entry also removes the
// toggle that gates it.
//
// Category names follow Cookiebot's four (necessary / preferences /
// statistics / marketing) on purpose — it is the vocabulary Finnish and EU
// guidance is written in, the one oddfest.co already uses via Cookiebot, and
// the one a visitor who has seen any other EU cookie banner will recognise.

export type ConsentCategory = 'necessary' | 'preferences' | 'statistics' | 'marketing';

/** Where a value is kept. Only `cookie` is a cookie in the legal sense, but
 *  ePrivacy Article 5(3) covers "storing information, or gaining access to
 *  information already stored, in the terminal equipment of a subscriber" —
 *  which is storage-agnostic, so localStorage and sessionStorage belong in
 *  the declaration too. Most cookie banners quietly omit them. */
export type StorageKind = 'cookie' | 'localStorage' | 'sessionStorage';

export interface StorageEntry {
  name: string;
  provider: string;
  purpose: string;
  /** Human-readable, not a duration string — "Until the tab is closed" is
   *  more use to a reader than "session". */
  retention: string;
  kind: StorageKind;
  /** Where it is set, when that is not "everywhere". Keeps the declaration
   *  honest about things like Stripe, which only ever loads on checkout. */
  scope?: string;
}

export interface CategoryDeclaration {
  id: ConsentCategory;
  label: string;
  /** Shown next to the toggle in the banner and as the row intro on the
   *  privacy page — one sentence, plain language, no legal register. */
  summary: string;
  /** Necessary cannot be switched off, and the banner renders it as a fixed
   *  "always on" row rather than a disabled checkbox, which reads as
   *  something broken. */
  alwaysOn?: boolean;
  entries: StorageEntry[];
}

/** The GA4 cookie names are `_ga` plus one per measurement ID, where the
 *  suffix is the ID with its `G-` prefix dropped. Derived rather than
 *  hardcoded so rotating the property in analytics-config.ts can't leave a
 *  wrong cookie name published on the privacy page. */
function ga4CookieNames(measurementId: string | null): string {
  if (!measurementId) return '_ga';
  return `_ga, _ga_${measurementId.replace(/^G-/, '')}`;
}

export function buildDeclaration(measurementId: string | null): CategoryDeclaration[] {
  return [
    {
      id: 'necessary',
      label: 'Necessary',
      summary: 'Needed for the site to work. These are never optional and never used to track you.',
      alwaysOn: true,
      entries: [
        {
          name: 'odd_consent_v2',
          provider: 'ODD (this site)',
          purpose:
            'Remembers the choices you make in this banner so you are not asked on every page.',
          retention: 'Until you clear it or change your choices',
          kind: 'localStorage',
        },
        {
          name: 'oddNewsletterPopupSeen',
          provider: 'ODD (this site)',
          purpose:
            'Records that the newsletter invitation has already been shown, so it does not reappear while you browse.',
          retention: 'Until the browser tab is closed',
          kind: 'sessionStorage',
        },
        {
          name: '__stripe_mid, __stripe_sid',
          provider: 'Stripe Payments Europe, Ltd.',
          purpose:
            'Fraud prevention and payment security. Set by Stripe when a payment form is opened; without them a card payment cannot be completed safely.',
          retention: '1 year (__stripe_mid) / 30 minutes (__stripe_sid)',
          kind: 'cookie',
          scope: 'Only on the ticket checkout page',
        },
      ],
    },
    {
      id: 'preferences',
      label: 'Preferences',
      summary:
        'Lets embedded content from other services load — currently only the ODDspace events calendar.',
      entries: [
        {
          name: 'Google Calendar embed',
          provider: 'Google Ireland Limited',
          purpose:
            'Displays the live ODDspace events calendar. Google sets its own cookies when the calendar loads. Without this consent the calendar is replaced by a button you can press to load it just for this visit.',
          retention: 'Set and controlled by Google',
          kind: 'cookie',
          scope: 'Only on the ODDspace page',
        },
      ],
    },
    {
      id: 'statistics',
      label: 'Statistics',
      summary:
        'Anonymous usage measurement, so we can see which parts of the site are actually useful.',
      // Empty when no GA4 property is configured, which collapses the whole
      // category out of the banner via togglableCategories() below — the
      // same "ships inert until configured" contract analytics-config.ts
      // has always had, now expressed once instead of in two places.
      entries: !measurementId
        ? []
        : [
            {
              name: ga4CookieNames(measurementId),
              provider: 'Google Ireland Limited (Google Analytics 4)',
              purpose:
                'Counts visits and page views and distinguishes one visitor from another, so we can see which pages people use. IP addresses are anonymised. Nothing is requested from Google at all until you accept this category.',
              retention: '2 years',
              kind: 'cookie',
            },
          ],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      summary:
        'Advertising and cross-site tracking. We do not currently use any — this category is listed so it cannot be added quietly.',
      entries: [],
    },
  ];
}

/** Categories a visitor is actually asked about: everything that is not
 *  always-on and has at least one real entry. An empty category (marketing,
 *  today) is documented on the privacy page but never rendered as a toggle —
 *  a switch that controls nothing is worse than no switch, and the moment
 *  something is added to it the toggle appears on its own. */
export function togglableCategories(declaration: CategoryDeclaration[]): CategoryDeclaration[] {
  return declaration.filter((category) => !category.alwaysOn && category.entries.length > 0);
}
