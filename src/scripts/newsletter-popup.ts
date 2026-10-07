// Timed newsletter popup — shows once, ~15s after page load, once per
// browser, ever (localStorage, 2026-10-07). It used to be once per tab
// session (sessionStorage), which meant every new tab or visit showed it
// again to people who had already closed it. Signing up through any
// newsletter form sets the same key (newsletter-form.ts), and so does
// arriving from a newsletter link, so subscribers never see it either.
// Per browser, not per IP: a shared IP (ODDspace's co-work wifi, an office,
// a phone network) would hide it from everyone behind one person's click,
// and this is a static site with no server to ask. See NewsletterPopup.astro and the 2026-08-30 homepage revision brief,
// section 13.
const SEEN_KEY = 'oddNewsletterPopupSeen';
const DELAY_MS = 15000;

// Pages where a timed interruption actively works against the page's own
// job (2026-08-31 final implementation pass): a journalist on Media
// shouldn't be interrupted mid-lookup, Contact/Work with ODD's enquiry form
// is itself the higher-intent conversion already in progress, and ODDspace's
// own "Enter the space" flow is a similarly high-intent moment not to
// interrupt. Path-based, not a per-page opt-out prop, since the popup mounts
// once, globally, from Layout.astro.
const SUPPRESSED_PATHS = [
  '/contact',
  '/media',
  '/work-with-odd',
  '/oddspace',
  '/brand-book',
  // The two ODDspace documents: an organiser reading the house rules or the
  // code of conduct is doing something the site asked them to do. The match
  // is exact, so '/oddspace' above does not cover these.
  '/oddspace/event-info-pack',
  '/oddspace/code-of-conduct',
];
// Ticket buying (2026-10-05): /tickets and everything under it — the
// storefront, the embedded Stripe checkout and the confirmation page are one
// purchase in progress, and nothing may sit on top of a payment form.
const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
const isSuppressed =
  SUPPRESSED_PATHS.includes(normalizedPath) ||
  normalizedPath === '/tickets' ||
  normalizedPath.startsWith('/tickets/');

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage blocked (private browsing) — non-fatal, see seen() below.
  }
}

// Someone who clicked through from the newsletter already gets it
// (2026-10-07). beehiiv tags its links utm_medium=newsletter; ODD's own
// outreach mail does not use that medium. Checked before the path guard, so
// a newsletter link straight to /oddspace still counts.
// ponytail: assumes beehiiv's UTM setting is on for ODD's publication; if a
// real issue's links carry no utm_medium, this does nothing (no harm).
if (new URLSearchParams(window.location.search).get('utm_medium') === 'newsletter') markSeen();

const backdrop = document.getElementById('newsletterPopupBackdrop');
const popup = document.getElementById('newsletterPopup');
const closeBtn = document.getElementById('newsletterPopupClose');

if (!isSuppressed && backdrop && popup && closeBtn) {
  const seen = () => {
    try {
      return localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // Private-browsing/storage-blocked contexts throw on access — treat as
      // "not seen" rather than crash; worst case the popup can reappear on a
      // later navigation in that same edge-case session, which is a much
      // smaller problem than breaking the page.
      return false;
    }
  };

  if (!seen()) {
    let previouslyFocused: HTMLElement | null = null;

    function getFocusable(): HTMLElement[] {
      if (!popup) return [];
      return Array.from(
        popup.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function open() {
      if (!backdrop || !popup) return;
      previouslyFocused = document.activeElement as HTMLElement | null;
      backdrop.hidden = false;
      popup.hidden = false;
      // Two rAFs, not one — hidden -> visible needs a committed frame with
      // the starting (closed) transform/opacity painted before the .is-open
      // class change can actually transition, same reasoning as
      // NewsletterForm's decode-before-reveal pattern elsewhere on this
      // site: toggling both in the same frame the element leaves `hidden`
      // skips the transition outright in some browsers.
      //
      // Focus moves in only once `.is-open` actually lands, not before —
      // the popup's base (closed) CSS state is `visibility: hidden`, and a
      // `visibility: hidden` element cannot receive focus at all (a
      // real bug caught by an actual devtools check, not assumed: calling
      // closeBtn.focus() synchronously here left focus on <body>, silently
      // failing, every time).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          backdrop.classList.add('is-open');
          popup.classList.add('is-open');
          closeBtn?.focus();
        });
      });
      document.addEventListener('keydown', onKeydown);
      markSeen();
    }

    function close() {
      if (!backdrop || !popup) return;
      backdrop.classList.remove('is-open');
      popup.classList.remove('is-open');
      document.removeEventListener('keydown', onKeydown);
      const finish = () => {
        backdrop.hidden = true;
        popup.hidden = true;
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
      else setTimeout(finish, 300); // matches --duration-base
      // Return focus to wherever it was before the popup opened — never
      // left stranded on a now-hidden close button.
      (previouslyFocused ?? document.body).focus?.();
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        return;
      }
      // Minimal focus trap — Tab/Shift+Tab wrap within the popup's own
      // focusable elements instead of escaping into the page behind it,
      // consistent with aria-modal="true" actually behaving modally for
      // keyboard users.
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);

    // A page can hold the popup off while something more important is on
    // screen (2026-09-24): any visible element with
    // `data-suppress-newsletter-popup`. The ODDspace booking and event idea
    // dialogs, the film dialog, the consent banner and the mobile menu carry
    // it, so nobody is interrupted mid-enquiry, mid-film, mid-choice or
    // mid-navigation, and no two overlays fight over focus. A <dialog> counts
    // while it is open; anything else while it has a box on screen
    // (getClientRects, not offsetParent, which is null for anything
    // position: fixed) and is not `visibility: hidden`, which is how the
    // banner and the menu put themselves away (2026-10-05). Someone typing in
    // a form field counts too: on a phone that is the on-screen keyboard
    // being up, and the field is the higher-intent thing. The check runs
    // when the timer fires, so something opened after page load still
    // counts. Nothing is marked as seen, so the popup can still appear on a
    // later page. `seen()` is asked again too: a signup in the footer, or the
    // popup shown in another tab, during these 15 seconds.
    const shown = (el: HTMLElement) =>
      el instanceof HTMLDialogElement
        ? el.open
        : !el.hidden &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== 'hidden';
    const typing = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement &&
          !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(el.type)) ||
        (el instanceof HTMLElement && el.isContentEditable)
      );
    };
    const suppressedNow = () =>
      typing() ||
      Array.from(document.querySelectorAll<HTMLElement>('[data-suppress-newsletter-popup]')).some(
        shown,
      );
    setTimeout(() => {
      if (!seen() && !suppressedNow()) open();
    }, DELAY_MS);
  }
}

export {};
