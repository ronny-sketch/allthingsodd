// Timed newsletter popup — shows once, ~15s after page load, at most once
// per browser tab session (sessionStorage, not a cookie: closing the tab or
// starting a new session clears it, matching "don't hit the same visitor
// again navigating around the site during the same session" without
// tracking them beyond that). See NewsletterPopup.astro and the 2026-08-30
// homepage revision brief, section 13.
const SEEN_KEY = 'oddNewsletterPopupSeen';
const DELAY_MS = 15000;

// Pages where a timed interruption actively works against the page's own
// job (2026-08-31 final implementation pass): a journalist on Media
// shouldn't be interrupted mid-lookup, Contact/Work with ODD's enquiry form
// is itself the higher-intent conversion already in progress, and ODDspace's
// own "Enter the space" flow is a similarly high-intent moment not to
// interrupt. Path-based, not a per-page opt-out prop, since the popup mounts
// once, globally, from Layout.astro.
const SUPPRESSED_PATHS = ['/contact', '/media', '/work-with-odd', '/oddspace'];
const isSuppressed = SUPPRESSED_PATHS.some((path) => {
  const normalized = window.location.pathname.replace(/\/+$/, '') || '/';
  return normalized === path;
});

const backdrop = document.getElementById('newsletterPopupBackdrop');
const popup = document.getElementById('newsletterPopup');
const closeBtn = document.getElementById('newsletterPopupClose');

if (!isSuppressed && backdrop && popup && closeBtn) {
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private-browsing/storage-blocked contexts throw on access — treat as
    // "not seen" rather than crash; worst case the popup can reappear on a
    // later navigation in that same edge-case session, which is a much
    // smaller problem than breaking the page.
  }

  if (!alreadySeen) {
    let previouslyFocused: HTMLElement | null = null;

    function markSeen() {
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        // Same private-browsing fallback as above — non-fatal either way.
      }
    }

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

    setTimeout(open, DELAY_MS);
  }
}

export {};
